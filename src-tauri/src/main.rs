use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use hfield_analysis::summarize_waveform;
use hfield_carrier::synthesize_hfield_runtime_carrier_packet_model;
use hfield_conductor::{
    create_gesture_timeline_report, is_valid_gesture_id, nine_gesture_vocabulary,
};
use hfield_cymatics::synthesize_hfield_cymatic_reader_surface;
use hfield_domain::{ConductedPerformance, FieldScore, GestureEvent, GestureTrack, NoteEvent};
use hfield_dsp::{
    compile_combined_music_and_conductor_preview, compile_music_preview, compile_pitch_preview,
    write_wav_i16, CompiledAudio,
};
use hfield_field::synthesize_hfield_field;
use hfield_forge_bridge::create_forge_packet_bridge_stub_report;
use hfield_loop::{create_loop_phrase_report, extract_loop_phrase_score};
use hfield_mapping::{apply_generated_mapping, create_conductor_mapping_report};
use hfield_music::{append_note_to_track, clear_track_notes, create_music_timeline_report};
use hfield_notation::{
    create_notation_layout_report, delete_notation_note, edit_notation_note,
    nudge_notation_note_by_beats, position_notation_note_measure_beat,
    position_notation_note_start_ms, select_notation_note,
};
use hfield_packet::validate_hfield_packet_contract;
use hfield_playhead::create_playhead_cursor_report;
use hfield_project::{list_hfield_projects, open_hfield_project, save_hfield_project};
use hfield_resonance::create_resonance_level_bundle;
use hfield_storage::{score_hash_hex, score_to_pretty_json};
use hfield_visual::create_conductor_motion_report;
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

struct AppState {
    playback: Mutex<Option<ActivePlayback>>,
    current_score: Mutex<FieldScore>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            playback: Mutex::new(None),
            current_score: Mutex::new(FieldScore::default_hcs()),
        }
    }
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
fn get_current_hfield_runtime_carrier_packet_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(synthesize_hfield_runtime_carrier_packet_model(&guard))
        .map_err(|err| format!(".hfield runtime carrier packet serialization failed: {err}"))
}

#[tauri::command]
fn get_current_hfield_cymatic_reader_surface_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(synthesize_hfield_cymatic_reader_surface(&guard))
        .map_err(|err| format!(".hfield cymatic reader surface serialization failed: {err}"))
}

#[tauri::command]
fn get_current_hfield_field_synthesis_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(synthesize_hfield_field(&guard))
        .map_err(|err| format!(".hfield field synthesis serialization failed: {err}"))
}

#[tauri::command]
fn get_current_forge_packet_bridge_stub_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_forge_packet_bridge_stub_report(&guard))
        .map_err(|err| format!("Forge packet bridge stub serialization failed: {err}"))
}

#[tauri::command]
fn get_current_hfield_packet_contract_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(validate_hfield_packet_contract(&guard))
        .map_err(|err| format!(".hfield packet contract serialization failed: {err}"))
}

#[tauri::command]
fn get_current_loop_phrase_report(
    state: tauri::State<'_, AppState>,
    start_measure: u32,
    end_measure: u32,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_loop_phrase_report(
        &guard,
        start_measure,
        end_measure,
    ))
    .map_err(|err| format!("loop phrase report serialization failed: {err}"))
}

#[tauri::command]
fn play_current_project_phrase_combined_audio(
    state: tauri::State<'_, AppState>,
    start_measure: u32,
    end_measure: u32,
) -> Result<serde_json::Value, String> {
    let score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    let (phrase_score, phrase_report) =
        extract_loop_phrase_score(&score, start_measure, end_measure)?;

    stop_existing_playback(&state)?;
    let mut playback_report = start_native_playback(state, move |sample_rate_hz| {
        compile_combined_music_and_conductor_preview(&phrase_score, sample_rate_hz)
    })?;

    if let Some(object) = playback_report.as_object_mut() {
        object.insert(
            "message".to_string(),
            json!("native phrase playback started"),
        );
        object.insert("phrase_id".to_string(), json!(phrase_report.phrase_id));
        object.insert(
            "phrase_start_measure".to_string(),
            json!(phrase_report.start_measure),
        );
        object.insert(
            "phrase_end_measure".to_string(),
            json!(phrase_report.end_measure),
        );
        object.insert("phrase_start_ms".to_string(), json!(phrase_report.start_ms));
        object.insert("phrase_end_ms".to_string(), json!(phrase_report.end_ms));
        object.insert(
            "phrase_duration_ms".to_string(),
            json!(phrase_report.duration_ms),
        );
    }

    Ok(playback_report)
}

