use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use hfield_analysis::summarize_waveform;
use hfield_conductor::nine_gesture_vocabulary;
use hfield_domain::{ConductedPerformance, FieldScore, GestureEvent, GestureTrack, NoteEvent};
use hfield_dsp::{
    compile_combined_music_and_conductor_preview, compile_music_preview, compile_pitch_preview,
    write_wav_i16, CompiledAudio,
};
use hfield_storage::{score_hash_hex, score_to_pretty_json};
use serde_json::json;
use std::sync::{
    atomic::{AtomicBool, AtomicUsize, Ordering},
    mpsc, Arc, Mutex,
};
use std::thread;
use std::time::Duration;

struct ActivePlayback {
    stop_flag: Arc<AtomicBool>,
    thread: thread::JoinHandle<()>,
}

#[derive(Default)]
struct AppState {
    playback: Mutex<Option<ActivePlayback>>,
}

fn app_root_dir() -> std::path::PathBuf {
    let tauri_manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    tauri_manifest_dir
        .parent()
        .expect("src-tauri must have an app root parent")
        .to_path_buf()
}

fn audition_score() -> FieldScore {
    let mut score = FieldScore::default_hcs();

    score.title = "First Native Playback Audition".to_string();
    score.conductor = ConductedPerformance {
        field_layout: "center_1_lower_5_upper_9".to_string(),
        primary_hand_track: GestureTrack {
            track_id: "primary_hand".to_string(),
            events: vec![
                GestureEvent {
                    gesture_id: "g2".to_string(),
                    start_ms: 0,
                    duration_ms: 360,
                    intensity: 0.42,
                    operator: Some("prepare".to_string()),
                },
                GestureEvent {
                    gesture_id: "g1".to_string(),
                    start_ms: 360,
                    duration_ms: 420,
                    intensity: 0.50,
                    operator: Some("ictus".to_string()),
                },
                GestureEvent {
                    gesture_id: "g3".to_string(),
                    start_ms: 780,
                    duration_ms: 360,
                    intensity: 0.56,
                    operator: Some("emerge".to_string()),
                },
                GestureEvent {
                    gesture_id: "g4".to_string(),
                    start_ms: 1140,
                    duration_ms: 420,
                    intensity: 0.62,
                    operator: Some("descend".to_string()),
                },
                GestureEvent {
                    gesture_id: "g5".to_string(),
                    start_ms: 1560,
                    duration_ms: 520,
                    intensity: 0.70,
                    operator: Some("hold".to_string()),
                },
                GestureEvent {
                    gesture_id: "g6".to_string(),
                    start_ms: 2080,
                    duration_ms: 420,
                    intensity: 0.62,
                    operator: Some("release".to_string()),
                },
                GestureEvent {
                    gesture_id: "g7".to_string(),
                    start_ms: 2500,
                    duration_ms: 360,
                    intensity: 0.56,
                    operator: Some("gather".to_string()),
                },
                GestureEvent {
                    gesture_id: "g9".to_string(),
                    start_ms: 2860,
                    duration_ms: 520,
                    intensity: 0.62,
                    operator: Some("formed_hold".to_string()),
                },
                GestureEvent {
                    gesture_id: "g8".to_string(),
                    start_ms: 3380,
                    duration_ms: 480,
                    intensity: 0.52,
                    operator: Some("emit".to_string()),
                },
            ],
        },
        expressive_hand_track: None,
    };

    score
}

