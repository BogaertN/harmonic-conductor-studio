use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use hfield_analysis::summarize_waveform;
use hfield_conductor::nine_gesture_vocabulary;
use hfield_domain::{ConductedPerformance, FieldScore, GestureEvent, GestureTrack};
use hfield_dsp::{compile_pitch_preview, write_wav_i16};
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
fn render_first_gesture_wav() -> serde_json::Value {
    let score = audition_score();
    let compiled = compile_pitch_preview(&score, 48_000);
    let summary = summarize_waveform(&compiled.samples);

    let output_dir = app_root_dir().join("exports").join("audio");
    std::fs::create_dir_all(&output_dir).expect("audio export directory should be creatable");

    let output_path = output_dir.join("hcs_first_gesture_preview.wav");
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

    let stop_flag = Arc::new(AtomicBool::new(false));
    let thread_stop_flag = Arc::clone(&stop_flag);
    let score = audition_score();

    let (tx, rx) = mpsc::channel::<Result<serde_json::Value, String>>();

    let playback_thread = thread::spawn(move || {
        run_playback_thread(score, thread_stop_flag, tx);
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

#[tauri::command]
fn stop_playback(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    stop_existing_playback(&state)?;

    Ok(json!({
        "status": "ok",
        "message": "playback stopped"
    }))
}

fn run_playback_thread(
    score: FieldScore,
    stop_flag: Arc<AtomicBool>,
    tx: mpsc::Sender<Result<serde_json::Value, String>>,
) {
    let setup = setup_playback_stream(score, Arc::clone(&stop_flag));

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

fn setup_playback_stream(
    score: FieldScore,
    stop_flag: Arc<AtomicBool>,
) -> Result<(cpal::Stream, serde_json::Value, Arc<AtomicUsize>, usize), String> {
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

    let compiled = compile_pitch_preview(&score, sample_rate_hz);
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
            get_gesture_vocabulary,
            get_audio_device_report,
            preview_score_report,
            render_first_gesture_wav,
            play_first_gesture_audio,
            stop_playback
        ])
        .run(tauri::generate_context!())
        .expect("error while running Harmonic Conductor Studio");
}