#[tauri::command]
fn get_current_playhead_cursor_report(
    state: tauri::State<'_, AppState>,
    time_ms: u32,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_playhead_cursor_report(&guard, time_ms))
        .map_err(|err| format!("playhead cursor report serialization failed: {err}"))
}

#[tauri::command]
fn get_current_conductor_motion_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_conductor_motion_report(&guard))
        .map_err(|err| format!("conductor motion serialization failed: {err}"))
}

#[tauri::command]
fn get_generated_conductor_motion_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    apply_generated_mapping(&mut score);

    serde_json::to_value(create_conductor_motion_report(&score))
        .map_err(|err| format!("generated conductor motion serialization failed: {err}"))
}

#[tauri::command]
fn get_current_conductor_mapping_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_conductor_mapping_report(&guard))
        .map_err(|err| format!("conductor mapping serialization failed: {err}"))
}

#[tauri::command]
fn apply_generated_conductor_mapping_to_current_score(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    let report = apply_generated_mapping(&mut guard);

    serde_json::to_value(report)
        .map_err(|err| format!("conductor mapping serialization failed: {err}"))
}

#[tauri::command]
fn play_generated_conductor_mapping_audio(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    apply_generated_mapping(&mut score);

    stop_existing_playback(&state)?;
    start_native_playback(state, move |sample_rate_hz| {
        compile_pitch_preview(&score, sample_rate_hz)
    })
}

#[tauri::command]
fn play_generated_mapped_combined_audio(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    apply_generated_mapping(&mut score);

    stop_existing_playback(&state)?;
    start_native_playback(state, move |sample_rate_hz| {
        compile_combined_music_and_conductor_preview(&score, sample_rate_hz)
    })
}

#[tauri::command]
fn render_generated_mapped_combined_wav(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    apply_generated_mapping(&mut score);

    let compiled = compile_combined_music_and_conductor_preview(&score, 48_000);
    Ok(write_rendered_wav_report(
        "hcs_generated_mapped_combined_v1.wav",
        compiled,
    ))
}

#[tauri::command]
fn select_current_notation_note(
    state: tauri::State<'_, AppState>,
    track_id: String,
    event_index: usize,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(select_notation_note(&guard, &track_id, event_index)?)
        .map_err(|err| format!("selected notation note serialization failed: {err}"))
}

#[tauri::command]
fn edit_current_notation_note(
    state: tauri::State<'_, AppState>,
    track_id: String,
    event_index: usize,
    midi_note: u8,
    duration_ms: u32,
    velocity: f32,
    target_track_id: String,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(edit_notation_note(
        &mut guard,
        &track_id,
        event_index,
        midi_note,
        duration_ms,
        velocity,
        Some(target_track_id.as_str()),
    )?)
    .map_err(|err| format!("notation edit report serialization failed: {err}"))
}

#[tauri::command]
fn delete_current_notation_note(
    state: tauri::State<'_, AppState>,
    track_id: String,
    event_index: usize,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(delete_notation_note(&mut guard, &track_id, event_index)?)
        .map_err(|err| format!("notation delete report serialization failed: {err}"))
}

#[tauri::command]
fn position_current_notation_note_start_ms(
    state: tauri::State<'_, AppState>,
    track_id: String,
    event_index: usize,
    start_ms: u32,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(position_notation_note_start_ms(
        &mut guard,
        &track_id,
        event_index,
        start_ms,
    )?)
    .map_err(|err| format!("notation timing report serialization failed: {err}"))
}