fn seed_music_score() -> FieldScore {
    let mut score = audition_score();

    score.title = "Ode to Joy Entry Theme Seed v1".to_string();
    score.music.tempo_bpm = 84.0;
    score.music.meter = "4/4".to_string();
    score.music.tuning_mode = "twelve_tone_equal_temperament".to_string();

    let quarter_ms = (60_000.0 / score.music.tempo_bpm).round() as u32;

    // Public-domain melody seed encoded directly as MIDI note values.
    // C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67.
    let melody: &[(u8, u32)] = &[
        (64, 1),
        (64, 1),
        (65, 1),
        (67, 1),
        (67, 1),
        (65, 1),
        (64, 1),
        (62, 1),
        (60, 1),
        (60, 1),
        (62, 1),
        (64, 1),
        (64, 1),
        (62, 1),
        (62, 2),
    ];

    let mut start_ms = 0_u32;
    let lead_notes = melody
        .iter()
        .map(|(midi_note, beats)| {
            let duration_ms = quarter_ms * beats;
            let note = NoteEvent {
                midi_note: *midi_note,
                start_ms,
                duration_ms,
                velocity: 0.88,
            };
            start_ms += duration_ms;
            note
        })
        .collect::<Vec<_>>();

    let bar_ms = quarter_ms * 4;
    let depth_notes = vec![
        NoteEvent {
            midi_note: 48,
            start_ms: 0,
            duration_ms: bar_ms,
            velocity: 0.52,
        },
        NoteEvent {
            midi_note: 43,
            start_ms: bar_ms,
            duration_ms: bar_ms,
            velocity: 0.48,
        },
        NoteEvent {
            midi_note: 48,
            start_ms: bar_ms * 2,
            duration_ms: bar_ms,
            velocity: 0.50,
        },
        NoteEvent {
            midi_note: 43,
            start_ms: bar_ms * 3,
            duration_ms: bar_ms,
            velocity: 0.45,
        },
    ];

    let field_notes = vec![
        NoteEvent {
            midi_note: 60,
            start_ms: 0,
            duration_ms: bar_ms * 4,
            velocity: 0.28,
        },
        NoteEvent {
            midi_note: 67,
            start_ms: 0,
            duration_ms: bar_ms * 4,
            velocity: 0.18,
        },
    ];

    for track in &mut score.music.tracks {
        match track.track_id.as_str() {
            "lead_voice" => track.notes = lead_notes.clone(),
            "depth_voice" => track.notes = depth_notes.clone(),
            "field_voice" => track.notes = field_notes.clone(),
            _ => {}
        }
    }

    score
}