#[tauri::command]
fn position_current_notation_note_measure_beat(
    state: tauri::State<'_, AppState>,
    track_id: String,
    event_index: usize,
    measure_index: u32,
    beat_in_measure: f64,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(position_notation_note_measure_beat(
        &mut guard,
        &track_id,
        event_index,
        measure_index,
        beat_in_measure,
    )?)
    .map_err(|err| format!("notation measure/beat report serialization failed: {err}"))
}

#[tauri::command]
fn nudge_current_notation_note_beats(
    state: tauri::State<'_, AppState>,
    track_id: String,
    event_index: usize,
    beat_delta: i32,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(nudge_notation_note_by_beats(
        &mut guard,
        &track_id,
        event_index,
        beat_delta,
    )?)
    .map_err(|err| format!("notation nudge report serialization failed: {err}"))
}

#[tauri::command]
fn get_current_notation_layout(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_notation_layout_report(&guard))
        .map_err(|err| format!("notation layout serialization failed: {err}"))
}

#[tauri::command]
fn get_current_music_timeline(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_music_timeline_report(&guard))
        .map_err(|err| format!("music timeline serialization failed: {err}"))
}

#[tauri::command]
fn append_note_to_current_track(
    state: tauri::State<'_, AppState>,
    track_id: String,
    midi_note: u8,
    duration_ms: u32,
    velocity: f32,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    let report = append_note_to_track(&mut guard, &track_id, midi_note, duration_ms, velocity)?;

    serde_json::to_value(report)
        .map_err(|err| format!("music timeline serialization failed: {err}"))
}

#[tauri::command]
fn clear_current_music_track(
    state: tauri::State<'_, AppState>,
    track_id: String,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    let report = clear_track_notes(&mut guard, &track_id)?;

    serde_json::to_value(report)
        .map_err(|err| format!("music timeline serialization failed: {err}"))
}

#[tauri::command]
fn reset_current_music_to_seed(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let seed = seed_music_score();

    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    guard.music = seed.music;

    serde_json::to_value(create_music_timeline_report(&guard))
        .map_err(|err| format!("music timeline serialization failed: {err}"))
}

#[tauri::command]
fn play_current_project_music_audio(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    stop_existing_playback(&state)?;
    start_native_playback(state, move |sample_rate_hz| {
        compile_music_preview(&score, sample_rate_hz)
    })
}

#[tauri::command]
fn render_current_project_music_wav(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    let compiled = compile_music_preview(&score, 48_000);
    Ok(write_rendered_wav_report(
        "hcs_current_project_music_v1.wav",
        compiled,
    ))
}

#[tauri::command]
fn load_seed_music_project(state: tauri::State<'_, AppState>) -> Result<FieldScore, String> {
    let score = seed_music_score();

    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    *guard = score.clone();

    Ok(score)
}

#[tauri::command]
fn get_current_project_score(state: tauri::State<'_, AppState>) -> Result<FieldScore, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    Ok(guard.clone())
}

#[tauri::command]
fn get_current_gesture_timeline(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_gesture_timeline_report(&guard))
        .map_err(|err| format!("timeline serialization failed: {err}"))
}

#[tauri::command]
fn append_gesture_to_current_score(
    state: tauri::State<'_, AppState>,
    gesture_id: String,
    duration_ms: u32,
    intensity: f32,
    operator: Option<String>,
) -> Result<serde_json::Value, String> {
    if !is_valid_gesture_id(&gesture_id) {
        return Err(format!("invalid gesture id: {gesture_id}"));
    }

    let duration_ms = duration_ms.clamp(80, 8_000);
    let intensity = intensity.clamp(0.0, 1.0);

    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    let start_ms = guard
        .conductor
        .primary_hand_track
        .events
        .iter()
        .map(|event| event.start_ms.saturating_add(event.duration_ms))
        .max()
        .unwrap_or(0);

    guard
        .conductor
        .primary_hand_track
        .events
        .push(GestureEvent {
            gesture_id,
            start_ms,
            duration_ms,
            intensity,
            operator,
        });

    serde_json::to_value(create_gesture_timeline_report(&guard))
        .map_err(|err| format!("timeline serialization failed: {err}"))
}

#[tauri::command]
fn clear_current_gesture_timeline(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    guard.conductor.primary_hand_track.events.clear();

    serde_json::to_value(create_gesture_timeline_report(&guard))
        .map_err(|err| format!("timeline serialization failed: {err}"))
}

#[tauri::command]
fn reset_current_gesture_timeline_to_standard_path(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let standard = audition_score();

    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    guard.conductor = standard.conductor;

    serde_json::to_value(create_gesture_timeline_report(&guard))
        .map_err(|err| format!("timeline serialization failed: {err}"))
}

#[tauri::command]
fn play_current_project_conductor_audio(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    stop_existing_playback(&state)?;
    start_native_playback(state, move |sample_rate_hz| {
        compile_pitch_preview(&score, sample_rate_hz)
    })
}

#[tauri::command]
fn play_current_project_combined_audio(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    stop_existing_playback(&state)?;
    start_native_playback(state, move |sample_rate_hz| {
        compile_combined_music_and_conductor_preview(&score, sample_rate_hz)
    })
}

#[tauri::command]
fn render_current_project_combined_wav(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    let compiled = compile_combined_music_and_conductor_preview(&score, 48_000);
    Ok(write_rendered_wav_report(
        "hcs_current_project_combined_v1.wav",
        compiled,
    ))
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
fn get_current_resonance_level_bundle(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_resonance_level_bundle(&guard))
        .map_err(|err| format!("current resonance bundle serialization failed: {err}"))
}

#[tauri::command]
fn list_saved_projects() -> Result<serde_json::Value, String> {
    serde_json::to_value(list_hfield_projects(&app_root_dir())?)
        .map_err(|err| format!("project list serialization failed: {err}"))
}

#[tauri::command]
fn save_current_project_as(
    state: tauri::State<'_, AppState>,
    file_name: String,
) -> Result<serde_json::Value, String> {
    let score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    serde_json::to_value(save_hfield_project(&app_root_dir(), &file_name, &score)?)
        .map_err(|err| format!("project save report serialization failed: {err}"))
}

#[tauri::command]
fn open_project_by_file_name(
    state: tauri::State<'_, AppState>,
    file_name: String,
) -> Result<serde_json::Value, String> {
    let (score, report) = open_hfield_project(&app_root_dir(), &file_name)?;

    {
        let mut guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        *guard = score;
    }

    serde_json::to_value(report)
        .map_err(|err| format!("project open report serialization failed: {err}"))
}

#[tauri::command]
fn get_seed_resonance_level_bundle() -> serde_json::Value {
    let score = seed_music_score();
    serde_json::to_value(create_resonance_level_bundle(&score))
        .expect("resonance level bundle should serialize")
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
            get_current_hfield_packet_contract_report,
            get_current_hfield_field_synthesis_report,
            get_current_hfield_cymatic_reader_surface_report,
            get_current_hfield_runtime_carrier_packet_report,
            get_current_forge_packet_bridge_stub_report,
            get_current_playhead_cursor_report,
            get_current_loop_phrase_report,
            play_current_project_phrase_combined_audio,
            get_current_conductor_motion_report,
            get_generated_conductor_motion_report,
            get_current_conductor_mapping_report,
            apply_generated_conductor_mapping_to_current_score,
            play_generated_conductor_mapping_audio,
            play_generated_mapped_combined_audio,
            render_generated_mapped_combined_wav,
            select_current_notation_note,
            edit_current_notation_note,
            delete_current_notation_note,
            position_current_notation_note_start_ms,
            position_current_notation_note_measure_beat,
            nudge_current_notation_note_beats,
            get_current_notation_layout,
            get_current_music_timeline,
            append_note_to_current_track,
            clear_current_music_track,
            reset_current_music_to_seed,
            play_current_project_music_audio,
            render_current_project_music_wav,
            load_seed_music_project,
            get_current_project_score,
            get_current_gesture_timeline,
            append_gesture_to_current_score,
            clear_current_gesture_timeline,
            reset_current_gesture_timeline_to_standard_path,
            play_current_project_conductor_audio,
            play_current_project_combined_audio,
            render_current_project_combined_wav,
            create_default_score,
            create_seed_music_score,
            get_current_resonance_level_bundle,
            list_saved_projects,
            save_current_project_as,
            open_project_by_file_name,
            get_seed_resonance_level_bundle,
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