fn stop_existing_playback(state: &AppState) -> Result<(), String> {
    let maybe_active = {
        let mut guard = state
            .playback
            .lock()
            .map_err(|_| "playback state lock poisoned".to_string())?;
        guard.take()
    };

    if let Some(active) = maybe_active {
        active.stop_flag.store(true, Ordering::SeqCst);
        active
            .thread
            .join()
            .map_err(|_| "playback thread panicked while stopping".to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn create_default_score() -> FieldScore {
    FieldScore::default_hcs()
}

#[tauri::command]
fn create_seed_music_score() -> FieldScore {
    seed_music_score()
}

#[tauri::command]
fn get_gesture_vocabulary() -> serde_json::Value {
    serde_json::to_value(nine_gesture_vocabulary()).expect("gesture vocabulary should serialize")
}

#[tauri::command]
fn get_audio_device_report() -> serde_json::Value {
    let host = cpal::default_host();
    let default_output = host.default_output_device();

    match default_output {
        Some(device) => {
            let name = device
                .name()
                .unwrap_or_else(|_| "unknown output device".to_string());

            match device.default_output_config() {
                Ok(config) => json!({
                    "status": "ok",
                    "host": format!("{:?}", host.id()),
                    "default_output_device": name,
                    "sample_format": format!("{:?}", config.sample_format()),
                    "sample_rate_hz": config.sample_rate().0,
                    "channels": config.channels()
                }),
                Err(err) => json!({
                    "status": "error",
                    "host": format!("{:?}", host.id()),
                    "default_output_device": name,
                    "error": format!("default output config failed: {err}")
                }),
            }
        }
        None => json!({
            "status": "error",
            "host": format!("{:?}", host.id()),
            "error": "no default output device found"
        }),
    }
}

#[tauri::command]
fn preview_score_report() -> serde_json::Value {
    let score = FieldScore::default_hcs();
    let compiled = compile_pitch_preview(&score, 48_000);
    let summary = summarize_waveform(&compiled.samples);
    let score_hash = score_hash_hex(&score).expect("default score should hash");
    let score_json = score_to_pretty_json(&score).expect("default score should serialize");

    json!({
        "status": "ok",
        "score_hash": score_hash,
        "score_json_bytes": score_json.len(),
        "sample_rate_hz": compiled.sample_rate_hz,
        "sample_count": compiled.samples.len(),
        "waveform_summary": summary
    })
}

#[tauri::command]
fn preview_seed_music_report() -> serde_json::Value {
    let score = seed_music_score();
    let compiled_music = compile_music_preview(&score, 48_000);
    let compiled_combined = compile_combined_music_and_conductor_preview(&score, 48_000);
    let music_summary = summarize_waveform(&compiled_music.samples);
    let combined_summary = summarize_waveform(&compiled_combined.samples);
    let score_hash = score_hash_hex(&score).expect("seed music score should hash");

    let note_count: usize = score
        .music
        .tracks
        .iter()
        .map(|track| track.notes.len())
        .sum();

    json!({
        "status": "ok",
        "title": score.title,
        "score_hash": score_hash,
        "tempo_bpm": score.music.tempo_bpm,
        "meter": score.music.meter,
        "tuning_mode": score.music.tuning_mode,
        "track_count": score.music.tracks.len(),
        "note_count": note_count,
        "music_sample_rate_hz": compiled_music.sample_rate_hz,
        "music_sample_count": compiled_music.samples.len(),
        "music_duration_seconds": compiled_music.samples.len() as f64 / compiled_music.sample_rate_hz as f64,
        "music_waveform_summary": music_summary,
        "combined_sample_count": compiled_combined.samples.len(),
        "combined_duration_seconds": compiled_combined.samples.len() as f64 / compiled_combined.sample_rate_hz as f64,
        "combined_waveform_summary": combined_summary
    })
}

#[tauri::command]
fn render_first_gesture_wav() -> serde_json::Value {
    let score = audition_score();
    let compiled = compile_pitch_preview(&score, 48_000);
    write_rendered_wav_report("hcs_first_gesture_preview.wav", compiled)
}

#[tauri::command]
fn render_seed_music_wav() -> serde_json::Value {
    let score = seed_music_score();
    let compiled = compile_music_preview(&score, 48_000);
    write_rendered_wav_report("hcs_ode_to_joy_seed_music_v1.wav", compiled)
}

#[tauri::command]
fn render_seed_combined_wav() -> serde_json::Value {
    let score = seed_music_score();
    let compiled = compile_combined_music_and_conductor_preview(&score, 48_000);
    write_rendered_wav_report("hcs_ode_to_joy_seed_combined_v1.wav", compiled)
}

fn write_rendered_wav_report(filename: &str, compiled: CompiledAudio) -> serde_json::Value {
    let summary = summarize_waveform(&compiled.samples);

    let output_dir = app_root_dir().join("exports").join("audio");
    std::fs::create_dir_all(&output_dir).expect("audio export directory should be creatable");

    let output_path = output_dir.join(filename);
    write_wav_i16(&output_path, &compiled).expect("wav export should succeed");

    let wav_bytes = std::fs::read(&output_path).expect("wav file should be readable after export");
    let wav_hash = blake3::hash(&wav_bytes).to_hex().to_string();

    json!({
        "status": "ok",
        "output_path": output_path.to_string_lossy().to_string(),
        "wav_bytes": wav_bytes.len(),
        "wav_hash": wav_hash,
        "sample_rate_hz": compiled.sample_rate_hz,
        "sample_count": compiled.samples.len(),
        "duration_seconds": compiled.samples.len() as f64 / compiled.sample_rate_hz as f64,
        "waveform_summary": summary
    })
}

#[tauri::command]
fn play_first_gesture_audio(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    stop_existing_playback(&state)?;
    start_native_playback(state, |sample_rate_hz| {
        let score = audition_score();
        compile_pitch_preview(&score, sample_rate_hz)
    })
}

#[tauri::command]
fn play_seed_music_audio(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    stop_existing_playback(&state)?;
    start_native_playback(state, |sample_rate_hz| {
        let score = seed_music_score();
        compile_music_preview(&score, sample_rate_hz)
    })
}

#[tauri::command]
fn play_seed_combined_audio(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    stop_existing_playback(&state)?;
    start_native_playback(state, |sample_rate_hz| {
        let score = seed_music_score();
        compile_combined_music_and_conductor_preview(&score, sample_rate_hz)
    })
}

#[tauri::command]
fn stop_playback(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    stop_existing_playback(&state)?;

    Ok(json!({
        "status": "ok",
        "message": "playback stopped"
    }))
}

fn start_native_playback<F>(
    state: tauri::State<'_, AppState>,
    compiler: F,
) -> Result<serde_json::Value, String>
where
    F: FnOnce(u32) -> CompiledAudio + Send + 'static,
{
    let stop_flag = Arc::new(AtomicBool::new(false));
    let thread_stop_flag = Arc::clone(&stop_flag);

    let (tx, rx) = mpsc::channel::<Result<serde_json::Value, String>>();

    let playback_thread = thread::spawn(move || {
        run_playback_thread(compiler, thread_stop_flag, tx);
    });

    let startup_report = match rx.recv_timeout(Duration::from_secs(3)) {
        Ok(Ok(report)) => report,
        Ok(Err(err)) => {
            let _ = playback_thread.join();
            return Err(err);
        }
        Err(err) => {
            stop_flag.store(true, Ordering::SeqCst);
            let _ = playback_thread.join();
            return Err(format!("playback startup timed out or failed: {err}"));
        }
    };

    {
        let mut guard = state
            .playback
            .lock()
            .map_err(|_| "playback state lock poisoned".to_string())?;
        *guard = Some(ActivePlayback {
            stop_flag,
            thread: playback_thread,
        });
    }

    Ok(startup_report)
}

fn run_playback_thread<F>(
    compiler: F,
    stop_flag: Arc<AtomicBool>,
    tx: mpsc::Sender<Result<serde_json::Value, String>>,
) where
    F: FnOnce(u32) -> CompiledAudio,
{
    let setup = setup_playback_stream(compiler, Arc::clone(&stop_flag));

    let (stream, report, playhead, sample_count) = match setup {
        Ok(value) => value,
        Err(err) => {
            let _ = tx.send(Err(err));
            return;
        }
    };

    if let Err(err) = stream.play() {
        let _ = tx.send(Err(format!("failed to start output stream: {err}")));
        return;
    }

    let _ = tx.send(Ok(report));

    while !stop_flag.load(Ordering::SeqCst) && playhead.load(Ordering::SeqCst) < sample_count {
        thread::sleep(Duration::from_millis(20));
    }

    drop(stream);
}

fn setup_playback_stream<F>(
    compiler: F,
    stop_flag: Arc<AtomicBool>,
) -> Result<(cpal::Stream, serde_json::Value, Arc<AtomicUsize>, usize), String>
where
    F: FnOnce(u32) -> CompiledAudio,
{
    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or_else(|| "no default output audio device found".to_string())?;

    let device_name = device
        .name()
        .unwrap_or_else(|_| "unknown output device".to_string());

    let supported_config = device
        .default_output_config()
        .map_err(|err| format!("failed to read default output config: {err}"))?;

    let sample_format = supported_config.sample_format();
    let sample_rate_hz = supported_config.sample_rate().0;
    let stream_config: cpal::StreamConfig = supported_config.into();

    let compiled = compiler(sample_rate_hz);
    let summary = summarize_waveform(&compiled.samples);
    let sample_count = compiled.samples.len();
    let samples = Arc::new(compiled.samples);
    let playhead = Arc::new(AtomicUsize::new(0));

    let stream = match sample_format {
        cpal::SampleFormat::F32 => build_output_stream::<f32>(
            &device,
            &stream_config,
            Arc::clone(&samples),
            Arc::clone(&playhead),
            Arc::clone(&stop_flag),
        ),
        cpal::SampleFormat::I16 => build_output_stream::<i16>(
            &device,
            &stream_config,
            Arc::clone(&samples),
            Arc::clone(&playhead),
            Arc::clone(&stop_flag),
        ),
        cpal::SampleFormat::U16 => build_output_stream::<u16>(
            &device,
            &stream_config,
            Arc::clone(&samples),
            Arc::clone(&playhead),
            Arc::clone(&stop_flag),
        ),
        other => Err(format!(
            "unsupported default output sample format for v1 playback: {other:?}"
        )),
    }?;

    let report = json!({
        "status": "ok",
        "message": "native playback started",
        "device": device_name,
        "sample_format": format!("{sample_format:?}"),
        "sample_rate_hz": sample_rate_hz,
        "channels": stream_config.channels,
        "sample_count": sample_count,
        "duration_seconds": sample_count as f64 / sample_rate_hz as f64,
        "waveform_summary": summary
    });

    Ok((stream, report, playhead, sample_count))
}

fn build_output_stream<T>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    samples: Arc<Vec<f32>>,
    playhead: Arc<AtomicUsize>,
    stop_flag: Arc<AtomicBool>,
) -> Result<cpal::Stream, String>
where
    T: cpal::Sample + cpal::SizedSample + cpal::FromSample<f32>,
{
    let channels = config.channels as usize;

    device
        .build_output_stream(
            config,
            move |output: &mut [T], _| {
                for frame in output.chunks_mut(channels) {
                    let next_sample = if stop_flag.load(Ordering::SeqCst) {
                        0.0
                    } else {
                        let idx = playhead.fetch_add(1, Ordering::SeqCst);
                        samples.get(idx).copied().unwrap_or(0.0)
                    };

                    let value: T = T::from_sample(next_sample);

                    for sample in frame.iter_mut() {
                        *sample = value;
                    }
                }
            },
            move |err| {
                eprintln!("HCS audio stream error: {err}");
            },
            None,
        )
        .map_err(|err| format!("failed to build output stream: {err}"))
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            create_default_score,
            create_seed_music_score,
            get_gesture_vocabulary,
            get_audio_device_report,
            preview_score_report,
            preview_seed_music_report,
            render_first_gesture_wav,
            render_seed_music_wav,
            render_seed_combined_wav,
            play_first_gesture_audio,
            play_seed_music_audio,
            play_seed_combined_audio,
            stop_playback
        ])
        .run(tauri::generate_context!())
        .expect("error while running Harmonic Conductor Studio");
}
