#![recursion_limit = "1024"]
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use hfield_analysis::summarize_waveform;
use hfield_carrier::synthesize_hfield_runtime_carrier_packet_model;
use hfield_conductor::{
    create_gesture_timeline_report, create_nine_gesture_conductor_engine_report,
    create_true_conductor_gesture_reference_manifest_v1_report, is_valid_gesture_id,
    nine_gesture_vocabulary,
};
use hfield_coordinate::create_hfield_rust_render_manifest;
use hfield_cymatics::{
    synthesize_cymatic_field_model_v2_report, synthesize_hfield_cymatic_reader_surface,
};
use hfield_domain::{
    create_syllable_shaped_expression_v1_report, ConductedPerformance, FieldScore, GestureEvent,
    GestureTrack, MusicTrack, NoteEvent,
};
use hfield_dsp::{
    compile_combined_music_and_conductor_preview, compile_deterministic_audio_engine_v2,
    compile_music_preview, compile_pitch_preview, create_deterministic_audio_engine_v2_report,
    write_wav_i16, CompiledAudio,
};
use hfield_field::{synthesize_gesture_aware_field_renderer_v2_report, synthesize_hfield_field};
use hfield_forge_bridge::create_forge_packet_bridge_stub_report;
use hfield_loop::{create_loop_phrase_report, extract_loop_phrase_score};
use hfield_mapping::{apply_generated_mapping, create_conductor_mapping_report};
use hfield_music::{
    append_note_to_track, clear_track_notes, create_music_timeline_report,
    midi_note_to_frequency_hz, midi_note_to_name,
};
use hfield_notation::{
    create_notation_layout_report, delete_notation_note, edit_notation_note,
    nudge_notation_note_by_beats, position_notation_note_measure_beat,
    position_notation_note_start_ms, select_notation_note,
};
use hfield_packet::{
    assert_hfield_packet_openable, bind_hfield_identity_vault_reference_only,
    canonicalized_hfield_score, summarize_hfield_identity_vault_reference_binding,
    validate_hfield_packet_contract,
};
use hfield_playhead::create_playhead_cursor_report;
use hfield_project::{list_hfield_projects, open_hfield_project, save_hfield_project};
use hfield_resonance::create_resonance_level_bundle;
use hfield_storage::{score_hash_hex, score_to_pretty_json};
use hfield_visual::create_conductor_motion_report;
use serde_json::json;
use std::path::Path;
use std::process::Command;
use std::sync::{
    atomic::{AtomicBool, AtomicUsize, Ordering},
    mpsc, Arc, Mutex,
};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

struct ActivePlayback {
    stop_flag: Arc<AtomicBool>,
    playhead: Arc<AtomicUsize>,
    sample_rate_hz: u32,
    sample_count: usize,
    score_time_offset_ms: u32,
    score_time_end_ms: Option<u32>,
    clock_role: String,
    thread: thread::JoinHandle<()>,
}

struct PlaybackStartup {
    report: serde_json::Value,
    playhead: Arc<AtomicUsize>,
    sample_rate_hz: u32,
    sample_count: usize,
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
fn get_current_hfield_rust_render_manifest_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(create_hfield_rust_render_manifest(&guard))
        .map_err(|err| format!(".hfield rust render manifest serialization failed: {err}"))
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
fn get_current_hfield_identity_vault_reference_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    serde_json::to_value(summarize_hfield_identity_vault_reference_binding(&guard)).map_err(|err| {
        format!(".hfield identity vault reference report serialization failed: {err}")
    })
}

#[tauri::command]
fn bind_current_hfield_identity_vault_reference(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    let report = bind_hfield_identity_vault_reference_only(&mut guard);

    serde_json::to_value(report).map_err(|err| {
        format!(".hfield identity vault reference binding serialization failed: {err}")
    })
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
    let mut playback_report = start_native_playback_with_clock(
        state,
        phrase_report.start_ms,
        Some(phrase_report.end_ms),
        "phrase_combined",
        move |sample_rate_hz| {
            compile_combined_music_and_conductor_preview(&phrase_score, sample_rate_hz)
        },
    )?;

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

const HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID: &str = "aiweb.hfield.key_frequency_registry.v1";
const HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ: f64 = 440.0;
const HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI: i32 = 69;

fn hcs_key_frequency_registry_midi_to_frequency_hz_v1(midi_note: u8) -> f64 {
    let semitone_delta = midi_note as f64 - HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI as f64;
    HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ * 2_f64.powf(semitone_delta / 12.0)
}

fn hcs_key_frequency_registry_midi_to_label_v1(midi_note: u8) -> String {
    let names = [
        "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
    ];
    let note_name = names[(midi_note % 12) as usize];
    let octave = (midi_note as i32 / 12) - 1;
    format!("{note_name}{octave}")
}

fn hcs_key_frequency_registry_record_v1(midi_note: u8) -> serde_json::Value {
    let frequency_hz = hcs_key_frequency_registry_midi_to_frequency_hz_v1(midi_note);
    json!({
        "midi_note": midi_note,
        "pitch_label": hcs_key_frequency_registry_midi_to_label_v1(midi_note),
        "frequency_hz": frequency_hz,
        "frequency_hz_rounded_2dp": (frequency_hz * 100.0).round() / 100.0,
        "tuning_mode": "twelve_tone_equal_temperament",
        "a4_hz": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ,
        "a4_midi_note": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI,
        "formula_id": "frequency_hz = 440 * 2^((midi_note - 69) / 12)",
        "authority": HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID,
        "simulated": false
    })
}

fn hcs_key_frequency_registry_report_v1() -> serde_json::Value {
    let full_registry = (0_u16..=127_u16)
        .map(|midi| hcs_key_frequency_registry_record_v1(midi as u8))
        .collect::<Vec<_>>();
    let piano_range = (21_u16..=108_u16)
        .map(|midi| hcs_key_frequency_registry_record_v1(midi as u8))
        .collect::<Vec<_>>();
    let studio_anchor_keys = [36_u8, 48, 60, 69, 72, 84]
        .into_iter()
        .map(hcs_key_frequency_registry_record_v1)
        .collect::<Vec<_>>();

    json!({
        "status": "ok",
        "contract_id": HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "purpose": "deterministic key-to-frequency authority for piano roll, virtual keyboard, score import, audio playback provenance, and Glass Reader field mapping",
        "tuning_mode": "twelve_tone_equal_temperament",
        "a4_hz": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ,
        "a4_midi_note": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI,
        "formula_id": "frequency_hz = 440 * 2^((midi_note - 69) / 12)",
        "full_midi_range": [0, 127],
        "standard_piano_range": [21, 108],
        "tracked_key_count": full_registry.len(),
        "standard_piano_key_count": piano_range.len(),
        "registry": full_registry,
        "standard_piano_registry": piano_range,
        "studio_anchor_keys": studio_anchor_keys,
        "non_simulation_rules": {
            "all_virtual_keyboard_keys_show_frequency": true,
            "all_piano_roll_notes_report_frequency_hz": true,
            "score_import_pitch_labels_resolve_to_midi_then_frequency": true,
            "audio_and_field_layers_must_use_midi_frequency_authority": true,
            "hidden_or_guessed_frequency_mapping_allowed": false,
            "uses_llm": false
        },
        "authority_boundaries": {
            "mutates_current_hcs_score": false,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "changes_bundle_custody_semantics": false
        }
    })
}

#[tauri::command]
fn get_hcs_key_frequency_registry_v1_report() -> Result<serde_json::Value, String> {
    Ok(hcs_key_frequency_registry_report_v1())
}

#[tauri::command]
fn lookup_hcs_key_frequency_v1(midi_note: u8) -> Result<serde_json::Value, String> {
    Ok(hcs_key_frequency_registry_record_v1(midi_note.min(127)))
}

const HCS_INSTRUMENT_RACK_AND_TRACK_SOUND_V1_CONTRACT_ID: &str =
    "aiweb.hfield.instrument_rack_and_track_sound.v1";

fn hcs_instrument_catalog_v1() -> Vec<serde_json::Value> {
    vec![
        json!({
            "instrument_id": "glass_piano",
            "display_name": "Glass Piano",
            "family": "keys",
            "waveform": "triangle",
            "partials": [{"ratio": 1.0, "gain": 1.0}, {"ratio": 2.0, "gain": 0.18}],
            "attack_ms": 8,
            "release_ms": 180,
            "default_level": 0.78,
            "description": "bright playable keyboard voice for lead writing"
        }),
        json!({
            "instrument_id": "warm_electric_piano",
            "display_name": "Warm Electric Piano",
            "family": "keys",
            "waveform": "sine",
            "partials": [{"ratio": 1.0, "gain": 1.0}, {"ratio": 2.0, "gain": 0.12}, {"ratio": 3.0, "gain": 0.06}],
            "attack_ms": 14,
            "release_ms": 260,
            "default_level": 0.74,
            "description": "soft harmonic keyboard tone for chords and melody"
        }),
        json!({
            "instrument_id": "deep_bass",
            "display_name": "Deep Bass",
            "family": "bass",
            "waveform": "sine",
            "partials": [{"ratio": 1.0, "gain": 1.0}, {"ratio": 0.5, "gain": 0.35}],
            "attack_ms": 22,
            "release_ms": 260,
            "default_level": 0.68,
            "description": "low-frequency depth layer for carrier grounding"
        }),
        json!({
            "instrument_id": "glass_pad",
            "display_name": "Glass Pad",
            "family": "pad",
            "waveform": "sine",
            "partials": [{"ratio": 1.0, "gain": 0.9}, {"ratio": 1.5, "gain": 0.16}, {"ratio": 2.0, "gain": 0.12}],
            "attack_ms": 180,
            "release_ms": 900,
            "default_level": 0.52,
            "description": "slow field support layer for sustained resonance"
        }),
        json!({
            "instrument_id": "mallet_bell",
            "display_name": "Mallet Bell",
            "family": "percussion",
            "waveform": "triangle",
            "partials": [{"ratio": 1.0, "gain": 1.0}, {"ratio": 2.4, "gain": 0.2}],
            "attack_ms": 3,
            "release_ms": 520,
            "default_level": 0.66,
            "description": "percussive bell-like attack for cue and motif testing"
        }),
        json!({
            "instrument_id": "pulse_lead",
            "display_name": "Pulse Lead",
            "family": "synth",
            "waveform": "sawtooth",
            "partials": [{"ratio": 1.0, "gain": 0.86}, {"ratio": 2.0, "gain": 0.11}],
            "attack_ms": 6,
            "release_ms": 110,
            "default_level": 0.60,
            "description": "clear synthetic lead for timing and phrase work"
        }),
    ]
}

fn hcs_default_instrument_id_for_track_v1(track_id: &str, role: &str) -> &'static str {
    let id = track_id.to_ascii_lowercase();
    let role = role.to_ascii_lowercase();
    if id.contains("depth") || role.contains("bass") || role.contains("depth") {
        "deep_bass"
    } else if id.contains("field") || role.contains("field") || role.contains("pad") {
        "glass_pad"
    } else if role.contains("bell") || role.contains("cue") {
        "mallet_bell"
    } else {
        "glass_piano"
    }
}

fn hcs_default_track_sound_profile_v1(
    track_id: &str,
    role: &str,
    note_count: usize,
) -> serde_json::Value {
    let instrument_id = hcs_default_instrument_id_for_track_v1(track_id, role);
    let default_level = match instrument_id {
        "deep_bass" => 0.68,
        "glass_pad" => 0.52,
        "mallet_bell" => 0.66,
        "pulse_lead" => 0.60,
        "warm_electric_piano" => 0.74,
        _ => 0.78,
    };
    json!({
        "track_id": track_id,
        "role": role,
        "instrument_id": instrument_id,
        "level": default_level,
        "muted": false,
        "soloed": false,
        "note_count": note_count,
        "assignment_source": "deterministic_default_from_track_role",
        "source_authority": "current_score.music.tracks[*].notes",
        "render_authority": HCS_INSTRUMENT_RACK_AND_TRACK_SOUND_V1_CONTRACT_ID
    })
}

#[tauri::command]
fn get_hcs_instrument_rack_and_track_sound_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;
    let timeline = create_music_timeline_report(&guard);
    let score_hash = score_hash_hex(&guard).map_err(|err| format!("score hash failed: {err}"))?;
    let track_profiles = timeline
        .tracks
        .iter()
        .map(|track| {
            hcs_default_track_sound_profile_v1(&track.track_id, &track.role, track.note_count)
        })
        .collect::<Vec<_>>();

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_INSTRUMENT_RACK_AND_TRACK_SOUND_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "purpose": "per-track instrument assignment and musician-facing mixer control for HCS score playback previews",
        "title": guard.title,
        "score_hash": score_hash,
        "tempo_bpm": guard.music.tempo_bpm,
        "meter": guard.music.meter,
        "track_count": timeline.track_count,
        "note_count": timeline.total_note_count,
        "instrument_catalog": hcs_instrument_catalog_v1(),
        "track_sound_profiles": track_profiles,
        "mixer_features": {
            "per_track_instrument_assignment": true,
            "track_mute": true,
            "track_solo": true,
            "track_level": true,
            "starter_instrument_set": true,
            "sound_variety_beyond_flat_tone": true,
            "web_audio_preview_surface": true,
            "deterministic_score_source": true
        },
        "sync_law": {
            "single_score_source": "current_score.music.tracks[*].notes",
            "track_sound_profiles_are_downstream_render_config": true,
            "instrument_selection_does_not_change_note_frequency": true,
            "frequency_authority_contract": HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID,
            "notation_and_piano_roll_stay_source_views": true,
            "glass_reader_field_stays_frequency_authoritative": true
        },
        "frequency_authority": {
            "contract_id": HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID,
            "tuning_mode": "twelve_tone_equal_temperament",
            "a4_hz": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ,
            "a4_midi_note": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI,
            "formula_id": "frequency_hz = 440 * 2^((midi_note - 69) / 12)",
            "simulated": false
        },
        "authority_boundaries": {
            "mutates_current_hcs_score": false,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "changes_bundle_custody_semantics": false,
            "uses_llm": false
        }
    }))
}

const HCS_WAVEFORM_TO_3D_FIELD_BODY_V1_CONTRACT_ID: &str =
    "aiweb.hfield.waveform_to_3d_field_body.v1";

const HCS_COMPOSER_WAVEFORM_EDITOR_TRUE_SOUND_BODY_V1_CONTRACT_ID: &str =
    "aiweb.hcs.composer_waveform_editor_true_sound_body.v1";

fn hcs_editor_track_gain_v1(role: &str) -> f64 {
    match role {
        "melody" => 0.28,
        "bass_depth" => 0.24,
        "harmonic_field_support" => 0.15,
        _ => 0.18,
    }
}

fn hcs_editor_music_envelope_v1(t_norm: f64) -> f64 {
    let t = t_norm.clamp(0.0, 1.0);
    let attack = 0.085_f64;
    let release = 0.18_f64;
    if t < attack {
        (t / attack).clamp(0.0, 1.0)
    } else if t > 1.0 - release {
        ((1.0 - t) / release).clamp(0.0, 1.0)
    } else {
        1.0
    }
}

fn hcs_editor_note_sample_v1(
    frequency_hz: f64,
    local_time_seconds: f64,
    t_norm: f64,
    velocity: f64,
    role_gain: f64,
) -> f64 {
    let envelope = hcs_editor_music_envelope_v1(t_norm);
    let amplitude = (role_gain * velocity.clamp(0.0, 1.0)).clamp(0.0, 0.42);
    let fundamental = (std::f64::consts::TAU * frequency_hz * local_time_seconds).sin();
    let second_harmonic =
        0.18 * (std::f64::consts::TAU * frequency_hz * 2.0 * local_time_seconds).sin();
    let octave_air = 0.05 * (std::f64::consts::TAU * frequency_hz * 4.0 * local_time_seconds).sin();
    (amplitude * envelope * (fundamental + second_harmonic + octave_air)).clamp(-1.0, 1.0)
}

fn hcs_editor_waveform_point_v1(
    point_index: usize,
    point_count: usize,
    time_ms: f64,
    signed_sample: f64,
    envelope: f64,
    radius_base: f64,
    ring_count: u32,
) -> serde_json::Value {
    let t_norm = if point_count <= 1 {
        0.0
    } else {
        point_index as f64 / (point_count - 1) as f64
    };
    let amplitude = signed_sample.abs().clamp(0.0, 1.0);
    let local_thickness =
        (radius_base * (0.36 + amplitude * 1.42 + envelope * 0.36)).clamp(0.015, 0.85);
    json!({
        "point_index": point_index,
        "t_norm": t_norm,
        "time_ms": time_ms.round() as u32,
        "signed_sample": signed_sample,
        "amplitude": amplitude,
        "envelope": envelope,
        "upper_y": 0.5 - signed_sample * 0.46,
        "lower_y": 0.5 + signed_sample * 0.46,
        "radius": local_thickness,
        "local_thickness": local_thickness,
        "ring_phase": (t_norm * ring_count as f64 * std::f64::consts::TAU) % std::f64::consts::TAU
    })
}

#[tauri::command]
fn get_hcs_composer_waveform_editor_true_sound_body_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    let timeline = create_music_timeline_report(&guard);
    let score_hash = score_hash_hex(&guard).map_err(|err| format!("score hash failed: {err}"))?;
    let total_duration_ms = timeline.total_duration_ms.max(1);
    let mut track_lanes = Vec::new();
    let mut total_segments = 0_usize;

    for (lane_index, track) in guard.music.tracks.iter().enumerate() {
        let role_gain = hcs_editor_track_gain_v1(track.role.as_str());
        let lane_duration_ms = track
            .notes
            .iter()
            .map(|note| note.start_ms.saturating_add(note.duration_ms))
            .max()
            .unwrap_or(1)
            .max(1);
        let mut note_segments = Vec::new();
        let mut aggregate_points = Vec::new();
        let aggregate_count = 192_usize;
        let mut peak_abs = 0.0_f64;
        let mut sum_squares = 0.0_f64;

        for point_index in 0..aggregate_count {
            let t_norm = if aggregate_count <= 1 {
                0.0
            } else {
                point_index as f64 / (aggregate_count - 1) as f64
            };
            let absolute_time_ms = t_norm * total_duration_ms as f64;
            let mut signed_sample = 0.0_f64;
            let mut envelope_peak = 0.0_f64;

            for note in &track.notes {
                let note_start = note.start_ms as f64;
                let note_duration = note.duration_ms.max(1) as f64;
                let note_end = note_start + note_duration;
                if absolute_time_ms >= note_start && absolute_time_ms <= note_end {
                    let local_time_ms = absolute_time_ms - note_start;
                    let local_norm = (local_time_ms / note_duration).clamp(0.0, 1.0);
                    let frequency_hz = midi_note_to_frequency_hz(note.midi_note) as f64;
                    let envelope = hcs_editor_music_envelope_v1(local_norm);
                    envelope_peak = envelope_peak.max(envelope * note.velocity as f64);
                    signed_sample += hcs_editor_note_sample_v1(
                        frequency_hz,
                        local_time_ms / 1000.0,
                        local_norm,
                        note.velocity as f64,
                        role_gain,
                    );
                }
            }

            let signed_sample = signed_sample.clamp(-0.95, 0.95);
            peak_abs = peak_abs.max(signed_sample.abs());
            sum_squares += signed_sample * signed_sample;
            aggregate_points.push(hcs_editor_waveform_point_v1(
                point_index,
                aggregate_count,
                absolute_time_ms,
                signed_sample,
                envelope_peak.clamp(0.0, 1.0),
                0.18 + role_gain,
                8 + lane_index as u32,
            ));
        }

        for (event_index, note) in track.notes.iter().enumerate() {
            let note_point_count = 72_usize;
            let note_duration_ms = note.duration_ms.max(1);
            let start_ms = note.start_ms;
            let end_ms = note.start_ms.saturating_add(note_duration_ms);
            let frequency_hz = midi_note_to_frequency_hz(note.midi_note) as f64;
            let note_name = midi_note_to_name(note.midi_note);
            let velocity = note.velocity as f64;
            let pitch_y_percent = (100.0
                - (((note.midi_note as f64 - 24.0) / 72.0).clamp(0.0, 1.0) * 100.0))
                .clamp(4.0, 96.0);
            let x_percent =
                ((start_ms as f64 / total_duration_ms as f64) * 100.0).clamp(0.0, 100.0);
            let width_percent =
                ((note_duration_ms as f64 / total_duration_ms as f64) * 100.0).clamp(0.8, 100.0);
            let ring_count = ((note_duration_ms as f64 / 120.0).round() as u32).clamp(3, 48);
            let radius_norm = (0.10 + velocity * 0.46 + role_gain * 0.22).clamp(0.08, 0.86);
            let local_thickness = (radius_norm * (0.38 + velocity * 0.72)).clamp(0.08, 0.92);
            let mut points = Vec::new();

            for point_index in 0..note_point_count {
                let t_norm = if note_point_count <= 1 {
                    0.0
                } else {
                    point_index as f64 / (note_point_count - 1) as f64
                };
                let local_time_ms = t_norm * note_duration_ms as f64;
                let envelope = hcs_editor_music_envelope_v1(t_norm) * velocity.clamp(0.0, 1.0);
                let signed_sample = hcs_editor_note_sample_v1(
                    frequency_hz,
                    local_time_ms / 1000.0,
                    t_norm,
                    velocity,
                    role_gain,
                );
                points.push(hcs_editor_waveform_point_v1(
                    point_index,
                    note_point_count,
                    start_ms as f64 + local_time_ms,
                    signed_sample,
                    envelope,
                    radius_norm,
                    ring_count,
                ));
            }

            note_segments.push(json!({
                "note_id": format!("{}:{}", track.track_id, event_index),
                "track_id": track.track_id,
                "event_index": event_index,
                "note_name": note_name,
                "midi_note": note.midi_note,
                "frequency_hz": frequency_hz,
                "start_ms": start_ms,
                "duration_ms": note_duration_ms,
                "end_ms": end_ms,
                "velocity": velocity,
                "x_percent": x_percent,
                "width_percent": width_percent,
                "pitch_y_percent": pitch_y_percent,
                "waveform_points": points,
                "visual_body": {
                    "length_rule": "note duration becomes extrusion length",
                    "radius_rule": "velocity and envelope become local radius",
                    "contour_rule": "signed harmonic sample becomes visible contour",
                    "density_rule": "frequency and duration determine internal ring rhythm",
                    "taper_rule": "deterministic attack/release envelope tapers body ends",
                    "length_norm": (note_duration_ms as f64 / total_duration_ms as f64).clamp(0.0, 1.0),
                    "radius_norm": radius_norm,
                    "local_thickness": local_thickness,
                    "density": (frequency_hz / 144.0).clamp(0.05, 32.0),
                    "taper_attack": 0.085,
                    "taper_release": 0.18,
                    "swelling": velocity.clamp(0.0, 1.0),
                    "ring_count": ring_count,
                    "internal_ring_rhythm_hz": frequency_hz,
                    "glass_reader_extrusion_axis": "time/depth"
                }
            }));
            total_segments += 1;
        }

        let aggregate_rms = if aggregate_count > 0 {
            (sum_squares / aggregate_count as f64).sqrt()
        } else {
            0.0
        };

        track_lanes.push(json!({
            "lane_id": format!("waveform_lane_{}", lane_index + 1),
            "track_id": track.track_id,
            "role": track.role,
            "lane_index": lane_index,
            "note_count": track.notes.len(),
            "track_duration_ms": lane_duration_ms,
            "x_percent": 0.0,
            "width_percent": ((lane_duration_ms as f64 / total_duration_ms as f64) * 100.0).clamp(0.0, 100.0),
            "lane_color": match track.role.as_str() {
                "melody" => "#f5d28e",
                "bass_depth" => "#66d8ff",
                "harmonic_field_support" => "#efe9a6",
                _ => "#d7f7ff"
            },
            "aggregate_peak_abs": peak_abs,
            "aggregate_rms": aggregate_rms,
            "aggregate_points": aggregate_points,
            "note_segments": note_segments
        }));
    }

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_COMPOSER_WAVEFORM_EDITOR_TRUE_SOUND_BODY_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "purpose": "composer waveform editor source layer that renders each note as a deterministic 2D waveform segment before Glass Reader 3D extrusion",
        "title": guard.title,
        "score_hash": score_hash,
        "tempo_bpm": guard.music.tempo_bpm,
        "meter": guard.music.meter,
        "track_count": timeline.track_count,
        "note_count": timeline.total_note_count,
        "total_duration_ms": total_duration_ms,
        "segment_count": total_segments,
        "sample_contract": {
            "sample_source": "current_score.music.tracks[*].notes with deterministic harmonic synthesis formula",
            "formula_matches_audio_engine_family": "fundamental + quiet second harmonic + octave air with deterministic attack/release envelope",
            "sample_points_per_note": 72,
            "aggregate_points_per_track": 192,
            "randomness": false,
            "device_input": false
        },
        "extrusion_rule": {
            "length": "note duration / score duration",
            "radius": "velocity plus envelope amplitude",
            "contour": "signed waveform sample",
            "local_thickness": "radius times envelope/signed-sample energy",
            "segmentation": "one editable segment per note event",
            "density": "frequency ratio against 144 Hz root",
            "tapering": "attack/release envelope",
            "swelling": "velocity and RMS energy",
            "internal_ring_rhythm": "note frequency drives ring cadence"
        },
        "track_lanes": track_lanes,
        "authority_boundaries": {
            "mutates_current_hcs_score": false,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "changes_bundle_custody_semantics": false,
            "uses_llm": false,
            "is_source_authority": false,
            "is_rendered_from_score_source": true
        }
    }))
}

#[tauri::command]
fn get_hcs_waveform_to_3d_field_body_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    let timeline = create_music_timeline_report(&guard);
    let score_hash = score_hash_hex(&guard).map_err(|err| format!("score hash failed: {err}"))?;
    let mut waveform_bodies = Vec::new();

    for (track_index, track) in guard.music.tracks.iter().enumerate() {
        let duration_ms = track
            .notes
            .iter()
            .map(|note| note.start_ms.saturating_add(note.duration_ms))
            .max()
            .unwrap_or(1)
            .max(1);

        let note_count = track.notes.len();
        let mut peak_velocity = 0.0_f64;
        let mut velocity_energy = 0.0_f64;
        let mut min_midi = 127_u8;
        let mut max_midi = 0_u8;
        let mut weighted_midi = 0.0_f64;
        let mut weight_sum = 0.0_f64;

        for note in &track.notes {
            let velocity = (note.velocity as f64).clamp(0.0, 1.0);
            peak_velocity = peak_velocity.max(velocity);
            velocity_energy += velocity * velocity;
            min_midi = min_midi.min(note.midi_note);
            max_midi = max_midi.max(note.midi_note);
            let duration_weight = note.duration_ms.max(1) as f64 * velocity.max(0.05);
            weighted_midi += note.midi_note as f64 * duration_weight;
            weight_sum += duration_weight;
        }

        if note_count == 0 {
            min_midi = 60;
            max_midi = 60;
        }

        let rms_energy = if note_count > 0 {
            (velocity_energy / note_count as f64).sqrt()
        } else {
            0.0
        };

        let pitch_center = if weight_sum > 0.0 {
            weighted_midi / weight_sum
        } else {
            60.0
        };

        let phase_index = (track_index % 9) + 1;
        let lane_x = -1.0 + (track_index as f64 * 0.38);
        let lane_y = ((pitch_center - 60.0) / 24.0).clamp(-0.75, 0.75);
        let lane_z = (phase_index as f64 - 5.0) / 5.0;

        let body_length = (0.72 + (duration_ms as f64 / 8000.0)).clamp(0.72, 2.85);
        let body_radius = (0.10 + peak_velocity * 0.28 + rms_energy * 0.18).clamp(0.10, 0.62);
        let pitch_width = (max_midi.saturating_sub(min_midi) as f64 / 24.0).clamp(0.0, 1.0);
        let undulation_depth = (0.04 + pitch_width * 0.12 + rms_energy * 0.10).clamp(0.04, 0.28);

        let sample_count = 24_u32;
        let mut envelope_points = Vec::new();

        for sample_index in 0..sample_count {
            let t_norm = if sample_count <= 1 {
                0.0
            } else {
                sample_index as f64 / (sample_count - 1) as f64
            };
            let sample_time = t_norm * duration_ms as f64;
            let mut amplitude = 0.0_f64;

            for note in &track.notes {
                let start = note.start_ms as f64;
                let end = note.start_ms.saturating_add(note.duration_ms) as f64;
                if sample_time >= start && sample_time <= end {
                    amplitude = amplitude.max((note.velocity as f64).clamp(0.0, 1.0));
                }
            }

            let radius = body_radius * (0.42 + amplitude * 0.58);
            let theta = t_norm * std::f64::consts::TAU;
            envelope_points.push(json!({
                "sample_index": sample_index,
                "t_norm": t_norm,
                "time_ms": sample_time.round() as u32,
                "amplitude": amplitude,
                "radius": radius,
                "surface_x": t_norm * body_length,
                "surface_y": radius * theta.sin(),
                "surface_z": radius * theta.cos()
            }));
        }

        waveform_bodies.push(json!({
            "track_id": track.track_id,
            "role": track.role,
            "phase_index": phase_index,
            "note_count": note_count,
            "duration_ms": duration_ms,
            "min_midi": min_midi,
            "max_midi": max_midi,
            "pitch_center_midi": pitch_center,
            "peak_velocity": peak_velocity,
            "rms_energy": rms_energy,
            "body": {
                "shape": "elongated_resonant_wave_capsule",
                "length": body_length,
                "radius": body_radius,
                "undulation_depth": undulation_depth,
                "not_random_bubble": true,
                "generated_from_waveform_envelope": true
            },
            "glass_reader_placement": {
                "x": lane_x,
                "y": lane_y,
                "z": lane_z,
                "lane_index": track_index,
                "plane": "Glass Reader Plane",
                "depth_rule": "phase index and track order determine field depth",
                "vertical_rule": "weighted pitch center determines vertical offset"
            },
            "envelope_points": envelope_points
        }));
    }

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_WAVEFORM_TO_3D_FIELD_BODY_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "purpose": "extract per-track waveform envelopes and convert them into elongated 3D resonant bodies for Glass Reader placement",
        "title": guard.title,
        "score_hash": score_hash,
        "track_count": timeline.track_count,
        "note_count": timeline.total_note_count,
        "total_duration_ms": timeline.total_duration_ms,
        "waveform_bodies": waveform_bodies,
        "conversion_rule": {
            "source": "current_score.music.tracks[*].notes",
            "waveform_extraction": "timing + duration + velocity + pitch range + envelope samples",
            "amplitude_to_radius": true,
            "duration_to_length": true,
            "pitch_center_to_vertical_offset": true,
            "phase_index_to_field_depth": true,
            "random_spheres_allowed": false
        },
        "glass_reader_placement_rule": {
            "plane": "Glass Reader Plane",
            "body_type": "elongated_resonant_wave_capsule",
            "visual_chain": "score -> SoundFont/audio waveform -> envelope -> 3D body -> Glass Reader field",
            "replay_deterministic": true
        },
        "authority_boundaries": {
            "mutates_current_hcs_score": false,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "changes_bundle_custody_semantics": false,
            "uses_llm": false
        }
    }))
}

const HCS_FLUIDSYNTH_SOUNDFONT_PLAYBACK_ENGINE_V1_CONTRACT_ID: &str =
    "aiweb.hfield.fluidsynth_soundfont_playback_engine.v1";
const HCS_FLUIDSYNTH_GM_SOUNDFONT_V1: &str = "/usr/share/sounds/sf2/FluidR3_GM.sf2";

fn hcs_midi_var_len_v1(mut value: u32, out: &mut Vec<u8>) {
    let mut buffer = [0_u8; 5];
    let mut index = 4;
    buffer[index] = (value & 0x7f) as u8;
    value >>= 7;
    while value > 0 {
        index -= 1;
        buffer[index] = ((value & 0x7f) as u8) | 0x80;
        value >>= 7;
    }
    out.extend_from_slice(&buffer[index..=4]);
}

fn hcs_push_midi_u16_v1(out: &mut Vec<u8>, value: u16) {
    out.push((value >> 8) as u8);
    out.push((value & 0xff) as u8);
}

fn hcs_push_midi_u32_v1(out: &mut Vec<u8>, value: u32) {
    out.push((value >> 24) as u8);
    out.push(((value >> 16) & 0xff) as u8);
    out.push(((value >> 8) & 0xff) as u8);
    out.push((value & 0xff) as u8);
}

fn hcs_assignment_value_v1<'a>(
    assignments: &'a serde_json::Value,
    track_id: &str,
    key: &str,
) -> Option<&'a serde_json::Value> {
    assignments
        .as_object()
        .and_then(|map| map.get(track_id))
        .and_then(|entry| entry.as_object())
        .and_then(|entry| entry.get(key))
}

fn hcs_assignment_program_v1(assignments: &serde_json::Value, track_id: &str, role: &str) -> u8 {
    let default = match hcs_default_instrument_id_for_track_v1(track_id, role) {
        "deep_bass" => 32,
        "glass_pad" => 88,
        "mallet_bell" => 14,
        "warm_electric_piano" => 4,
        "pulse_lead" => 80,
        _ => 0,
    };
    hcs_assignment_value_v1(assignments, track_id, "gm_program")
        .and_then(|value| value.as_u64())
        .map(|value| value.min(127) as u8)
        .unwrap_or(default)
}

fn hcs_assignment_level_v1(assignments: &serde_json::Value, track_id: &str) -> f32 {
    hcs_assignment_value_v1(assignments, track_id, "level")
        .and_then(|value| value.as_f64())
        .map(|value| value.clamp(0.0, 1.25) as f32)
        .unwrap_or(0.82)
}

fn hcs_assignment_bool_v1(assignments: &serde_json::Value, track_id: &str, key: &str) -> bool {
    hcs_assignment_value_v1(assignments, track_id, key)
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
}

fn hcs_assignment_display_v1(assignments: &serde_json::Value, track_id: &str) -> String {
    hcs_assignment_value_v1(assignments, track_id, "display_name")
        .and_then(|value| value.as_str())
        .unwrap_or("GM Instrument")
        .to_string()
}

fn hcs_preview_filter_track_id_v1(assignments: &serde_json::Value) -> Option<String> {
    assignments.as_object().and_then(|map| {
        map.values()
            .filter_map(|entry| entry.get("preview_track_id"))
            .filter_map(|value| value.as_str())
            .find(|value| !value.trim().is_empty())
            .map(str::to_string)
    })
}

fn hcs_build_soundfont_midi_v1(
    score: &FieldScore,
    assignments: &serde_json::Value,
) -> Result<(Vec<u8>, usize, Vec<serde_json::Value>), String> {
    let ticks_per_quarter = 480_u16;
    let quarter_ms = if score.music.tempo_bpm <= 0.0 {
        625.0
    } else {
        60_000.0 / score.music.tempo_bpm
    };
    let any_solo = score
        .music
        .tracks
        .iter()
        .any(|track| hcs_assignment_bool_v1(assignments, &track.track_id, "soloed"));
    let preview_filter = hcs_preview_filter_track_id_v1(assignments);

    let mut midi = Vec::new();
    midi.extend_from_slice(b"MThd");
    hcs_push_midi_u32_v1(&mut midi, 6);
    hcs_push_midi_u16_v1(&mut midi, 1);
    hcs_push_midi_u16_v1(&mut midi, (score.music.tracks.len() + 1) as u16);
    hcs_push_midi_u16_v1(&mut midi, ticks_per_quarter);

    let tempo_micros = (60_000_000.0 / score.music.tempo_bpm.max(20.0)).round() as u32;
    let mut tempo_track = Vec::new();
    hcs_midi_var_len_v1(0, &mut tempo_track);
    tempo_track.extend_from_slice(&[
        0xff,
        0x51,
        0x03,
        ((tempo_micros >> 16) & 0xff) as u8,
        ((tempo_micros >> 8) & 0xff) as u8,
        (tempo_micros & 0xff) as u8,
    ]);
    hcs_midi_var_len_v1(0, &mut tempo_track);
    tempo_track.extend_from_slice(&[0xff, 0x2f, 0x00]);
    midi.extend_from_slice(b"MTrk");
    hcs_push_midi_u32_v1(&mut midi, tempo_track.len() as u32);
    midi.extend_from_slice(&tempo_track);

    let mut rendered_notes = 0_usize;
    let mut instrument_report = Vec::new();

    for (track_index, track) in score.music.tracks.iter().enumerate() {
        let channel = if track_index >= 9 {
            ((track_index + 1) % 16) as u8
        } else {
            (track_index % 16) as u8
        };
        let program = hcs_assignment_program_v1(assignments, &track.track_id, &track.role);
        let level = hcs_assignment_level_v1(assignments, &track.track_id);
        let muted = hcs_assignment_bool_v1(assignments, &track.track_id, "muted");
        let soloed = hcs_assignment_bool_v1(assignments, &track.track_id, "soloed");
        let filtered_out = preview_filter
            .as_ref()
            .map(|target| target != &track.track_id)
            .unwrap_or(false);
        let audible = !muted && (!any_solo || soloed) && !filtered_out;

        instrument_report.push(json!({
            "track_id": track.track_id,
            "role": track.role,
            "display_name": hcs_assignment_display_v1(assignments, &track.track_id),
            "gm_program": program,
            "channel": channel,
            "level": level,
            "muted": muted,
            "soloed": soloed,
            "audible": audible
        }));

        let mut events: Vec<(u32, u8, u8, u8)> = Vec::new();
        events.push((0, 0xc0 | channel, program, 0));

        if audible {
            for note in &track.notes {
                let start_ticks =
                    ((note.start_ms as f64 / quarter_ms) * ticks_per_quarter as f64).round() as u32;
                let end_ticks = (((note.start_ms + note.duration_ms) as f64 / quarter_ms)
                    * ticks_per_quarter as f64)
                    .round() as u32;
                let velocity = ((note.velocity.clamp(0.0, 1.0) * level.clamp(0.0, 1.25) * 112.0)
                    .round() as u8)
                    .clamp(1, 127);
                events.push((
                    start_ticks,
                    0x90 | channel,
                    note.midi_note.min(127),
                    velocity,
                ));
                events.push((
                    end_ticks.max(start_ticks + 1),
                    0x80 | channel,
                    note.midi_note.min(127),
                    0,
                ));
                rendered_notes += 1;
            }
        }

        events.sort_by_key(|event| (event.0, if event.1 & 0xf0 == 0x80 { 0 } else { 1 }));

        let mut track_bytes = Vec::new();
        let mut last_tick = 0_u32;
        for (tick, status, data1, data2) in events {
            hcs_midi_var_len_v1(tick.saturating_sub(last_tick), &mut track_bytes);
            track_bytes.push(status);
            track_bytes.push(data1);
            if status & 0xf0 != 0xc0 {
                track_bytes.push(data2);
            }
            last_tick = tick;
        }
        hcs_midi_var_len_v1(0, &mut track_bytes);
        track_bytes.extend_from_slice(&[0xff, 0x2f, 0x00]);

        midi.extend_from_slice(b"MTrk");
        hcs_push_midi_u32_v1(&mut midi, track_bytes.len() as u32);
        midi.extend_from_slice(&track_bytes);
    }

    if rendered_notes == 0 {
        return Err("no audible notes available for FluidSynth render".to_string());
    }

    Ok((midi, rendered_notes, instrument_report))
}

fn hcs_try_spawn_audio_player_v1(path: &std::path::Path) -> serde_json::Value {
    for binary in ["paplay", "aplay", "ffplay"] {
        let mut command = Command::new(binary);
        if binary == "ffplay" {
            command.args(["-nodisp", "-autoexit", "-loglevel", "quiet"]);
        }
        match command.arg(path).spawn() {
            Ok(_) => {
                return json!({
                    "playback_started": true,
                    "player": binary
                });
            }
            Err(_) => continue,
        }
    }

    json!({
        "playback_started": false,
        "player": null,
        "note": "WAV was rendered, but no paplay/aplay/ffplay player was available."
    })
}

#[tauri::command]
fn play_hcs_fluidsynth_soundfont_mix_v1(
    state: tauri::State<'_, AppState>,
    assignments: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let score = {
        let guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        guard.clone()
    };

    let soundfont_path = Path::new(HCS_FLUIDSYNTH_GM_SOUNDFONT_V1);
    if !soundfont_path.is_file() {
        return Err(format!(
            "SoundFont not found: {HCS_FLUIDSYNTH_GM_SOUNDFONT_V1}"
        ));
    }

    let (midi_bytes, note_count, instrument_report) =
        hcs_build_soundfont_midi_v1(&score, &assignments)?;

    let export_dir = app_root_dir().join("exports").join("audio");
    std::fs::create_dir_all(&export_dir)
        .map_err(|err| format!("failed to create audio export dir: {err}"))?;

    let unix = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| format!("system time failed: {err}"))?
        .as_secs();

    let midi_path = export_dir.join(format!("hcs_fluidsynth_soundfont_mix_v1_{unix}.mid"));
    let wav_path = export_dir.join(format!("hcs_fluidsynth_soundfont_mix_v1_{unix}.wav"));

    std::fs::write(&midi_path, midi_bytes)
        .map_err(|err| format!("failed to write MIDI file: {err}"))?;

    let output = Command::new("fluidsynth")
        .args([
            "-ni",
            "-F",
            wav_path
                .to_str()
                .ok_or_else(|| "invalid wav path".to_string())?,
            "-r",
            "48000",
            HCS_FLUIDSYNTH_GM_SOUNDFONT_V1,
            midi_path
                .to_str()
                .ok_or_else(|| "invalid midi path".to_string())?,
        ])
        .output()
        .map_err(|err| format!("failed to start fluidsynth: {err}"))?;

    if !output.status.success() {
        return Err(format!(
            "FluidSynth render failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let wav_bytes = std::fs::metadata(&wav_path)
        .map_err(|err| format!("failed to stat rendered WAV: {err}"))?
        .len();

    let player_report = hcs_try_spawn_audio_player_v1(&wav_path);

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_FLUIDSYNTH_SOUNDFONT_PLAYBACK_ENGINE_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "soundfont": HCS_FLUIDSYNTH_GM_SOUNDFONT_V1,
        "runtime": "/usr/bin/fluidsynth",
        "title": score.title,
        "note_count": note_count,
        "instrument_assignments": instrument_report,
        "output_midi": midi_path,
        "output_wav": wav_path,
        "wav_bytes": wav_bytes,
        "os_playback": player_report,
        "pitch_authority": {
            "contract_id": HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID,
            "tuning_mode": "twelve_tone_equal_temperament",
            "a4_hz": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ,
            "a4_midi_note": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI,
            "simulated": false
        },
        "fallback_policy": {
            "web_audio_preview_is_fallback_only": true,
            "production_preview_uses_fluidsynth_soundfont": true
        },
        "authority_boundaries": {
            "mutates_current_hcs_score": false,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "uses_llm": false
        }
    }))
}

const HCS_COMPOSER_STUDIO_CANVAS_REBUILD_V1_CONTRACT_ID: &str =
    "aiweb.hfield.composer_studio_canvas_rebuild.v1";

#[tauri::command]
fn get_hcs_composer_studio_canvas_rebuild_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;
    let timeline = create_music_timeline_report(&guard);
    let notation = create_notation_layout_report(&guard);
    let score_hash = score_hash_hex(&guard).map_err(|err| format!("score hash failed: {err}"))?;

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_COMPOSER_STUDIO_CANVAS_REBUILD_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "purpose": "rebuild normal composer mode into a single musician-facing canvas with score, piano roll, keyboard, instrument rack, and inline Glass Reader preview",
        "title": guard.title,
        "score_hash": score_hash,
        "tempo_bpm": guard.music.tempo_bpm,
        "meter": guard.music.meter,
        "track_count": timeline.track_count,
        "note_count": timeline.total_note_count,
        "total_duration_ms": timeline.total_duration_ms,
        "music_timeline": timeline,
        "notation_layout": notation,
        "composer_canvas_policy": {
            "score_is_primary_canvas": true,
            "piano_roll_below_score": true,
            "keyboard_large_and_mouse_first": true,
            "instrument_rack_side_mixer": true,
            "glass_reader_preview_inline": true,
            "raw_json_hidden_from_normal_path": true,
            "soundfont_diagnostics_hidden_from_normal_path": true,
            "normal_path_is_not_developer_dashboard": true
        },
        "single_source_law": {
            "score_source": "current_score.music.tracks[*].notes",
            "keyboard_writes_score": true,
            "notation_renders_score": true,
            "piano_roll_renders_score": true,
            "instrument_rack_uses_tracks": true,
            "glass_reader_preview_uses_score_timeline": true
        },
        "authority_boundaries": {
            "mutates_current_hcs_score": false,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "changes_bundle_custody_semantics": false,
            "uses_llm": false
        }
    }))
}

const HCS_COMPOSER_FIRST_WORKFLOW_AND_SOUNDFONT_FOUNDATION_V1_CONTRACT_ID: &str =
    "aiweb.hfield.composer_first_workflow_and_soundfont_foundation.v1";

fn hcs_soundfont_file_status_v1(path: &str) -> serde_json::Value {
    let file_path = Path::new(path);
    let size_bytes = std::fs::metadata(file_path)
        .map(|metadata| metadata.len())
        .ok();
    json!({
        "path": path,
        "exists": file_path.is_file(),
        "size_bytes": size_bytes,
        "format": path.rsplit('.').next().unwrap_or("unknown")
    })
}

fn hcs_command_status_v1(binary: &str, args: &[&str]) -> serde_json::Value {
    match Command::new(binary).args(args).output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            json!({
                "binary": binary,
                "available": output.status.success(),
                "stdout": stdout,
                "stderr": stderr
            })
        }
        Err(err) => json!({
            "binary": binary,
            "available": false,
            "error": err.to_string()
        }),
    }
}

#[tauri::command]
fn get_hcs_composer_first_workflow_and_soundfont_foundation_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;
    let timeline = create_music_timeline_report(&guard);
    let score_hash = score_hash_hex(&guard).map_err(|err| format!("score hash failed: {err}"))?;

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_COMPOSER_FIRST_WORKFLOW_AND_SOUNDFONT_FOUNDATION_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "purpose": "unify HCS into a composer-first score workflow while surfacing the local FluidSynth/SoundFont foundation for sample-backed instruments",
        "title": guard.title,
        "score_hash": score_hash,
        "tempo_bpm": guard.music.tempo_bpm,
        "meter": guard.music.meter,
        "track_count": timeline.track_count,
        "note_count": timeline.total_note_count,
        "composer_workflow_policy": {
            "default_workspace": "composer",
            "raw_json_hidden_from_normal_path": true,
            "score_visible_first": true,
            "keyboard_directly_playable": true,
            "piano_roll_directly_editable_surface": true,
            "instrument_rack_inline_with_tracks": true,
            "advanced_import_available_but_collapsed": true,
            "reduced_primary_mode_rail": true
        },
        "soundfont_foundation": {
            "fluidsynth": hcs_command_status_v1("fluidsynth", &["--version"]),
            "soundfont_candidates": [
                hcs_soundfont_file_status_v1("/usr/share/sounds/sf2/FluidR3_GM.sf2"),
                hcs_soundfont_file_status_v1("/usr/share/sounds/sf2/FluidR3_GS.sf2")
            ],
            "sample_engine_status": "foundation_detected_next_patch_routes_playback",
            "current_web_audio_tones_are_fallback_only": true
        },
        "single_source_law": {
            "score_source": "current_score.music.tracks[*].notes",
            "notation_uses_same_source": true,
            "piano_roll_uses_same_source": true,
            "keyboard_writes_same_source": true,
            "instrument_choice_does_not_change_pitch_authority": true,
            "glass_reader_receives_same_score_chain": true
        },
        "authority_boundaries": {
            "mutates_current_hcs_score": false,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "changes_bundle_custody_semantics": false,
            "uses_llm": false
        }
    }))
}

const HCS_PRODUCTION_NOTATION_RENDER_SYNC_V1_CONTRACT_ID: &str =
    "aiweb.hfield.production_notation_render_sync.v1";

#[tauri::command]
fn get_hcs_production_notation_render_sync_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;
    let timeline = create_music_timeline_report(&guard);
    let notation = create_notation_layout_report(&guard);
    let playhead = Some(create_playhead_cursor_report(&guard, 0));
    let score_hash = score_hash_hex(&guard).map_err(|err| format!("score hash failed: {err}"))?;

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_PRODUCTION_NOTATION_RENDER_SYNC_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "purpose": "render notation directly from the same HCS score note data used by piano roll, virtual keyboard, deterministic audio, and Glass Reader field mapping",
        "title": guard.title,
        "score_hash": score_hash,
        "tempo_bpm": guard.music.tempo_bpm,
        "meter": guard.music.meter,
        "tuning_mode": guard.music.tuning_mode,
        "track_count": timeline.track_count,
        "note_count": timeline.total_note_count,
        "total_duration_ms": timeline.total_duration_ms,
        "music_timeline": timeline,
        "notation_layout": notation,
        "playhead_zero_sync": playhead,
        "sync_law": {
            "single_source_of_truth": "current_score.music.tracks[*].notes",
            "notation_shadow_state_allowed": false,
            "piano_roll_shadow_state_allowed": false,
            "virtual_keyboard_writes_score_notes": true,
            "notation_renders_score_notes": true,
            "score_import_updates_notation": true,
            "piano_roll_edits_update_notation": true,
            "playhead_timing_shared": true
        },
        "notation_surface": {
            "real_svg_staff_rendering": true,
            "measure_lines": true,
            "noteheads": true,
            "stems": true,
            "track_staves": true,
            "selected_note_highlight": true,
            "linked_timing": true,
            "generated_from_score_data": true,
            "placeholder_staff_visible_in_normal_path": false
        },
        "frequency_authority": {
            "contract_id": HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID,
            "tuning_mode": "twelve_tone_equal_temperament",
            "a4_hz": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ,
            "a4_midi_note": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI,
            "formula_id": "frequency_hz = 440 * 2^((midi_note - 69) / 12)",
            "simulated": false
        },
        "authority_boundaries": {
            "mutates_current_hcs_score": false,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "changes_bundle_custody_semantics": false,
            "uses_llm": false
        }
    }))
}

const HCS_VIRTUAL_KEYBOARD_AND_REALTIME_NOTE_ENTRY_V1_CONTRACT_ID: &str =
    "aiweb.hfield.virtual_keyboard_and_realtime_note_entry.v1";

#[tauri::command]
fn get_hcs_virtual_keyboard_and_realtime_note_entry_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;
    let timeline = create_music_timeline_report(&guard);
    let notation = create_notation_layout_report(&guard);
    let score_hash = score_hash_hex(&guard).map_err(|err| format!("score hash failed: {err}"))?;

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_VIRTUAL_KEYBOARD_AND_REALTIME_NOTE_ENTRY_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "purpose": "real-time virtual keyboard note entry backed by HCS score mutation and deterministic frequency authority",
        "score_hash": score_hash,
        "title": guard.title,
        "tempo_bpm": guard.music.tempo_bpm,
        "meter": guard.music.meter,
        "track_count": timeline.track_count,
        "note_count": timeline.total_note_count,
        "music_timeline": timeline,
        "notation_layout": notation,
        "input_surfaces": {
            "on_screen_piano_keyboard": true,
            "click_to_play_frequency_preview": true,
            "click_to_insert_score_note": true,
            "optional_computer_keyboard_mapping": true,
            "auto_advance_step_entry": true,
            "immediate_piano_roll_refresh": true,
            "immediate_track_lane_refresh": true,
            "immediate_field_refresh": true
        },
        "frequency_authority": {
            "contract_id": HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID,
            "tuning_mode": "twelve_tone_equal_temperament",
            "a4_hz": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ,
            "a4_midi_note": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI,
            "formula_id": "frequency_hz = 440 * 2^((midi_note - 69) / 12)",
            "simulated": false
        },
        "write_path": {
            "score_mutation_command": "set_hcs_piano_roll_note_v1",
            "target_payload": "current_score.music.tracks[*].notes",
            "reflects_in_piano_roll": true,
            "reflects_in_track_lanes": true,
            "reflects_in_notation_layout": true,
            "reflects_in_glass_reader_field": true
        },
        "authority_boundaries": {
            "mutates_current_hcs_score_only_when_insert_mode_enabled": true,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "changes_bundle_custody_semantics": false,
            "uses_llm": false
        }
    }))
}

const HCS_TRACK_EDITOR_AND_PIANO_ROLL_V1_CONTRACT_ID: &str =
    "aiweb.hfield.track_editor_and_piano_roll.v1";

#[derive(Debug, serde::Deserialize)]
struct HcsStudioScoreImportV1 {
    title: Option<String>,
    tempo_bpm: Option<f64>,
    meter: Option<String>,
    tuning_mode: Option<String>,
    tracks: Vec<HcsStudioTrackImportV1>,
}

#[derive(Debug, serde::Deserialize)]
struct HcsStudioTrackImportV1 {
    track_id: String,
    role: Option<String>,
    notes: Vec<HcsStudioNoteImportV1>,
}

#[derive(Debug, serde::Deserialize)]
struct HcsStudioNoteImportV1 {
    midi_note: Option<u8>,
    pitch: Option<String>,
    start_ms: Option<u32>,
    duration_ms: Option<u32>,
    start_beat: Option<f64>,
    duration_beats: Option<f64>,
    velocity: Option<f32>,
}

fn hcs_track_editor_report_v1(
    score: &FieldScore,
    action: &str,
) -> Result<serde_json::Value, String> {
    let timeline = create_music_timeline_report(score);
    let notation = create_notation_layout_report(score);
    let score_hash = score_hash_hex(score).map_err(|err| format!("score hash failed: {err}"))?;
    let track_summaries = timeline
        .tracks
        .iter()
        .map(|track| {
            json!({
                "track_id": track.track_id,
                "role": track.role,
                "note_count": track.note_count,
                "duration_ms": track.track_duration_ms,
                "duration_seconds": track.track_duration_seconds
            })
        })
        .collect::<Vec<_>>();

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_TRACK_EDITOR_AND_PIANO_ROLL_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "action": action,
        "title": score.title,
        "score_hash": score_hash,
        "tempo_bpm": score.music.tempo_bpm,
        "meter": score.music.meter,
        "tuning_mode": score.music.tuning_mode,
        "frequency_authority": {
            "contract_id": HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID,
            "tuning_mode": "twelve_tone_equal_temperament",
            "a4_hz": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ,
            "a4_midi_note": HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI,
            "formula_id": "frequency_hz = 440 * 2^((midi_note - 69) / 12)",
            "simulated": false
        },
        "track_count": timeline.track_count,
        "note_count": timeline.total_note_count,
        "total_duration_ms": timeline.total_duration_ms,
        "total_duration_seconds": timeline.total_duration_seconds,
        "track_summaries": track_summaries,
        "music_timeline": timeline,
        "notation_layout": notation,
        "normal_user_surfaces": [
            "Score Import Inbox",
            "Virtual Keyboard",
            "Piano Roll Grid",
            "Track Lane Editor",
            "Measure/Beat Entry",
            "Play Studio Mix",
            "Export Audio",
            "Save Project",
            "Seal Bundle v2"
        ],
        "placeholder_policy": {
            "composer_tool_dock_visible_in_normal_path": false,
            "notation_staff_placeholder_visible_in_normal_path": false,
            "raw_quick_note_buttons_visible_in_normal_path": false,
            "raw_gesture_button_pad_visible_in_normal_path": false,
            "score_import_is_backed": true,
            "piano_roll_grid_is_backed": true,
            "virtual_keyboard_is_backed": true,
            "track_lane_editor_is_backed": true
        },
        "score_import_contract": {
            "full_field_score_json_supported": true,
            "simple_studio_score_json_supported": true,
            "simple_format": {
                "title": "string optional",
                "tempo_bpm": "number optional",
                "meter": "string optional",
                "tracks": [
                    {
                        "track_id": "lead_voice | depth_voice | field_voice | custom_safe_id",
                        "role": "string optional",
                        "notes": [
                            {
                                "midi_note": "number 0-127 optional",
                                "pitch": "C4 style optional",
                                "start_beat": "number optional",
                                "duration_beats": "number optional",
                                "start_ms": "number optional",
                                "duration_ms": "number optional",
                                "velocity": "0.0-1.0 optional"
                            }
                        ]
                    }
                ]
            }
        },
        "authority_boundaries": {
            "mutates_current_hcs_score_only": true,
            "mutates_forge": false,
            "performs_identity_vault_write": false,
            "exports_private_identity": false,
            "changes_bundle_custody_semantics": false,
            "uses_llm": false
        }
    }))
}

fn hcs_pitch_label_to_midi_v1(label: &str) -> Option<u8> {
    let clean = label.trim();
    if clean.len() < 2 {
        return None;
    }

    let mut chars = clean.chars().peekable();
    let letter = chars.next()?.to_ascii_uppercase();
    let base = match letter {
        'C' => 0_i16,
        'D' => 2_i16,
        'E' => 4_i16,
        'F' => 5_i16,
        'G' => 7_i16,
        'A' => 9_i16,
        'B' => 11_i16,
        _ => return None,
    };

    let accidental = match chars.peek().copied() {
        Some('#') => {
            chars.next();
            1_i16
        }
        Some('b') | Some('B') => {
            chars.next();
            -1_i16
        }
        _ => 0_i16,
    };

    let octave_text = chars.collect::<String>();
    let octave = octave_text.parse::<i16>().ok()?;
    let midi = (octave + 1) * 12 + base + accidental;
    if (0..=127).contains(&midi) {
        Some(midi as u8)
    } else {
        None
    }
}

fn hcs_safe_track_id_v1(track_id: &str) -> Result<String, String> {
    let trimmed = track_id.trim();
    if trimmed.is_empty() {
        return Err("track_id cannot be empty".to_string());
    }
    let is_safe = trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-');
    if !is_safe {
        return Err(format!("track_id contains unsafe characters: {trimmed}"));
    }
    Ok(trimmed.to_string())
}

fn hcs_decode_studio_score_json_v1(score_json: &str) -> Result<(FieldScore, String), String> {
    if let Ok(score) = serde_json::from_str::<FieldScore>(score_json) {
        return Ok((score, "full_field_score_json".to_string()));
    }

    let parsed = serde_json::from_str::<HcsStudioScoreImportV1>(score_json)
        .map_err(|err| format!("score import failed. Expected full FieldScore JSON or HCS simple studio score JSON: {err}"))?;

    if parsed.tracks.is_empty() {
        return Err("score import requires at least one track".to_string());
    }

    let mut score = FieldScore::default_hcs();
    if let Some(title) = parsed.title {
        let trimmed = title.trim();
        if !trimmed.is_empty() {
            score.title = trimmed.to_string();
        }
    }

    if let Some(tempo_bpm) = parsed.tempo_bpm {
        if tempo_bpm.is_finite() {
            score.music.tempo_bpm = tempo_bpm.clamp(20.0, 240.0);
        }
    }
    if let Some(meter) = parsed.meter {
        let trimmed = meter.trim();
        if !trimmed.is_empty() {
            score.music.meter = trimmed.to_string();
        }
    }
    if let Some(tuning_mode) = parsed.tuning_mode {
        let trimmed = tuning_mode.trim();
        if !trimmed.is_empty() {
            score.music.tuning_mode = trimmed.to_string();
        }
    }

    let quarter_ms = if score.music.tempo_bpm <= 0.0 {
        714.0
    } else {
        60_000.0 / score.music.tempo_bpm
    };

    let mut tracks = Vec::new();
    for track in parsed.tracks {
        let track_id = hcs_safe_track_id_v1(&track.track_id)?;
        let role = track
            .role
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("imported_voice")
            .to_string();

        let mut next_start_ms = 0_u32;
        let mut notes = Vec::new();
        for note in track.notes {
            let midi_note = match (note.midi_note, note.pitch.as_deref()) {
                (Some(value), _) => value.min(127),
                (None, Some(label)) => hcs_pitch_label_to_midi_v1(label)
                    .ok_or_else(|| format!("invalid pitch label in {track_id}: {label}"))?,
                (None, None) => {
                    return Err(format!("note in {track_id} requires midi_note or pitch"))
                }
            };

            let start_ms = match (note.start_ms, note.start_beat) {
                (Some(value), _) => value,
                (None, Some(start_beat)) if start_beat.is_finite() => {
                    (start_beat.max(0.0) * quarter_ms).round() as u32
                }
                _ => next_start_ms,
            };

            let duration_ms = match (note.duration_ms, note.duration_beats) {
                (Some(value), _) => value.clamp(40, 60_000),
                (None, Some(duration_beats)) if duration_beats.is_finite() => {
                    ((duration_beats.max(0.125) * quarter_ms).round() as u32).clamp(40, 60_000)
                }
                _ => quarter_ms.round() as u32,
            };

            let velocity = note.velocity.unwrap_or(0.82).clamp(0.0, 1.0);
            next_start_ms = start_ms.saturating_add(duration_ms);
            notes.push(NoteEvent {
                midi_note,
                start_ms,
                duration_ms,
                velocity,
            });
        }
        notes.sort_by_key(|note| (note.start_ms, note.midi_note));
        tracks.push(MusicTrack {
            track_id,
            role,
            notes,
        });
    }

    score.music.tracks = tracks;
    Ok((score, "simple_studio_score_json".to_string()))
}

fn hcs_preset_score_v1(preset_id: &str) -> Result<FieldScore, String> {
    let mut score = FieldScore::default_hcs();
    score.music.tempo_bpm = 96.0;
    score.music.meter = "4/4".to_string();
    score.music.tuning_mode = "twelve_tone_equal_temperament".to_string();
    let q = (60_000.0 / score.music.tempo_bpm).round() as u32;
    let bar = q * 4;

    match preset_id {
        "empty_studio_score" => {
            score.title = "Empty Studio Score".to_string();
            for track in &mut score.music.tracks {
                track.notes.clear();
            }
        }
        "glass_reader_arpeggio" => {
            score.title = "Glass Reader Arpeggio".to_string();
            for track in &mut score.music.tracks {
                match track.track_id.as_str() {
                    "lead_voice" => {
                        track.notes = [60_u8, 64, 67, 72, 76, 72, 67, 64]
                            .iter()
                            .enumerate()
                            .map(|(index, midi_note)| NoteEvent {
                                midi_note: *midi_note,
                                start_ms: (index as u32) * q,
                                duration_ms: q,
                                velocity: 0.82,
                            })
                            .collect();
                    }
                    "depth_voice" => {
                        track.notes = vec![
                            NoteEvent {
                                midi_note: 36,
                                start_ms: 0,
                                duration_ms: bar * 2,
                                velocity: 0.52,
                            },
                            NoteEvent {
                                midi_note: 43,
                                start_ms: bar * 2,
                                duration_ms: bar * 2,
                                velocity: 0.48,
                            },
                        ];
                    }
                    "field_voice" => {
                        track.notes = vec![
                            NoteEvent {
                                midi_note: 55,
                                start_ms: 0,
                                duration_ms: bar * 4,
                                velocity: 0.22,
                            },
                            NoteEvent {
                                midi_note: 67,
                                start_ms: 0,
                                duration_ms: bar * 4,
                                velocity: 0.18,
                            },
                        ];
                    }
                    _ => {}
                }
            }
        }
        "midnight_sonnet_seed" => {
            score.title = "Midnight Sonnet Seed".to_string();
            score.music.tempo_bpm = 72.0;
            let q = (60_000.0 / score.music.tempo_bpm).round() as u32;
            let lead = [57_u8, 60, 64, 62, 60, 55, 57, 64, 67, 64, 62, 60];
            for track in &mut score.music.tracks {
                match track.track_id.as_str() {
                    "lead_voice" => {
                        track.notes = lead
                            .iter()
                            .enumerate()
                            .map(|(index, midi_note)| NoteEvent {
                                midi_note: *midi_note,
                                start_ms: (index as u32) * q,
                                duration_ms: q,
                                velocity: 0.76,
                            })
                            .collect();
                    }
                    "depth_voice" => {
                        track.notes = vec![
                            NoteEvent {
                                midi_note: 45,
                                start_ms: 0,
                                duration_ms: q * 4,
                                velocity: 0.44,
                            },
                            NoteEvent {
                                midi_note: 48,
                                start_ms: q * 4,
                                duration_ms: q * 4,
                                velocity: 0.42,
                            },
                            NoteEvent {
                                midi_note: 43,
                                start_ms: q * 8,
                                duration_ms: q * 4,
                                velocity: 0.40,
                            },
                        ];
                    }
                    "field_voice" => {
                        track.notes = vec![
                            NoteEvent {
                                midi_note: 52,
                                start_ms: 0,
                                duration_ms: q * 12,
                                velocity: 0.20,
                            },
                            NoteEvent {
                                midi_note: 64,
                                start_ms: 0,
                                duration_ms: q * 12,
                                velocity: 0.14,
                            },
                        ];
                    }
                    _ => {}
                }
            }
        }
        other => return Err(format!("unknown studio score preset: {other}")),
    }

    Ok(score)
}

#[tauri::command]
fn get_hcs_track_editor_and_piano_roll_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    hcs_track_editor_report_v1(&guard, "inspect")
}

#[tauri::command]
fn import_hcs_studio_score_json_v1(
    state: tauri::State<'_, AppState>,
    score_json: String,
) -> Result<serde_json::Value, String> {
    let (score, import_kind) = hcs_decode_studio_score_json_v1(&score_json)?;

    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;
    *guard = score;

    hcs_track_editor_report_v1(&guard, &format!("import_{import_kind}"))
}

#[tauri::command]
fn load_hcs_studio_score_preset_v1(
    state: tauri::State<'_, AppState>,
    preset_id: String,
) -> Result<serde_json::Value, String> {
    let score = hcs_preset_score_v1(&preset_id)?;

    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;
    *guard = score;

    hcs_track_editor_report_v1(&guard, &format!("load_preset_{preset_id}"))
}

#[tauri::command]
fn set_hcs_piano_roll_note_v1(
    state: tauri::State<'_, AppState>,
    track_id: String,
    step_index: u32,
    midi_note: u8,
    duration_steps: u32,
    velocity: f32,
    step_ms: u32,
) -> Result<serde_json::Value, String> {
    let safe_track_id = hcs_safe_track_id_v1(&track_id)?;
    let step_ms = step_ms.clamp(40, 8_000);
    let duration_steps = duration_steps.clamp(1, 64);
    let start_ms = step_index.saturating_mul(step_ms);
    let duration_ms = duration_steps.saturating_mul(step_ms).clamp(40, 60_000);
    let velocity = velocity.clamp(0.0, 1.0);

    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    let Some(track) = guard
        .music
        .tracks
        .iter_mut()
        .find(|track| track.track_id == safe_track_id)
    else {
        return Err(format!("music track not found: {safe_track_id}"));
    };

    track.notes.retain(|note| note.start_ms != start_ms);
    track.notes.push(NoteEvent {
        midi_note: midi_note.min(127),
        start_ms,
        duration_ms,
        velocity,
    });
    track
        .notes
        .sort_by_key(|note| (note.start_ms, note.midi_note));

    hcs_track_editor_report_v1(&guard, "set_piano_roll_note")
}

#[tauri::command]
fn clear_current_studio_score_v1(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    guard.title = "Untitled HCS Studio Score".to_string();
    for track in &mut guard.music.tracks {
        track.notes.clear();
    }

    hcs_track_editor_report_v1(&guard, "clear_score")
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

fn current_score_snapshot(state: &tauri::State<'_, AppState>) -> Result<FieldScore, String> {
    let guard = state
        .current_score
        .lock()
        .map_err(|_| "current score lock poisoned".to_string())?;

    Ok(guard.clone())
}

fn export_hfield_dir() -> Result<std::path::PathBuf, String> {
    let output_dir = app_root_dir().join("exports").join("hfield");
    std::fs::create_dir_all(&output_dir)
        .map_err(|err| format!("failed to create .hfield export directory: {err}"))?;
    Ok(output_dir)
}

fn unix_timestamp_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn sanitize_export_stem(input: &str) -> String {
    let mut cleaned = input
        .trim()
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>();

    while cleaned.contains("__") {
        cleaned = cleaned.replace("__", "_");
    }

    cleaned = cleaned.trim_matches('_').to_string();

    if cleaned.is_empty() {
        "hfield_reader_packet".to_string()
    } else {
        cleaned.chars().take(64).collect()
    }
}

fn export_file_name(score: &FieldScore, export_kind: &str, extension: &str) -> String {
    let stem = sanitize_export_stem(&score.title);
    let score_hash = score_hash_hex(score).unwrap_or_else(|_| "hash_unavailable".to_string());
    let short_hash = score_hash.chars().take(12).collect::<String>();
    let timestamp = unix_timestamp_seconds();

    format!("{stem}_{export_kind}_{short_hash}_{timestamp}.{extension}")
}

fn write_json_export_report(
    export_kind: &str,
    file_name: &str,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let output_dir = export_hfield_dir()?;
    let output_path = output_dir.join(file_name);

    let json_text = serde_json::to_string_pretty(&payload)
        .map_err(|err| format!("failed to serialize export JSON: {err}"))?;

    std::fs::write(&output_path, json_text.as_bytes())
        .map_err(|err| format!("failed to write export JSON: {err}"))?;

    let bytes = std::fs::read(&output_path)
        .map_err(|err| format!("failed to read export JSON after write: {err}"))?;
    let file_hash = blake3::hash(&bytes).to_hex().to_string();

    Ok(json!({
        "status": "ok",
        "export_kind": export_kind,
        "file_name": file_name,
        "output_path": output_path.to_string_lossy().to_string(),
        "export_dir": output_dir.to_string_lossy().to_string(),
        "bytes": bytes.len(),
        "file_hash": file_hash,
        "created_unix_seconds": unix_timestamp_seconds()
    }))
}

fn write_current_score_json_export(
    state: tauri::State<'_, AppState>,
    export_kind: &str,
    extension: &str,
    payload_builder: impl FnOnce(&FieldScore) -> Result<serde_json::Value, String>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    let payload = payload_builder(&score)?;
    let file_name = export_file_name(&score, export_kind, extension);
    write_json_export_report(export_kind, &file_name, payload)
}

fn app_relative_export_path(path: &std::path::Path) -> String {
    match path.strip_prefix(app_root_dir()) {
        Ok(relative) => relative.to_string_lossy().to_string(),
        Err(_) => path.to_string_lossy().to_string(),
    }
}

fn write_bundle_json_artifact(
    bundle_dir: &std::path::Path,
    file_name: &str,
    artifact_kind: &str,
    verification_role: &str,
    payload: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let output_path = bundle_dir.join(file_name);
    let json_text = serde_json::to_string_pretty(payload)
        .map_err(|err| format!("failed to serialize bundle JSON artifact {file_name}: {err}"))?;

    std::fs::write(&output_path, json_text.as_bytes())
        .map_err(|err| format!("failed to write bundle JSON artifact {file_name}: {err}"))?;

    let bytes = std::fs::read(&output_path)
        .map_err(|err| format!("failed to read bundle JSON artifact {file_name}: {err}"))?;
    let file_hash = blake3::hash(&bytes).to_hex().to_string();

    Ok(json!({
        "artifact_kind": artifact_kind,
        "verification_role": verification_role,
        "file_name": file_name,
        "output_path": output_path.to_string_lossy().to_string(),
        "relative_path": app_relative_export_path(&output_path),
        "bytes": bytes.len(),
        "blake3_hash": file_hash
    }))
}

fn write_bundle_wav_artifact(
    bundle_dir: &std::path::Path,
    file_name: &str,
    artifact_kind: &str,
    verification_role: &str,
    compiled: CompiledAudio,
) -> Result<serde_json::Value, String> {
    let output_path = bundle_dir.join(file_name);
    let summary = summarize_waveform(&compiled.samples);

    write_wav_i16(&output_path, &compiled)
        .map_err(|err| format!("failed to write bundle WAV artifact {file_name}: {err}"))?;

    let bytes = std::fs::read(&output_path)
        .map_err(|err| format!("failed to read bundle WAV artifact {file_name}: {err}"))?;
    let file_hash = blake3::hash(&bytes).to_hex().to_string();

    Ok(json!({
        "artifact_kind": artifact_kind,
        "verification_role": verification_role,
        "file_name": file_name,
        "output_path": output_path.to_string_lossy().to_string(),
        "relative_path": app_relative_export_path(&output_path),
        "bytes": bytes.len(),
        "blake3_hash": file_hash,
        "sample_rate_hz": compiled.sample_rate_hz,
        "sample_count": compiled.samples.len(),
        "duration_seconds": compiled.samples.len() as f64 / compiled.sample_rate_hz as f64,
        "waveform_summary": summary
    }))
}

fn read_hfield_replay_json_file(path: &std::path::Path) -> Result<serde_json::Value, String> {
    let bytes = std::fs::read(path)
        .map_err(|err| format!("failed to read replay JSON {}: {err}", path.display()))?;
    serde_json::from_slice(&bytes)
        .map_err(|err| format!("failed to parse replay JSON {}: {err}", path.display()))
}

fn read_hfield_replay_file_hash(path: &std::path::Path) -> Result<(String, usize), String> {
    let bytes = std::fs::read(path)
        .map_err(|err| format!("failed to read replay artifact {}: {err}", path.display()))?;
    Ok((blake3::hash(&bytes).to_hex().to_string(), bytes.len()))
}

fn json_str_field<'a>(value: &'a serde_json::Value, key: &str) -> Option<&'a str> {
    value.get(key).and_then(serde_json::Value::as_str)
}

fn json_bool_field(value: &serde_json::Value, key: &str) -> Option<bool> {
    value.get(key).and_then(serde_json::Value::as_bool)
}

fn push_hfield_replay_check(
    checks: &mut Vec<serde_json::Value>,
    failures: &mut Vec<String>,
    check_id: &str,
    passed: bool,
    detail: String,
) {
    if !passed {
        failures.push(format!("{check_id}: {detail}"));
    }

    checks.push(json!({
        "check_id": check_id,
        "passed": passed,
        "detail": detail
    }));
}

fn latest_hfield_canonical_bundle_manifest_path() -> Result<std::path::PathBuf, String> {
    let bundles_dir = export_hfield_dir()?.join("bundles");
    if !bundles_dir.exists() {
        return Err(format!(
            "bundle directory does not exist yet: {}. Export a canonical bundle manifest first.",
            bundles_dir.display()
        ));
    }

    let mut candidates: Vec<(std::time::SystemTime, std::path::PathBuf)> = Vec::new();
    for entry in std::fs::read_dir(&bundles_dir).map_err(|err| {
        format!(
            "failed to read bundle directory {}: {err}",
            bundles_dir.display()
        )
    })? {
        let entry = entry.map_err(|err| format!("failed to read bundle directory entry: {err}"))?;
        let path = entry.path().join("canonical_bundle_manifest.json");
        if path.is_file() {
            let modified = std::fs::metadata(&path)
                .and_then(|metadata| metadata.modified())
                .unwrap_or(std::time::UNIX_EPOCH);
            candidates.push((modified, path));
        }
    }

    candidates.sort_by_key(|right| std::cmp::Reverse(right.0));
    candidates
        .into_iter()
        .map(|(_, path)| path)
        .next()
        .ok_or_else(|| {
            format!(
                "no canonical_bundle_manifest.json files found under {}. Export a bundle first.",
                bundles_dir.display()
            )
        })
}

fn resolve_hfield_replay_artifact_path(
    manifest_dir: &std::path::Path,
    artifact: &serde_json::Value,
) -> Result<std::path::PathBuf, String> {
    let file_name = json_str_field(artifact, "file_name")
        .ok_or_else(|| "artifact missing file_name".to_string())?;
    let bundle_local_path = manifest_dir.join(file_name);

    if bundle_local_path.is_file() {
        return Ok(bundle_local_path);
    }

    if let Some(output_path) = json_str_field(artifact, "output_path") {
        let path = std::path::PathBuf::from(output_path);
        if path.is_file() {
            return Ok(path);
        }
    }

    Err(format!(
        "artifact file not found for {file_name}; checked {} and output_path fallback",
        bundle_local_path.display()
    ))
}

fn verify_hfield_canonical_bundle_manifest_file(
    manifest_path: &std::path::Path,
) -> Result<serde_json::Value, String> {
    let manifest = read_hfield_replay_json_file(manifest_path)?;
    let manifest_dir = manifest_path
        .parent()
        .ok_or_else(|| format!("manifest path has no parent: {}", manifest_path.display()))?;
    let (manifest_file_hash, manifest_file_bytes) = read_hfield_replay_file_hash(manifest_path)?;

    let mut checks: Vec<serde_json::Value> = Vec::new();
    let mut failures: Vec<String> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    push_hfield_replay_check(
        &mut checks,
        &mut failures,
        "manifest_contract_id",
        json_str_field(&manifest, "contract_id")
            == Some("aiweb.hfield.canonical_bundle_manifest.v1"),
        format!(
            "contract_id={}",
            json_str_field(&manifest, "contract_id").unwrap_or("<missing>")
        ),
    );

    let bundle_manifest_hash_ok = json_str_field(&manifest, "bundle_manifest_hash")
        .map(|hash| hash.len() == 64 && hash.chars().all(|ch| ch.is_ascii_hexdigit()))
        .unwrap_or(false);
    push_hfield_replay_check(
        &mut checks,
        &mut failures,
        "bundle_manifest_hash_present",
        bundle_manifest_hash_ok,
        "bundle_manifest_hash must be a 64-character BLAKE3 hex seed hash".to_string(),
    );

    let artifact_array = manifest
        .get("export_inventory")
        .and_then(serde_json::Value::as_array)
        .ok_or_else(|| "manifest export_inventory is missing or not an array".to_string())?;

    let expected_count = manifest
        .get("replay_verifier_fields")
        .and_then(|fields| fields.get("expected_artifact_count"))
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(8) as usize;

    push_hfield_replay_check(
        &mut checks,
        &mut failures,
        "expected_artifact_count",
        artifact_array.len() == expected_count,
        format!(
            "found {} artifacts; expected {expected_count}",
            artifact_array.len()
        ),
    );

    let required_kinds = [
        "canonical_project_json",
        "reader_bundle_json",
        "rust_render_manifest_json",
        "cymatic_reader_surface_json",
        "runtime_carrier_packet_json",
        "packet_contract_json",
        "identity_vault_reference_summary_json",
        "combined_audio_wav",
    ];

    let mut seen_kinds = std::collections::BTreeSet::new();
    let mut artifact_hashes = std::collections::BTreeMap::new();
    let mut artifact_paths = std::collections::BTreeMap::new();
    let mut artifact_reports = Vec::new();

    for artifact in artifact_array {
        let artifact_kind = json_str_field(artifact, "artifact_kind").unwrap_or("<missing>");
        let expected_hash = json_str_field(artifact, "blake3_hash").unwrap_or("<missing>");
        seen_kinds.insert(artifact_kind.to_string());

        match resolve_hfield_replay_artifact_path(manifest_dir, artifact) {
            Ok(path) => match read_hfield_replay_file_hash(&path) {
                Ok((actual_hash, bytes)) => {
                    let passed = actual_hash == expected_hash;
                    push_hfield_replay_check(
                        &mut checks,
                        &mut failures,
                        &format!("artifact_hash::{artifact_kind}"),
                        passed,
                        format!(
                            "{} expected={} actual={} bytes={bytes}",
                            path.display(),
                            expected_hash,
                            actual_hash
                        ),
                    );
                    artifact_hashes.insert(artifact_kind.to_string(), actual_hash.clone());
                    artifact_paths.insert(artifact_kind.to_string(), path.clone());
                    artifact_reports.push(json!({
                        "artifact_kind": artifact_kind,
                        "path": path.to_string_lossy().to_string(),
                        "expected_hash": expected_hash,
                        "actual_hash": actual_hash,
                        "bytes": bytes,
                        "hash_match": passed
                    }));
                }
                Err(err) => {
                    push_hfield_replay_check(
                        &mut checks,
                        &mut failures,
                        &format!("artifact_read::{artifact_kind}"),
                        false,
                        err,
                    );
                }
            },
            Err(err) => {
                push_hfield_replay_check(
                    &mut checks,
                    &mut failures,
                    &format!("artifact_path::{artifact_kind}"),
                    false,
                    err,
                );
            }
        }
    }

    for required_kind in required_kinds {
        push_hfield_replay_check(
            &mut checks,
            &mut failures,
            &format!("required_artifact::{required_kind}"),
            seen_kinds.contains(required_kind),
            format!("required artifact kind {required_kind} present"),
        );
    }

    let manifest_hash_fields = [
        ("canonical_project_json", "canonical_project_json_hash"),
        ("reader_bundle_json", "reader_bundle_json_hash"),
        (
            "rust_render_manifest_json",
            "rust_render_manifest_json_hash",
        ),
        ("cymatic_reader_surface_json", "cymatic_surface_json_hash"),
        (
            "runtime_carrier_packet_json",
            "runtime_carrier_packet_json_hash",
        ),
        ("packet_contract_json", "packet_contract_json_hash"),
        ("combined_audio_wav", "combined_wav_hash"),
    ];

    for (artifact_kind, manifest_field) in manifest_hash_fields {
        let manifest_hash = json_str_field(&manifest, manifest_field).unwrap_or("<missing>");
        let actual_hash = artifact_hashes
            .get(artifact_kind)
            .map(String::as_str)
            .unwrap_or("<missing>");
        push_hfield_replay_check(
            &mut checks,
            &mut failures,
            &format!("manifest_hash_field::{manifest_field}"),
            manifest_hash == actual_hash,
            format!("{manifest_field}={manifest_hash}; artifact {artifact_kind}={actual_hash}"),
        );
    }

    if let Some(canonical_project_path) = artifact_paths.get("canonical_project_json") {
        let canonical_project = read_hfield_replay_json_file(canonical_project_path)?;
        let score_value = canonical_project
            .get("score")
            .ok_or_else(|| "canonical_project.hfield.json missing score".to_string())?;
        let score: FieldScore = serde_json::from_value(score_value.clone()).map_err(|err| {
            format!(
                "failed to deserialize canonical score from {}: {err}",
                canonical_project_path.display()
            )
        })?;
        let (canonical_score, _) = canonicalized_hfield_score(&score);
        assert_hfield_packet_openable(&canonical_score)?;
        let recomputed_score_hash = score_hash_hex(&canonical_score)
            .map_err(|err| format!("failed to recompute canonical score hash: {err}"))?;
        let manifest_score_hash =
            json_str_field(&manifest, "source_hfield_score_hash").unwrap_or("<missing>");
        push_hfield_replay_check(
            &mut checks,
            &mut failures,
            "source_hfield_score_hash_recomputed",
            recomputed_score_hash == manifest_score_hash,
            format!(
                "manifest source_hfield_score_hash={manifest_score_hash}; recomputed={recomputed_score_hash}"
            ),
        );
    } else {
        push_hfield_replay_check(
            &mut checks,
            &mut failures,
            "source_hfield_score_hash_recomputed",
            false,
            "canonical_project_json artifact path unavailable".to_string(),
        );
    }

    if let Some(reader_bundle_path) = artifact_paths.get("reader_bundle_json") {
        let reader_bundle = read_hfield_replay_json_file(reader_bundle_path)?;
        let reader_score_hash = json_str_field(&reader_bundle, "score_hash").unwrap_or("<missing>");
        let manifest_score_hash =
            json_str_field(&manifest, "source_hfield_score_hash").unwrap_or("<missing>");
        push_hfield_replay_check(
            &mut checks,
            &mut failures,
            "reader_bundle_score_hash_matches_manifest",
            reader_score_hash == manifest_score_hash,
            format!("reader_bundle.score_hash={reader_score_hash}; manifest={manifest_score_hash}"),
        );
    } else {
        push_hfield_replay_check(
            &mut checks,
            &mut failures,
            "reader_bundle_score_hash_matches_manifest",
            false,
            "reader_bundle_json artifact path unavailable".to_string(),
        );
    }

    let authority_boundaries = manifest
        .get("authority_boundaries")
        .unwrap_or(&serde_json::Value::Null);
    let authority_expectations = [
        ("private_identity_export_disabled", true),
        ("public_identity_disabled", true),
        ("economic_processing_disabled", true),
        ("portable_rights_disabled", true),
        ("live_identity_vault_write_performed", false),
        ("forge_mutation_performed", false),
        ("forge_bridge_live_execution_authorized", false),
    ];

    for (field, expected) in authority_expectations {
        let actual = json_bool_field(authority_boundaries, field);
        push_hfield_replay_check(
            &mut checks,
            &mut failures,
            &format!("authority_boundary::{field}"),
            actual == Some(expected),
            format!("{field} actual={actual:?} expected={expected}"),
        );
    }

    if json_str_field(authority_boundaries, "forge_bridge_execution_mode") != Some("reference_only")
    {
        warnings.push("forge_bridge_execution_mode is not reference_only".to_string());
    }

    let status = if failures.is_empty() { "ok" } else { "failed" };

    Ok(json!({
        "status": status,
        "replay_verifier_contract_id": "aiweb.hfield.export_replay_verifier.v1",
        "verified_unix_seconds": unix_timestamp_seconds(),
        "manifest_path": manifest_path.to_string_lossy().to_string(),
        "manifest_file_hash": manifest_file_hash,
        "manifest_file_bytes": manifest_file_bytes,
        "bundle_id": manifest.get("bundle_id").cloned().unwrap_or(serde_json::Value::Null),
        "source_hfield_score_hash": manifest.get("source_hfield_score_hash").cloned().unwrap_or(serde_json::Value::Null),
        "expected_artifact_count": expected_count,
        "verified_artifact_count": artifact_reports.len(),
        "checks": checks,
        "artifact_reports": artifact_reports,
        "failures": failures,
        "warnings": warnings,
        "authority_result": {
            "no_private_identity_export_required": true,
            "no_live_identity_vault_write_required": true,
            "no_forge_mutation_required": true
        }
    }))
}

#[tauri::command]
fn verify_latest_hfield_export_replay_manifest_json() -> Result<serde_json::Value, String> {
    let manifest_path = latest_hfield_canonical_bundle_manifest_path()?;
    verify_hfield_canonical_bundle_manifest_file(&manifest_path)
}

#[tauri::command]
fn verify_hfield_export_replay_manifest_json_by_path(
    manifest_path: String,
) -> Result<serde_json::Value, String> {
    verify_hfield_canonical_bundle_manifest_file(&std::path::PathBuf::from(manifest_path))
}

fn hfield_schema_version_migration_registry_payload() -> serde_json::Value {
    json!({
        "status": "ok",
        "contract_id": "aiweb.hfield.schema_version_migration_registry.v1",
        "generated_unix_seconds": unix_timestamp_seconds(),
        "format_id": "aiweb.hfield",
        "current_schema_version": "0.1.0",
        "harmonic_field_score_contract_id": "aiweb.hfield.harmonic_field_score.v1",
        "coupling_profile_engine_contract_id": "aiweb.hfield.coupling_profile_engine.v1",
        "motif_library_annotation_layer_contract_id": "aiweb.hfield.motif_library_annotation_layer.v1",
        "deterministic_audio_engine_v2_contract_id": "aiweb.hfield.deterministic_audio_engine.v2",
        "true_conductor_gesture_reference_manifest_v1_contract_id": "aiweb.hfield.true_conductor_gesture_reference_manifest.v1",
        "gesture_aware_field_renderer_v2_contract_id": "aiweb.hfield.gesture_aware_field_renderer.v2",
        "cymatic_field_model_v2_contract_id": "aiweb.hfield.cymatic_field_model.v2",
        "syllable_shaped_expression_v1_contract_id": "aiweb.hfield.syllable_shaped_expression.v1",
        "sqlite_motif_project_library_v1_contract_id": "aiweb.hfield.sqlite_motif_project_library.v1",
        "production_packaging_v1_contract_id": "aiweb.hfield.production_packaging.v1",
        "ui_studio_workflow_triage_and_rebuild_v1_contract_id": "aiweb.hfield.ui_studio_workflow_triage_and_rebuild.v1",
        "desktop_launcher_studio_startup_fix_v1_contract_id": "aiweb.hfield.desktop_launcher_studio_startup_fix.v1",
        "studio_creation_backend_and_placeholder_purge_v1_contract_id": "aiweb.hfield.studio_creation_backend_and_placeholder_purge.v1",
        "track_editor_and_piano_roll_v1_contract_id": "aiweb.hfield.track_editor_and_piano_roll.v1",
        "key_frequency_registry_v1_contract_id": "aiweb.hfield.key_frequency_registry.v1",
        "virtual_keyboard_and_realtime_note_entry_v1_contract_id": "aiweb.hfield.virtual_keyboard_and_realtime_note_entry.v1",
        "production_notation_render_sync_v1_contract_id": "aiweb.hfield.production_notation_render_sync.v1",
        "instrument_rack_and_track_sound_v1_contract_id": "aiweb.hfield.instrument_rack_and_track_sound.v1",
        "composer_first_workflow_and_soundfont_foundation_v1_contract_id": "aiweb.hfield.composer_first_workflow_and_soundfont_foundation.v1",
        "composer_studio_canvas_rebuild_v1_contract_id": "aiweb.hfield.composer_studio_canvas_rebuild.v1",
        "fluidsynth_soundfont_playback_engine_v1_contract_id": "aiweb.hfield.fluidsynth_soundfont_playback_engine.v1",
        "waveform_to_3d_field_body_v1_contract_id": "aiweb.hfield.waveform_to_3d_field_body.v1",
        "current_packet_contract_id": "aiweb.hfield.packet_contract.v1",
        "canonical_bundle_manifest_contract_id": "aiweb.hfield.canonical_bundle_manifest.v1",
        "export_replay_verifier_contract_id": "aiweb.hfield.export_replay_verifier.v1",
        "schema_authority": {
            "source_object": ".hfield FieldScore",
            "meaning_bearing_object": "Harmonic Field Score",
            "renderings_are_downstream": true,
            "audio_is_not_source": true,
            "visuals_are_not_source": true,
            "forge_bridge_is_not_source": true,
            "identity_vault_reference_is_not_source": true
        },
        "version_policy": {
            "missing_format": "legacy_input_requires_canonicalization",
            "missing_version": "legacy_input_requires_canonicalization",
            "missing_packet_contract": "restore_default_packet_contract_then_validate",
            "invalid_phase_count": "reject",
            "private_identity_export_attempt": "reject",
            "live_identity_vault_write": "not_authorized_in_hcs_registry_v1",
            "forge_mutation": "not_authorized_in_hcs_registry_v1",
            "unknown_future_version": "read_only_reject_until_migrator_registered",
            "canonical_output_required_before_export": true,
            "replay_verification_required_for_bundle_trust": true
        },
        "supported_input_versions": [
            {
                "version_id": "legacy_unversioned",
                "status": "migration_supported",
                "accepts_missing_format": true,
                "accepts_missing_version": true,
                "accepts_missing_packet_contract": true,
                "canonical_target_version": "0.1.0",
                "required_gate": "canonicalized_hfield_score_then_assert_hfield_packet_openable"
            },
            {
                "version_id": "0.1.0",
                "status": "current",
                "accepts_missing_format": false,
                "accepts_missing_version": false,
                "accepts_missing_packet_contract": false,
                "canonical_target_version": "0.1.0",
                "required_gate": "assert_hfield_packet_openable"
            }
        ],
        "registered_migration_steps": [
            {
                "step_id": "legacy.restore_format_id",
                "from": "missing_or_legacy_format",
                "to": "aiweb.hfield",
                "authority": "hfield_packet canonicalization",
                "mutates_live_project": false,
                "requires_user_save_for_persistence": true
            },
            {
                "step_id": "legacy.restore_schema_version",
                "from": "missing_version",
                "to": "0.1.0",
                "authority": "hfield_packet canonicalization",
                "mutates_live_project": false,
                "requires_user_save_for_persistence": true
            },
            {
                "step_id": "legacy.restore_packet_contract",
                "from": "missing_packet_contract",
                "to": "aiweb.hfield.packet_contract.v1",
                "authority": "hfield_packet canonicalization",
                "mutates_live_project": false,
                "requires_user_save_for_persistence": true
            },
            {
                "step_id": "identity.reference_only_binding_preserved",
                "from": "unbound_or_reference_bound_identity_state",
                "to": "private_by_default_reference_only_state",
                "authority": "hfield_packet identity provenance contract",
                "mutates_live_identity_vault": false,
                "exports_private_identity": false
            }
        ],
        "required_post_migration_gates": [
            "assert_hfield_packet_openable",
            "validate_hfield_packet_contract",
            "score_hash_hex",
            "canonical_bundle_manifest_export_before_bundle_trust",
            "export_replay_verifier_before_bundle_acceptance"
        ],
        "explicit_non_authorities": {
            "does_not_authorize_forge_mutation": true,
            "does_not_authorize_identity_vault_live_write": true,
            "does_not_authorize_public_identity_export": true,
            "does_not_authorize_economic_processing": true,
            "does_not_authorize_portable_rights_transfer": true,
            "does_not_authorize_health_or_sensor_claims": true
        },
        "next_schema_registry_work": [
            "move registry into hfield-domain crate when schema surface stabilizes",
            "add file-level migrator unit tests for archived legacy .hfield examples",
            "add explicit future-version rejection fixture",
            "bind schema registry hash into canonical bundle manifest v2"
        ]
    })
}

fn hfield_schema_summary_from_value(value: &serde_json::Value) -> serde_json::Value {
    let packet_contract_id = value
        .get("packet_contract")
        .and_then(|packet_contract| json_str_field(packet_contract, "contract_id"))
        .or_else(|| json_str_field(value, "packet_contract"))
        .unwrap_or("<missing>");

    json!({
        "format": json_str_field(value, "format").unwrap_or("<missing>"),
        "version": json_str_field(value, "version").unwrap_or("<missing>"),
        "packet_contract_id": packet_contract_id,
        "title": json_str_field(value, "title").unwrap_or("<missing>")
    })
}

#[tauri::command]
fn get_hfield_schema_version_migration_registry_json() -> Result<serde_json::Value, String> {
    Ok(hfield_schema_version_migration_registry_payload())
}

#[tauri::command]
fn inspect_current_hfield_schema_migration_registry_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    let original_score_value = serde_json::to_value(&score)
        .map_err(|err| format!("failed to serialize current score for schema inspection: {err}"))?;
    let (canonical_score, migration_report) = canonicalized_hfield_score(&score);
    assert_hfield_packet_openable(&canonical_score)?;
    let canonical_score_value = serde_json::to_value(&canonical_score).map_err(|err| {
        format!("failed to serialize canonical score for schema inspection: {err}")
    })?;
    let canonical_score_hash = score_hash_hex(&canonical_score)
        .map_err(|err| format!("failed to hash canonical score for schema inspection: {err}"))?;
    let packet_contract = validate_hfield_packet_contract(&canonical_score);
    let identity_summary = summarize_hfield_identity_vault_reference_binding(&canonical_score);

    Ok(json!({
        "status": "ok",
        "contract_id": "aiweb.hfield.current_schema_migration_inspection.v1",
        "generated_unix_seconds": unix_timestamp_seconds(),
        "registry": hfield_schema_version_migration_registry_payload(),
        "original_score_schema": hfield_schema_summary_from_value(&original_score_value),
        "canonical_score_schema": hfield_schema_summary_from_value(&canonical_score_value),
        "migration_report": migration_report,
        "canonical_score_hash": canonical_score_hash,
        "packet_contract_gate": packet_contract,
        "identity_vault_reference_summary": identity_summary,
        "authority_boundaries": {
            "live_identity_vault_write_performed": false,
            "forge_mutation_performed": false,
            "private_identity_export_performed": false,
            "inspection_is_read_only": true
        },
        "registry_result": {
            "schema_registry_contract_locked": true,
            "current_score_canonicalizable": true,
            "current_score_packet_openable": true,
            "canonical_score_hash_available": true
        }
    }))
}

#[tauri::command]
fn get_current_nine_gesture_conductor_engine_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    serde_json::to_value(create_nine_gesture_conductor_engine_report(&score))
        .map_err(|err| format!("failed to serialize nine-gesture conductor engine report: {err}"))
}

#[tauri::command]
fn get_current_harmonic_field_score_v1_upgrade_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    serde_json::to_value(hfield_domain::create_harmonic_field_score_v1_upgrade_report(&score))
        .map_err(|err| format!("failed to serialize harmonic field score v1 upgrade report: {err}"))
}

#[tauri::command]
fn get_current_coupling_profile_engine_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    serde_json::to_value(hfield_domain::create_coupling_profile_engine_v1_report(
        &score,
    ))
    .map_err(|err| format!("failed to serialize coupling profile engine v1 report: {err}"))
}

#[tauri::command]
fn get_current_motif_library_annotation_layer_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    serde_json::to_value(hfield_domain::create_motif_library_annotation_layer_v1_report(&score))
        .map_err(|err| {
            format!("failed to serialize motif library annotation layer v1 report: {err}")
        })
}

#[tauri::command]
fn get_current_deterministic_audio_engine_v2_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    serde_json::to_value(create_deterministic_audio_engine_v2_report(&score, 48_000))
        .map_err(|err| format!("failed to serialize deterministic audio engine v2 report: {err}"))
}

#[tauri::command]
fn export_current_deterministic_audio_engine_v2_wav(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    let rendered = compile_deterministic_audio_engine_v2(&score, 48_000);
    Ok(write_rendered_wav_report(
        "hcs_deterministic_audio_engine_v2.wav",
        rendered.compiled,
    ))
}

#[tauri::command]
fn get_current_true_conductor_gesture_reference_manifest_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    serde_json::to_value(create_true_conductor_gesture_reference_manifest_v1_report(
        &score,
    ))
    .map_err(|err| {
        format!("failed to serialize true conductor gesture reference manifest v1 report: {err}")
    })
}

#[tauri::command]
fn export_current_true_conductor_gesture_reference_manifest_v1_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(
        state,
        "true_conductor_gesture_reference_manifest_v1",
        "json",
        |score| {
            serde_json::to_value(create_true_conductor_gesture_reference_manifest_v1_report(score))
                .map_err(|err| {
                    format!("failed to serialize true conductor gesture reference manifest v1 export: {err}")
                })
        },
    )
}

#[tauri::command]
fn get_current_gesture_aware_field_renderer_v2_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    serde_json::to_value(synthesize_gesture_aware_field_renderer_v2_report(&score))
        .map_err(|err| format!("failed to serialize gesture-aware field renderer v2 report: {err}"))
}

#[tauri::command]
fn export_current_gesture_aware_field_renderer_v2_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(state, "gesture_aware_field_renderer_v2", "json", |score| {
        serde_json::to_value(synthesize_gesture_aware_field_renderer_v2_report(score)).map_err(
            |err| format!("failed to serialize gesture-aware field renderer v2 export: {err}"),
        )
    })
}

#[tauri::command]
fn get_current_cymatic_field_model_v2_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    serde_json::to_value(synthesize_cymatic_field_model_v2_report(&score))
        .map_err(|err| format!("failed to serialize cymatic field model v2 report: {err}"))
}

#[tauri::command]
fn export_current_cymatic_field_model_v2_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(state, "cymatic_field_model_v2", "json", |score| {
        serde_json::to_value(synthesize_cymatic_field_model_v2_report(score))
            .map_err(|err| format!("failed to serialize cymatic field model v2 export: {err}"))
    })
}

#[tauri::command]
fn get_current_syllable_shaped_expression_v1_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    serde_json::to_value(create_syllable_shaped_expression_v1_report(&score))
        .map_err(|err| format!("failed to serialize syllable-shaped expression v1 report: {err}"))
}

#[tauri::command]
fn export_current_syllable_shaped_expression_v1_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(state, "syllable_shaped_expression_v1", "json", |score| {
        serde_json::to_value(create_syllable_shaped_expression_v1_report(score)).map_err(|err| {
            format!("failed to serialize syllable-shaped expression v1 export: {err}")
        })
    })
}

const HFIELD_CANONICAL_BUNDLE_MANIFEST_V2_CONTRACT_ID: &str =
    "aiweb.hfield.canonical_bundle_manifest.v2";
const HFIELD_CANONICAL_BUNDLE_MANIFEST_V2_PROFILE_ID: &str =
    "all_locked_hcs_layers_through_syllable_expression_v1";

fn hfield_bundle_v2_unix_timestamp_seconds() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}

fn hfield_bundle_v2_json_hash(value: &serde_json::Value) -> Result<String, String> {
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|err| format!("failed to serialize v2 bundle json for hash: {err}"))?;
    Ok(blake3::hash(&bytes).to_hex().to_string())
}

fn hfield_bundle_v2_score_hash(score: &FieldScore) -> Result<String, String> {
    let bytes = serde_json::to_vec_pretty(score)
        .map_err(|err| format!("failed to serialize .hfield score for v2 hash: {err}"))?;
    Ok(blake3::hash(&bytes).to_hex().to_string())
}

fn hfield_bundle_v2_write_json_artifact(
    bundle_dir: &std::path::Path,
    file_name: &str,
    artifact_kind: &str,
    verification_role: &str,
    payload: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    std::fs::create_dir_all(bundle_dir).map_err(|err| {
        format!(
            "failed to create v2 bundle dir {}: {err}",
            bundle_dir.display()
        )
    })?;
    let output_path = bundle_dir.join(file_name);
    let json_text = serde_json::to_string_pretty(payload)
        .map_err(|err| format!("failed to serialize v2 artifact {file_name}: {err}"))?;
    std::fs::write(&output_path, json_text.as_bytes()).map_err(|err| {
        format!(
            "failed to write v2 artifact {}: {err}",
            output_path.display()
        )
    })?;
    let hash = blake3::hash(json_text.as_bytes()).to_hex().to_string();
    Ok(serde_json::json!({
        "artifact_kind": artifact_kind,
        "verification_role": verification_role,
        "file_name": file_name,
        "relative_path": app_relative_export_path(&output_path),
        "absolute_path": output_path.to_string_lossy().to_string(),
        "byte_len": json_text.len(),
        "blake3_hash": hash,
        "format": "json",
        "required_for_replay": true
    }))
}

fn hfield_bundle_v2_artifact_payloads(
    score: &FieldScore,
) -> Result<Vec<(&'static str, &'static str, &'static str, serde_json::Value)>, String> {
    Ok(vec![
        (
            "canonical_project.hfield.json",
            "canonical_project_hfield_json",
            "source_harmonic_field_score",
            serde_json::to_value(score)
                .map_err(|err| format!("failed to serialize canonical score: {err}"))?,
        ),
        (
            "harmonic_field_score_v1_report.json",
            "harmonic_field_score_v1_report_json",
            "source_object_governance_report",
            serde_json::to_value(
                hfield_domain::create_harmonic_field_score_v1_upgrade_report(score),
            )
            .map_err(|err| format!("failed to serialize harmonic field score report: {err}"))?,
        ),
        (
            "coupling_profile_engine_v1_report.json",
            "coupling_profile_engine_v1_report_json",
            "source_to_renderer_coupling_report",
            serde_json::to_value(hfield_domain::create_coupling_profile_engine_v1_report(
                score,
            ))
            .map_err(|err| format!("failed to serialize coupling profile report: {err}"))?,
        ),
        (
            "motif_library_annotation_layer_v1_report.json",
            "motif_library_annotation_layer_v1_report_json",
            "motif_and_annotation_governance_report",
            serde_json::to_value(
                hfield_domain::create_motif_library_annotation_layer_v1_report(score),
            )
            .map_err(|err| format!("failed to serialize motif layer report: {err}"))?,
        ),
        (
            "nine_gesture_conductor_engine_v1_report.json",
            "nine_gesture_conductor_engine_v1_report_json",
            "gesture_vocabulary_and_physical_motion_law_report",
            serde_json::to_value(
                hfield_conductor::create_nine_gesture_conductor_engine_report(score),
            )
            .map_err(|err| format!("failed to serialize nine gesture report: {err}"))?,
        ),
        (
            "true_conductor_gesture_reference_manifest_v1.json",
            "true_conductor_gesture_reference_manifest_v1_json",
            "rust_owned_true_gesture_path_reference_manifest",
            serde_json::to_value(
                hfield_conductor::create_true_conductor_gesture_reference_manifest_v1_report(score),
            )
            .map_err(|err| format!("failed to serialize true gesture manifest: {err}"))?,
        ),
        (
            "deterministic_audio_engine_v2_report.json",
            "deterministic_audio_engine_v2_report_json",
            "deterministic_audio_receipt_report",
            serde_json::to_value(hfield_dsp::create_deterministic_audio_engine_v2_report(
                score, 48_000,
            ))
            .map_err(|err| format!("failed to serialize deterministic audio v2 report: {err}"))?,
        ),
        (
            "gesture_aware_field_renderer_v2_report.json",
            "gesture_aware_field_renderer_v2_report_json",
            "gesture_aware_3d_field_renderer_report",
            serde_json::to_value(
                hfield_field::synthesize_gesture_aware_field_renderer_v2_report(score),
            )
            .map_err(|err| format!("failed to serialize gesture-aware renderer report: {err}"))?,
        ),
        (
            "cymatic_reader_surface_v1_report.json",
            "cymatic_reader_surface_v1_report_json",
            "deterministic_cymatic_reader_surface_report",
            serde_json::to_value(hfield_cymatics::synthesize_hfield_cymatic_reader_surface(
                score,
            ))
            .map_err(|err| format!("failed to serialize cymatic reader surface report: {err}"))?,
        ),
        (
            "cymatic_field_model_v2_report.json",
            "cymatic_field_model_v2_report_json",
            "synthetic_cymatic_field_model_report",
            serde_json::to_value(hfield_cymatics::synthesize_cymatic_field_model_v2_report(
                score,
            ))
            .map_err(|err| format!("failed to serialize cymatic field model v2 report: {err}"))?,
        ),
        (
            "syllable_shaped_expression_v1_report.json",
            "syllable_shaped_expression_v1_report_json",
            "syllable_expression_envelope_report",
            serde_json::to_value(hfield_domain::create_syllable_shaped_expression_v1_report(
                score,
            ))
            .map_err(|err| format!("failed to serialize syllable expression report: {err}"))?,
        ),
    ])
}

#[tauri::command]
fn export_current_hfield_canonical_bundle_manifest_v2_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    let created_unix_seconds = hfield_bundle_v2_unix_timestamp_seconds();
    let source_hfield_score_hash = hfield_bundle_v2_score_hash(&score)?;
    let bundle_id = format!(
        "hfield_canonical_bundle_v2_{}_{}",
        created_unix_seconds,
        &source_hfield_score_hash[..12.min(source_hfield_score_hash.len())]
    );
    let bundle_dir = app_root_dir()
        .join("exports")
        .join("canonical_bundle_v2")
        .join(&bundle_id);

    let mut artifact_manifest = Vec::new();
    for (file_name, artifact_kind, verification_role, payload) in
        hfield_bundle_v2_artifact_payloads(&score)?
    {
        artifact_manifest.push(hfield_bundle_v2_write_json_artifact(
            &bundle_dir,
            file_name,
            artifact_kind,
            verification_role,
            &payload,
        )?);
    }

    let deterministic_audio_receipt_hash = artifact_manifest
        .iter()
        .find(|artifact| {
            artifact.get("artifact_kind")
                == Some(&serde_json::json!(
                    "deterministic_audio_engine_v2_report_json"
                ))
        })
        .and_then(|artifact| artifact.get("blake3_hash"))
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let gesture_renderer_receipt_hash = artifact_manifest
        .iter()
        .find(|artifact| {
            artifact.get("artifact_kind")
                == Some(&serde_json::json!(
                    "gesture_aware_field_renderer_v2_report_json"
                ))
        })
        .and_then(|artifact| artifact.get("blake3_hash"))
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let cymatic_model_receipt_hash = artifact_manifest
        .iter()
        .find(|artifact| {
            artifact.get("artifact_kind")
                == Some(&serde_json::json!("cymatic_field_model_v2_report_json"))
        })
        .and_then(|artifact| artifact.get("blake3_hash"))
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let syllable_expression_receipt_hash = artifact_manifest
        .iter()
        .find(|artifact| {
            artifact.get("artifact_kind")
                == Some(&serde_json::json!(
                    "syllable_shaped_expression_v1_report_json"
                ))
        })
        .and_then(|artifact| artifact.get("blake3_hash"))
        .cloned()
        .unwrap_or(serde_json::Value::Null);

    let no_live_identity_vault_write = score.provenance.identity_vault.vault_record_ref.is_none();
    let no_private_identity_export = !score.provenance.raw_private_identity_exported;
    let no_forge_mutation = score.packet.forge_bridge.status == "reserved"
        && score.packet.forge_bridge.forge_runtime_ref.is_none();

    let mut manifest_payload = serde_json::json!({
        "status": "ok",
        "contract_id": HFIELD_CANONICAL_BUNDLE_MANIFEST_V2_CONTRACT_ID,
        "manifest_contract_id": HFIELD_CANONICAL_BUNDLE_MANIFEST_V2_CONTRACT_ID,
        "profile_id": HFIELD_CANONICAL_BUNDLE_MANIFEST_V2_PROFILE_ID,
        "supersedes_contract_id": "aiweb.hfield.canonical_bundle_manifest.v1",
        "schema_version": "2.0.0",
        "export_kind": "canonical_bundle_manifest_v2",
        "bundle_id": bundle_id,
        "bundle_dir": bundle_dir.to_string_lossy().to_string(),
        "created_unix_seconds": created_unix_seconds,
        "source_hfield_score_hash": source_hfield_score_hash,
        "artifact_count": artifact_manifest.len(),
        "export_inventory": artifact_manifest,
        "artifact_contracts_bound": [
            "aiweb.hfield.harmonic_field_score.v1",
            "aiweb.hfield.coupling_profile_engine.v1",
            "aiweb.hfield.motif_library_annotation_layer.v1",
            "aiweb.hfield.nine_gesture_conductor_engine.v1",
            "aiweb.hfield.true_conductor_gesture_reference_manifest.v1",
            "aiweb.hfield.deterministic_audio_engine.v2",
            "aiweb.hfield.gesture_aware_field_renderer.v2",
            "aiweb.hfield.cymatic_field_model.v2",
            "aiweb.hfield.syllable_shaped_expression.v1"
        ],
        "receipt_hashes": {
            "deterministic_audio_engine_v2_report_hash": deterministic_audio_receipt_hash,
            "gesture_aware_field_renderer_v2_report_hash": gesture_renderer_receipt_hash,
            "cymatic_field_model_v2_report_hash": cymatic_model_receipt_hash,
            "syllable_shaped_expression_v1_report_hash": syllable_expression_receipt_hash
        },
        "authority_boundaries": {
            "harmonic_field_score_remains_source_authority": true,
            "bundle_manifest_is_source_authority": false,
            "bundle_manifest_is_replay_and_custody_receipt": true,
            "renderer_outputs_are_source_authority": false,
            "audio_outputs_are_source_authority": false,
            "syllable_shapes_are_language_semantics": false,
            "cymatic_outputs_are_physical_sensor_measurements": false,
            "private_identity_export_disabled": no_private_identity_export,
            "public_identity_disabled": score.provenance.disclosure_class == "private_reference_only",
            "economic_processing_disabled": true,
            "portable_rights_disabled": true,
            "live_identity_vault_write_performed": !no_live_identity_vault_write,
            "forge_mutation_performed": !no_forge_mutation,
            "forge_bridge_execution_mode": score.packet.forge_bridge.status.clone(),
            "forge_bridge_live_execution_authorized": false
        },
        "replay_verifier_fields": {
            "hash_algorithm": "BLAKE3",
            "artifact_inventory_field": "export_inventory",
            "artifact_hash_field": "blake3_hash",
            "manifest_hash_excludes_manifest_hash_field": true,
            "must_verify_artifact_count": true,
            "must_verify_all_artifact_hashes": true,
            "must_verify_no_private_identity_export": true,
            "must_verify_no_live_identity_vault_write": true,
            "must_verify_no_forge_mutation": true,
            "must_verify_no_physical_sensor_claim_without_calibration": true,
            "must_verify_no_language_semantics_from_syllable_shapes": true
        },
        "next_work": [
            "SQLite Motif/Project Library v1 stores local projects, motifs, receipts, and approval states after this bundle can seal itself.",
            "Production Packaging v1 produces Linux release artifacts and notices after storage has a local custody base.",
            "Forge Adapter v1 remains blocked until HCS sealed bundles replay cleanly."
        ],
        "warnings": []
    });

    let bundle_manifest_hash = hfield_bundle_v2_json_hash(&manifest_payload)?;
    manifest_payload["bundle_manifest_hash"] =
        serde_json::Value::String(bundle_manifest_hash.clone());

    let manifest_artifact = hfield_bundle_v2_write_json_artifact(
        &bundle_dir,
        "canonical_bundle_manifest_v2.json",
        "canonical_bundle_manifest_v2_json",
        "bundle_hash_inventory_and_replay_seed_v2",
        &manifest_payload,
    )?;

    Ok(serde_json::json!({
        "status": "ok",
        "export_kind": "canonical_bundle_manifest_v2",
        "manifest_contract_id": HFIELD_CANONICAL_BUNDLE_MANIFEST_V2_CONTRACT_ID,
        "bundle_id": manifest_payload["bundle_id"].clone(),
        "bundle_dir": bundle_dir.to_string_lossy().to_string(),
        "bundle_manifest_hash": bundle_manifest_hash,
        "manifest_file_hash": manifest_artifact["blake3_hash"].clone(),
        "manifest_file": manifest_artifact,
        "artifact_count": manifest_payload["artifact_count"].clone(),
        "artifact_manifest": manifest_payload["export_inventory"].clone(),
        "authority_boundaries": manifest_payload["authority_boundaries"].clone(),
        "replay_verifier_fields": manifest_payload["replay_verifier_fields"].clone(),
        "receipt_hashes": manifest_payload["receipt_hashes"].clone(),
        "next_work": manifest_payload["next_work"].clone()
    }))
}

const HCS_SQLITE_MOTIF_PROJECT_LIBRARY_V1_CONTRACT_ID: &str =
    "aiweb.hfield.sqlite_motif_project_library.v1";
const HCS_SQLITE_MOTIF_PROJECT_LIBRARY_V1_PROFILE_ID: &str =
    "local_project_motif_receipt_storage_v1";

fn hcs_sqlite_library_v1_db_path() -> Result<std::path::PathBuf, String> {
    let library_dir = app_root_dir().join("library");
    std::fs::create_dir_all(&library_dir)
        .map_err(|err| format!("failed to create HCS SQLite library directory: {err}"))?;
    Ok(library_dir.join("hcs_motif_project_library_v1.sqlite3"))
}

fn hcs_sqlite_library_v1_connect() -> Result<rusqlite::Connection, String> {
    let db_path = hcs_sqlite_library_v1_db_path()?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|err| {
        format!(
            "failed to open HCS SQLite library at {}: {err}",
            db_path.display()
        )
    })?;
    hcs_sqlite_library_v1_init_schema(&conn)?;
    Ok(conn)
}

fn hcs_sqlite_library_v1_init_schema(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS hcs_library_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_unix_seconds INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS hcs_projects (
            project_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            score_hash TEXT NOT NULL,
            score_json TEXT NOT NULL,
            music_track_count INTEGER NOT NULL,
            note_event_count INTEGER NOT NULL,
            conductor_event_count INTEGER NOT NULL,
            total_duration_ms INTEGER NOT NULL,
            score_byte_len INTEGER NOT NULL,
            actual_music_payload INTEGER NOT NULL,
            source_contract_id TEXT NOT NULL,
            custody_state TEXT NOT NULL,
            private_identity_exported INTEGER NOT NULL,
            forge_mutation_performed INTEGER NOT NULL,
            created_unix_seconds INTEGER NOT NULL,
            updated_unix_seconds INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_hcs_projects_updated ON hcs_projects(updated_unix_seconds DESC);
        CREATE INDEX IF NOT EXISTS idx_hcs_projects_score_hash ON hcs_projects(score_hash);
        CREATE TABLE IF NOT EXISTS hcs_motifs (
            motif_id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            motif_kind TEXT NOT NULL,
            source_score_hash TEXT NOT NULL,
            approval_state TEXT NOT NULL,
            motif_json TEXT NOT NULL,
            note_event_count INTEGER NOT NULL,
            gesture_event_count INTEGER NOT NULL,
            candidate_count INTEGER NOT NULL,
            created_unix_seconds INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_hcs_motifs_project ON hcs_motifs(project_id);
        CREATE INDEX IF NOT EXISTS idx_hcs_motifs_source_hash ON hcs_motifs(source_score_hash);
        CREATE TABLE IF NOT EXISTS hcs_receipts (
            receipt_id TEXT PRIMARY KEY,
            receipt_kind TEXT NOT NULL,
            source_score_hash TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            created_unix_seconds INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_hcs_receipts_source_hash ON hcs_receipts(source_score_hash);
        INSERT OR IGNORE INTO hcs_library_metadata(key, value, updated_unix_seconds)
        VALUES('contract_id', 'aiweb.hfield.sqlite_motif_project_library.v1', 0);
        "#,
    )
    .map_err(|err| format!("failed to initialize HCS SQLite library schema: {err}"))
}

fn hcs_sqlite_library_v1_now() -> i64 {
    unix_timestamp_seconds() as i64
}

fn hcs_sqlite_library_v1_note_event_count(score: &FieldScore) -> usize {
    score
        .music
        .tracks
        .iter()
        .map(|track| track.notes.len())
        .sum()
}

fn hcs_sqlite_library_v1_music_track_count(score: &FieldScore) -> usize {
    score.music.tracks.len()
}

fn hcs_sqlite_library_v1_conductor_event_count(score: &FieldScore) -> usize {
    score.conductor.primary_hand_track.events.len()
        + score
            .conductor
            .expressive_hand_track
            .as_ref()
            .map(|track| track.events.len())
            .unwrap_or(0)
}

fn hcs_sqlite_library_v1_total_duration_ms(score: &FieldScore) -> u32 {
    let music_end = score
        .music
        .tracks
        .iter()
        .flat_map(|track| track.notes.iter())
        .map(|note| note.start_ms.saturating_add(note.duration_ms))
        .max()
        .unwrap_or(0);
    let primary_end = score
        .conductor
        .primary_hand_track
        .events
        .iter()
        .map(|event| event.start_ms.saturating_add(event.duration_ms))
        .max()
        .unwrap_or(0);
    let expressive_end = score
        .conductor
        .expressive_hand_track
        .as_ref()
        .and_then(|track| {
            track
                .events
                .iter()
                .map(|event| event.start_ms.saturating_add(event.duration_ms))
                .max()
        })
        .unwrap_or(0);
    music_end.max(primary_end).max(expressive_end)
}

fn hcs_sqlite_library_v1_score_hash(score: &FieldScore) -> Result<String, String> {
    score_hash_hex(score).map_err(|err| format!("failed to hash score for SQLite library: {err}"))
}

fn hcs_sqlite_library_v1_project_id(score: &FieldScore) -> Result<String, String> {
    let score_hash = hcs_sqlite_library_v1_score_hash(score)?;
    let short_hash = score_hash.chars().take(16).collect::<String>();
    Ok(format!(
        "hcs_project_{}_{}",
        hcs_sqlite_library_v1_now(),
        short_hash
    ))
}

fn hcs_sqlite_count(conn: &rusqlite::Connection, sql: &str) -> Result<i64, String> {
    conn.query_row(sql, [], |row| row.get::<_, i64>(0))
        .map_err(|err| format!("failed SQLite count query `{sql}`: {err}"))
}

fn hcs_sqlite_library_v1_report_payload(
    conn: &rusqlite::Connection,
    last_action: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let db_path = hcs_sqlite_library_v1_db_path()?;
    let project_count = hcs_sqlite_count(conn, "SELECT COUNT(*) FROM hcs_projects")?;
    let motif_count = hcs_sqlite_count(conn, "SELECT COUNT(*) FROM hcs_motifs")?;
    let receipt_count = hcs_sqlite_count(conn, "SELECT COUNT(*) FROM hcs_receipts")?;
    let total_note_events = hcs_sqlite_count(
        conn,
        "SELECT COALESCE(SUM(note_event_count), 0) FROM hcs_projects",
    )?;
    let projects_with_actual_music = hcs_sqlite_count(
        conn,
        "SELECT COUNT(*) FROM hcs_projects WHERE actual_music_payload = 1",
    )?;

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_SQLITE_MOTIF_PROJECT_LIBRARY_V1_CONTRACT_ID,
        "profile_id": HCS_SQLITE_MOTIF_PROJECT_LIBRARY_V1_PROFILE_ID,
        "schema_version": "1.0.0",
        "db_path": db_path.to_string_lossy().to_string(),
        "storage_scope": {
            "stores_full_hfield_score_json": true,
            "stores_actual_music_tracks": true,
            "stores_note_events": true,
            "stores_conductor_events": true,
            "stores_motif_candidate_batches": true,
            "stores_local_custody_receipts": true,
            "stores_audio_binary_inside_sqlite": false,
            "audio_remains_deterministic_export_or_render_artifact": true
        },
        "actual_music_capacity": {
            "note_event_count_across_projects": total_note_events,
            "projects_with_actual_music_payload": projects_with_actual_music,
            "meaning": "SQLite stores the complete FieldScore JSON, including music.tracks[*].notes, so multi-track compositions can be saved and reopened instead of collapsing to a single monotone preview."
        },
        "counts": {
            "projects": project_count,
            "motif_batches": motif_count,
            "receipts": receipt_count
        },
        "authority_boundaries": {
            "sqlite_library_is_source_authority": false,
            "harmonic_field_score_remains_source_authority": true,
            "sqlite_library_is_local_storage_and_index": true,
            "private_identity_export_disabled": true,
            "live_identity_vault_write_performed": false,
            "forge_mutation_performed": false,
            "health_or_sensor_claim_authorized": false,
            "open_source_sqlite_is_storage_engine_not_hfield_authority": true
        },
        "last_action": last_action.unwrap_or(serde_json::Value::Null),
        "next_work": [
            "Production Packaging v1 should package the app without shipping user SQLite databases.",
            "Forge Adapter v1 remains blocked until sealed HFIELD bundles and local library receipts replay cleanly.",
            "Future library revisions may add search, tagging, and explicit user approval states for motif promotion."
        ]
    }))
}

#[tauri::command]
fn get_hcs_sqlite_motif_project_library_v1_report() -> Result<serde_json::Value, String> {
    let conn = hcs_sqlite_library_v1_connect()?;
    hcs_sqlite_library_v1_report_payload(
        &conn,
        Some(json!({
            "action": "inspect_library",
            "message": "SQLite library schema is initialized and ready for full HFIELD project storage."
        })),
    )
}

#[tauri::command]
fn save_current_hcs_sqlite_project_library_v1(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    let conn = hcs_sqlite_library_v1_connect()?;
    let project_id = hcs_sqlite_library_v1_project_id(&score)?;
    let score_hash = hcs_sqlite_library_v1_score_hash(&score)?;
    let score_json = serde_json::to_string_pretty(&score)
        .map_err(|err| format!("failed to serialize current score for SQLite library: {err}"))?;
    let now = hcs_sqlite_library_v1_now();
    let note_event_count = hcs_sqlite_library_v1_note_event_count(&score);
    let actual_music_payload = note_event_count > 0;
    let no_forge_mutation = score.packet.forge_bridge.status == "reserved"
        && score.packet.forge_bridge.forge_runtime_ref.is_none();

    conn.execute(
        r#"
        INSERT OR REPLACE INTO hcs_projects(
            project_id, title, score_hash, score_json, music_track_count, note_event_count,
            conductor_event_count, total_duration_ms, score_byte_len, actual_music_payload,
            source_contract_id, custody_state, private_identity_exported, forge_mutation_performed,
            created_unix_seconds, updated_unix_seconds
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
        "#,
        rusqlite::params![
            project_id,
            score.title,
            score_hash,
            score_json,
            hcs_sqlite_library_v1_music_track_count(&score) as i64,
            note_event_count as i64,
            hcs_sqlite_library_v1_conductor_event_count(&score) as i64,
            hcs_sqlite_library_v1_total_duration_ms(&score) as i64,
            serde_json::to_string(&score)
                .map_err(|err| format!("failed to measure serialized score size: {err}"))?
                .len() as i64,
            i64::from(actual_music_payload),
            score.format,
            score.provenance.custody_model,
            i64::from(score.provenance.raw_private_identity_exported),
            i64::from(!no_forge_mutation),
            now,
            now
        ],
    )
    .map_err(|err| format!("failed to save current project into SQLite library: {err}"))?;

    hcs_sqlite_library_v1_report_payload(
        &conn,
        Some(json!({
            "action": "save_current_project",
            "project_id": project_id,
            "score_hash": score_hash,
            "note_event_count": note_event_count,
            "actual_music_payload": actual_music_payload,
            "stored_full_field_score_json": true
        })),
    )
}

#[tauri::command]
fn list_hcs_sqlite_project_library_v1() -> Result<serde_json::Value, String> {
    let conn = hcs_sqlite_library_v1_connect()?;
    let db_path = hcs_sqlite_library_v1_db_path()?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT project_id, title, score_hash, music_track_count, note_event_count,
                   conductor_event_count, total_duration_ms, actual_music_payload,
                   created_unix_seconds, updated_unix_seconds
            FROM hcs_projects
            ORDER BY updated_unix_seconds DESC
            LIMIT 200
            "#,
        )
        .map_err(|err| format!("failed to prepare SQLite project list: {err}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "project_id": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "score_hash": row.get::<_, String>(2)?,
                "music_track_count": row.get::<_, i64>(3)?,
                "note_event_count": row.get::<_, i64>(4)?,
                "conductor_event_count": row.get::<_, i64>(5)?,
                "total_duration_ms": row.get::<_, i64>(6)?,
                "actual_music_payload": row.get::<_, i64>(7)? == 1,
                "created_unix_seconds": row.get::<_, i64>(8)?,
                "updated_unix_seconds": row.get::<_, i64>(9)?
            }))
        })
        .map_err(|err| format!("failed to query SQLite projects: {err}"))?;

    let mut projects = Vec::new();
    for row in rows {
        projects.push(row.map_err(|err| format!("failed to read SQLite project row: {err}"))?);
    }

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_SQLITE_MOTIF_PROJECT_LIBRARY_V1_CONTRACT_ID,
        "db_path": db_path.to_string_lossy().to_string(),
        "project_count": projects.len(),
        "projects": projects,
        "actual_music_supported": true
    }))
}

#[tauri::command]
fn open_hcs_sqlite_project_from_library_v1(
    state: tauri::State<'_, AppState>,
    project_id: String,
) -> Result<serde_json::Value, String> {
    let conn = hcs_sqlite_library_v1_connect()?;
    let (score_json, stored_hash): (String, String) = conn
        .query_row(
            "SELECT score_json, score_hash FROM hcs_projects WHERE project_id = ?1",
            rusqlite::params![project_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .map_err(|err| format!("failed to open SQLite project from library: {err}"))?;
    let score: FieldScore = serde_json::from_str(&score_json)
        .map_err(|err| format!("stored SQLite project is not valid FieldScore JSON: {err}"))?;
    let computed_hash = hcs_sqlite_library_v1_score_hash(&score)?;
    if computed_hash != stored_hash {
        return Err(format!(
            "stored project hash mismatch: stored {stored_hash}, computed {computed_hash}"
        ));
    }
    if score.provenance.raw_private_identity_exported {
        return Err(
            "refusing to open project with raw private identity export flag set".to_string(),
        );
    }

    {
        let mut guard = state
            .current_score
            .lock()
            .map_err(|_| "current score lock poisoned".to_string())?;
        *guard = score.clone();
    }

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_SQLITE_MOTIF_PROJECT_LIBRARY_V1_CONTRACT_ID,
        "action": "open_project_from_sqlite_library",
        "project_id": project_id,
        "score_hash": computed_hash,
        "title": score.title,
        "music_track_count": hcs_sqlite_library_v1_music_track_count(&score),
        "note_event_count": hcs_sqlite_library_v1_note_event_count(&score),
        "actual_music_payload": hcs_sqlite_library_v1_note_event_count(&score) > 0
    }))
}

#[tauri::command]
fn save_current_hcs_sqlite_motifs_v1(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    let conn = hcs_sqlite_library_v1_connect()?;
    let source_score_hash = hcs_sqlite_library_v1_score_hash(&score)?;
    let project_id = format!(
        "hcs_project_ref_{}",
        source_score_hash.chars().take(16).collect::<String>()
    );
    let motif_report = hfield_domain::create_motif_library_annotation_layer_v1_report(&score);
    let motif_value = serde_json::to_value(&motif_report)
        .map_err(|err| format!("failed to serialize motif report for SQLite library: {err}"))?;
    let candidate_count = motif_value
        .get("motif_candidates")
        .and_then(|value| value.as_array())
        .map(|array| array.len())
        .unwrap_or(0);
    let motif_json = serde_json::to_string_pretty(&motif_value)
        .map_err(|err| format!("failed to stringify motif report for SQLite library: {err}"))?;
    let now = hcs_sqlite_library_v1_now();
    let motif_id = format!(
        "hcs_motif_batch_{}_{}",
        now,
        source_score_hash.chars().take(16).collect::<String>()
    );

    conn.execute(
        r#"
        INSERT OR REPLACE INTO hcs_motifs(
            motif_id, project_id, motif_kind, source_score_hash, approval_state, motif_json,
            note_event_count, gesture_event_count, candidate_count, created_unix_seconds
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        "#,
        rusqlite::params![
            motif_id,
            project_id,
            "motif_candidate_batch_v1",
            source_score_hash,
            "discovery_candidate_batch",
            motif_json,
            hcs_sqlite_library_v1_note_event_count(&score) as i64,
            hcs_sqlite_library_v1_conductor_event_count(&score) as i64,
            candidate_count as i64,
            now
        ],
    )
    .map_err(|err| format!("failed to save motif batch into SQLite library: {err}"))?;

    hcs_sqlite_library_v1_report_payload(
        &conn,
        Some(json!({
            "action": "save_current_motif_candidates",
            "motif_id": motif_id,
            "source_score_hash": source_score_hash,
            "candidate_count": candidate_count,
            "approval_state": "discovery_candidate_batch"
        })),
    )
}

#[tauri::command]
fn list_hcs_sqlite_motifs_v1() -> Result<serde_json::Value, String> {
    let conn = hcs_sqlite_library_v1_connect()?;
    let db_path = hcs_sqlite_library_v1_db_path()?;
    let mut stmt = conn
        .prepare(
            r#"
            SELECT motif_id, project_id, motif_kind, source_score_hash, approval_state,
                   note_event_count, gesture_event_count, candidate_count, created_unix_seconds
            FROM hcs_motifs
            ORDER BY created_unix_seconds DESC
            LIMIT 200
            "#,
        )
        .map_err(|err| format!("failed to prepare SQLite motif list: {err}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "motif_id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "motif_kind": row.get::<_, String>(2)?,
                "source_score_hash": row.get::<_, String>(3)?,
                "approval_state": row.get::<_, String>(4)?,
                "note_event_count": row.get::<_, i64>(5)?,
                "gesture_event_count": row.get::<_, i64>(6)?,
                "candidate_count": row.get::<_, i64>(7)?,
                "created_unix_seconds": row.get::<_, i64>(8)?
            }))
        })
        .map_err(|err| format!("failed to query SQLite motifs: {err}"))?;

    let mut motifs = Vec::new();
    for row in rows {
        motifs.push(row.map_err(|err| format!("failed to read SQLite motif row: {err}"))?);
    }

    Ok(json!({
        "status": "ok",
        "contract_id": HCS_SQLITE_MOTIF_PROJECT_LIBRARY_V1_CONTRACT_ID,
        "db_path": db_path.to_string_lossy().to_string(),
        "motif_count": motifs.len(),
        "motifs": motifs
    }))
}

#[tauri::command]
fn save_current_hcs_sqlite_receipt_v1(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    let conn = hcs_sqlite_library_v1_connect()?;
    let source_score_hash = hcs_sqlite_library_v1_score_hash(&score)?;
    let payload = json!({
        "contract_id": HCS_SQLITE_MOTIF_PROJECT_LIBRARY_V1_CONTRACT_ID,
        "receipt_kind": "local_current_score_custody_receipt_v1",
        "source_score_hash": source_score_hash,
        "title": score.title,
        "music_track_count": hcs_sqlite_library_v1_music_track_count(&score),
        "note_event_count": hcs_sqlite_library_v1_note_event_count(&score),
        "conductor_event_count": hcs_sqlite_library_v1_conductor_event_count(&score),
        "total_duration_ms": hcs_sqlite_library_v1_total_duration_ms(&score),
        "actual_music_payload": hcs_sqlite_library_v1_note_event_count(&score) > 0,
        "private_identity_exported": score.provenance.raw_private_identity_exported,
        "live_identity_vault_write_performed": false,
        "forge_mutation_performed": false,
        "canonical_bundle_manifest_v2_expected": true
    });
    let payload_json = serde_json::to_string_pretty(&payload)
        .map_err(|err| format!("failed to serialize SQLite receipt payload: {err}"))?;
    let payload_hash = blake3::hash(payload_json.as_bytes()).to_hex().to_string();
    let now = hcs_sqlite_library_v1_now();
    let receipt_id = format!(
        "hcs_receipt_{}_{}",
        now,
        payload_hash.chars().take(16).collect::<String>()
    );

    conn.execute(
        r#"
        INSERT OR REPLACE INTO hcs_receipts(
            receipt_id, receipt_kind, source_score_hash, payload_json, payload_hash, created_unix_seconds
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#,
        rusqlite::params![
            receipt_id,
            "local_current_score_custody_receipt_v1",
            source_score_hash,
            payload_json,
            payload_hash,
            now
        ],
    )
    .map_err(|err| format!("failed to save SQLite custody receipt: {err}"))?;

    hcs_sqlite_library_v1_report_payload(
        &conn,
        Some(json!({
            "action": "save_current_receipt",
            "receipt_id": receipt_id,
            "payload_hash": payload_hash,
            "receipt_kind": "local_current_score_custody_receipt_v1"
        })),
    )
}

const HCS_STUDIO_CREATION_BACKEND_AND_PLACEHOLDER_PURGE_V1_CONTRACT_ID: &str =
    "aiweb.hfield.studio_creation_backend_and_placeholder_purge.v1";

#[tauri::command]
fn get_hcs_studio_creation_backend_and_placeholder_purge_v1_report() -> serde_json::Value {
    json!({
        "status": "ok",
        "contract_id": HCS_STUDIO_CREATION_BACKEND_AND_PLACEHOLDER_PURGE_V1_CONTRACT_ID,
        "schema_version": "1.0.0",
        "workflow_role": "production studio creation surface cleanup and backed-tool inventory for Harmonic Conductor Studio",
        "visible_user_workflow": [
            "Open Project",
            "Create/Edit Music",
            "Play Studio Mix",
            "View 3D Glass Reader Field",
            "Save Project",
            "Seal Bundle v2",
            "Export Audio"
        ],
        "production_backed_tools": {
            "score_timeline": {
                "visible": true,
                "backing": ["get_current_music_timeline", "get_current_notation_layout", "get_current_playhead_cursor_report"],
                "status": "production-backed timeline/track/cursor reader"
            },
            "piano_roll_grid": {
                "visible": true,
                "backing": ["music.tracks[*].notes", "select_current_notation_note", "edit_current_notation_note", "delete_current_notation_note"],
                "status": "production-backed note selection and editing surface"
            },
            "track_lane_editor": {
                "visible": true,
                "backing": ["append_note_to_current_track", "clear_current_music_track", "reset_current_music_to_seed"],
                "status": "production-backed track lane control"
            },
            "measure_beat_editor": {
                "visible": true,
                "backing": ["position_current_notation_note_measure_beat", "position_current_notation_note_start_ms", "nudge_current_notation_note_beats"],
                "status": "production-backed timing editor"
            },
            "conductor_cue_lane": {
                "visible": true,
                "backing": ["get_current_gesture_timeline", "apply_generated_conductor_mapping_to_current_score", "get_current_conductor_motion_report"],
                "status": "production-backed cue lane and motion mapping"
            },
            "deterministic_audio_export": {
                "visible": true,
                "backing": ["play_current_project_combined_audio", "render_current_project_combined_wav", "export_current_deterministic_audio_engine_v2_wav"],
                "status": "production-backed playback and WAV export"
            },
            "local_library": {
                "visible": true,
                "backing": ["save_current_hcs_sqlite_project_library_v1", "list_hcs_sqlite_project_library_v1", "open_hcs_sqlite_project_from_library_v1"],
                "status": "production-backed SQLite project storage"
            },
            "bundle_v2_sealing": {
                "visible": true,
                "backing": ["export_current_hfield_canonical_bundle_manifest_v2_json", "verify_latest_hfield_export_replay_manifest_json"],
                "status": "production-backed custody and replay seal"
            }
        },
        "hidden_or_advanced_only": [
            "Composer Tool Dock placeholder card",
            "Professional Score Tools placeholder card",
            "Notation Staff placeholder",
            "Palette placeholder",
            "Mixer placeholder",
            "Import/Export placeholder",
            "Shortcuts placeholder",
            "legacy Export Bundle Manifest v1",
            "raw JSON/export diagnostic wall",
            "raw g1-g9 button pad"
        ],
        "legacy_surfaces": {
            "bundle_manifest_v1": "advanced/debug only; Bundle Manifest v2 is the normal seal path",
            "project_file_name_entry": "advanced file fallback only; SQLite library and Bundle Manifest v2 are the normal project path",
            "quick_note_buttons": "hidden from normal composer flow; note creation uses the backed note editor entry path",
            "raw_gesture_buttons": "hidden from normal conductor flow; conductor cue lane and mapping remain visible"
        },
        "open_source_dependency_policy": {
            "new_dependencies_added_in_this_patch": [],
            "reason": "Current locked Rust/Tauri stack already backs the visible studio workflow. Future MIDI/MusicXML/audio-engine upgrades may add open-source libraries in separate audited patches.",
            "future_allowed_categories": ["MIDI import/export", "MusicXML import/export", "advanced piano-roll editing", "DAW-style mixer buses", "notation engraving"]
        },
        "authority_boundaries": {
            "studio_creation_backend_is_source_authority": false,
            "studio_creation_backend_is_forge_authority": false,
            "studio_creation_backend_mutates_forge": false,
            "studio_creation_backend_performs_identity_vault_write": false,
            "studio_creation_backend_exports_private_identity": false,
            "studio_creation_backend_changes_hfield_custody_semantics": false,
            "hidden_diagnostics_remain_available_in_advanced": true,
            "visible_tools_must_be_backed_by_commands_or_locked_reports": true
        },
        "readiness_gates": {
            "no_placeholder_cards_in_normal_user_flow": true,
            "notation_staff_placeholder_hidden": true,
            "piano_roll_grid_uses_real_music_tracks": true,
            "measure_beat_editor_uses_rust_commands": true,
            "save_open_seal_export_audio_normalized": true,
            "advanced_diagnostics_still_available": true
        },
        "next_work": [
            "Build full project browser/open-by-project-id UI on top of SQLite v1.",
            "Build real MIDI import/export after selecting audited open-source dependency path.",
            "Build advanced mixer buses only after deterministic audio engine exposes mix parameters."
        ]
    })
}

const HCS_PRODUCTION_PACKAGING_V1_CONTRACT_ID: &str = "aiweb.hfield.production_packaging.v1";
const HCS_PRODUCTION_PACKAGING_V1_PROFILE_ID: &str =
    "tauri_linux_release_notices_and_verification_v1";

#[tauri::command]
fn get_hcs_production_packaging_v1_report() -> serde_json::Value {
    let repo_root = app_root_dir();
    let release_script = repo_root.join("scripts/release/hcs_production_packaging_v1_build.sh");
    let verify_script = repo_root.join("scripts/release/hcs_production_packaging_v1_verify.sh");
    let notices_dir = repo_root.join("packaging/hcs_production_packaging_v1");
    let release_dir = repo_root.join("release/hcs_production_packaging_v1");
    json!({
        "status": "ok",
        "contract_id": HCS_PRODUCTION_PACKAGING_V1_CONTRACT_ID,
        "profile_id": HCS_PRODUCTION_PACKAGING_V1_PROFILE_ID,
        "schema_version": "1.0.0",
        "packaging_role": "governed local-first production release path for Harmonic Conductor Studio after HCS sealed bundles and SQLite custody storage are locked",
        "expected_locked_base": {
            "commit": "b4da198",
            "message": "Add SQLite Motif Project Library v1"
        },
        "release_targets": {
            "linux_deb": {
                "enabled": true,
                "tauri_expected_path_glob": "src-tauri/target/release/bundle/deb/*.deb",
                "purpose": "Ubuntu/Debian installable package"
            },
            "linux_appimage": {
                "enabled": true,
                "tauri_expected_path_glob": "src-tauri/target/release/bundle/appimage/*.AppImage",
                "purpose": "portable Linux application image"
            },
            "windows_msi_or_nsis": {
                "enabled": false,
                "reason": "reserved for a later OS-specific packaging patch"
            },
            "macos_dmg": {
                "enabled": false,
                "reason": "reserved for a later OS-specific packaging patch"
            }
        },
        "release_scripts": {
            "build_script": app_relative_export_path(&release_script),
            "verify_script": app_relative_export_path(&verify_script),
            "npm_build_script": "release:hcs:v1",
            "npm_verify_script": "verify:release:hcs:v1"
        },
        "notices": {
            "notice_file": app_relative_export_path(&notices_dir.join("NOTICE.txt")),
            "release_checklist": app_relative_export_path(&notices_dir.join("RELEASE_CHECKLIST.md")),
            "third_party_notice_policy": "package manager lockfiles and Tauri/Rust/npm metadata must be used to produce final third-party notices before public distribution"
        },
        "release_artifact_policy": {
            "release_dir": app_relative_export_path(&release_dir),
            "hash_algorithm": "SHA256 for distributable binaries and BLAKE3 remains used inside HFIELD custody reports",
            "must_generate_release_manifest": true,
            "must_record_git_commit": true,
            "must_record_toolchain_versions": true,
            "must_record_bundle_manifest_v2_hash": true,
            "must_verify_no_user_sqlite_database_is_shipped": true,
            "must_verify_no_private_exports_are_shipped": true,
            "must_verify_no_development_target_directory_is_shipped": true
        },
        "excluded_from_distribution": [
            "library/hcs_motif_project_library_v1.sqlite3",
            "library/*.sqlite3-*",
            "exports/**",
            "projects/**",
            "*.hfield.tmp",
            "target/debug/**",
            "node_modules/**",
            "local proof files under /home/nic/Downloads"
        ],
        "required_pre_release_gates": [
            "cargo fmt --all --check",
            "cargo test --workspace",
            "cargo clippy --workspace --all-targets -- -D warnings",
            "npm run typecheck",
            "npm run build",
            "npm run tauri info",
            "npm run tauri build",
            "verify .deb/AppImage hashes and release inventory",
            "verify canonical bundle manifest v2 can be exported before public release"
        ],
        "authority_boundaries": {
            "packaging_is_source_authority": false,
            "packaging_is_forge_authority": false,
            "packaging_mutates_forge": false,
            "packaging_performs_identity_vault_write": false,
            "packaging_exports_private_identity": false,
            "packaging_authorizes_health_or_sensor_claims": false,
            "packaging_includes_user_sqlite_library": false,
            "packaging_includes_user_hfield_exports_by_default": false,
            "hfield_canonical_bundle_manifest_v2_remains_release_custody_seed": true
        },
        "readiness_gates": {
            "sealed_bundle_v2_locked": true,
            "sqlite_library_locked": true,
            "linux_release_path_defined": true,
            "notices_defined": true,
            "verification_script_defined": true,
            "forge_adapter_still_blocked_until_release_and_replay_are_clean": true
        },
        "next_work": [
            "Run npm run release:hcs:v1 when ready to generate .deb/AppImage artifacts on Proto-forge.",
            "Run npm run verify:release:hcs:v1 after release artifacts exist.",
            "Proceed to Forge Adapter v1 only after packaging and sealed-bundle replay remain clean."
        ]
    })
}

#[tauri::command]
fn export_current_hfield_project_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(state, "canonical_project", "hfield.json", |score| {
        let (canonical_score, migration_report) = canonicalized_hfield_score(score);
        assert_hfield_packet_openable(&canonical_score)?;

        Ok(json!({
            "contract_id": "aiweb.hfield.export.canonical_project.v1",
            "export_kind": "canonical_project",
            "migration_report": migration_report,
            "score": canonical_score
        }))
    })
}

#[tauri::command]
fn export_current_hfield_packet_contract_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(state, "packet_contract", "json", |score| {
        serde_json::to_value(validate_hfield_packet_contract(score))
            .map_err(|err| format!("packet contract export serialization failed: {err}"))
    })
}

#[tauri::command]
fn export_current_hfield_runtime_carrier_packet_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(state, "runtime_carrier_packet", "json", |score| {
        serde_json::to_value(synthesize_hfield_runtime_carrier_packet_model(score))
            .map_err(|err| format!("runtime carrier packet export serialization failed: {err}"))
    })
}

#[tauri::command]
fn export_current_hfield_cymatic_surface_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(state, "cymatic_reader_surface", "json", |score| {
        serde_json::to_value(synthesize_hfield_cymatic_reader_surface(score))
            .map_err(|err| format!("cymatic surface export serialization failed: {err}"))
    })
}

#[tauri::command]
fn export_current_hfield_rust_render_manifest_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(state, "rust_render_manifest", "json", |score| {
        serde_json::to_value(create_hfield_rust_render_manifest(score))
            .map_err(|err| format!("rust render manifest export serialization failed: {err}"))
    })
}

#[tauri::command]
fn export_current_hfield_reader_bundle_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    write_current_score_json_export(state, "reader_bundle", "json", |score| {
        let (canonical_score, migration_report) = canonicalized_hfield_score(score);
        assert_hfield_packet_openable(&canonical_score)?;

        Ok(json!({
            "contract_id": "aiweb.hfield.reader_export_bundle.v1",
            "export_kind": "reader_bundle",
            "score_hash": score_hash_hex(&canonical_score)
                .unwrap_or_else(|_| "hash_unavailable".to_string()),
            "title": canonical_score.title,
            "format": canonical_score.format,
            "version": canonical_score.version,
            "migration_report": migration_report,
            "packet_contract": validate_hfield_packet_contract(&canonical_score),
            "runtime_carrier_packet": synthesize_hfield_runtime_carrier_packet_model(&canonical_score),
            "cymatic_reader_surface": synthesize_hfield_cymatic_reader_surface(&canonical_score),
            "rust_render_manifest": create_hfield_rust_render_manifest(&canonical_score),
            "field_synthesis": synthesize_hfield_field(&canonical_score),
            "forge_bridge_stub": create_forge_packet_bridge_stub_report(&canonical_score)
        }))
    })
}

#[tauri::command]
fn export_current_hfield_combined_wav(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    let compiled = compile_combined_music_and_conductor_preview(&score, 48_000);
    let file_name = export_file_name(&score, "combined_audio", "wav");
    Ok(write_rendered_wav_report(&file_name, compiled))
}

#[tauri::command]
fn export_current_hfield_canonical_bundle_manifest_json(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let score = current_score_snapshot(&state)?;
    let (canonical_score, migration_report) = canonicalized_hfield_score(&score);
    assert_hfield_packet_openable(&canonical_score)?;

    let source_score_hash = score_hash_hex(&canonical_score)
        .map_err(|err| format!("canonical score hash failed: {err}"))?;
    let short_hash = source_score_hash.chars().take(12).collect::<String>();
    let created_unix_seconds = unix_timestamp_seconds();
    let bundle_id = format!(
        "{}_canonical_bundle_{}_{}",
        sanitize_export_stem(&canonical_score.title),
        short_hash,
        created_unix_seconds
    );
    let bundle_dir = export_hfield_dir()?.join("bundles").join(&bundle_id);
    std::fs::create_dir_all(&bundle_dir)
        .map_err(|err| format!("failed to create canonical bundle directory: {err}"))?;

    let packet_contract = validate_hfield_packet_contract(&canonical_score);
    let identity_summary = summarize_hfield_identity_vault_reference_binding(&canonical_score);
    let runtime_carrier = synthesize_hfield_runtime_carrier_packet_model(&canonical_score);
    let cymatic_surface = synthesize_hfield_cymatic_reader_surface(&canonical_score);
    let rust_render_manifest = create_hfield_rust_render_manifest(&canonical_score);
    let field_synthesis = synthesize_hfield_field(&canonical_score);
    let forge_bridge_stub = create_forge_packet_bridge_stub_report(&canonical_score);

    let canonical_project_payload = json!({
        "contract_id": "aiweb.hfield.export.canonical_project.v1",
        "export_kind": "canonical_project",
        "migration_report": migration_report,
        "score": canonical_score
    });

    let reader_bundle_payload = json!({
        "contract_id": "aiweb.hfield.reader_export_bundle.v1",
        "export_kind": "reader_bundle",
        "score_hash": source_score_hash,
        "title": canonical_project_payload["score"]["title"].clone(),
        "format": canonical_project_payload["score"]["format"].clone(),
        "version": canonical_project_payload["score"]["version"].clone(),
        "packet_contract": packet_contract,
        "identity_vault_reference_summary": identity_summary,
        "runtime_carrier_packet": runtime_carrier,
        "cymatic_reader_surface": cymatic_surface,
        "rust_render_manifest": rust_render_manifest,
        "field_synthesis": field_synthesis,
        "forge_bridge_stub": forge_bridge_stub
    });

    let mut artifacts = vec![
        write_bundle_json_artifact(
            &bundle_dir,
            "canonical_project.hfield.json",
            "canonical_project_json",
            "source_score_canonicalization_and_hash_verification",
            &canonical_project_payload,
        )?,
        write_bundle_json_artifact(
            &bundle_dir,
            "reader_bundle.json",
            "reader_bundle_json",
            "portable_reader_bundle_replay_input",
            &reader_bundle_payload,
        )?,
        write_bundle_json_artifact(
            &bundle_dir,
            "rust_render_manifest.json",
            "rust_render_manifest_json",
            "renderer_geometry_and_coordinate_verification",
            &reader_bundle_payload["rust_render_manifest"],
        )?,
        write_bundle_json_artifact(
            &bundle_dir,
            "cymatic_reader_surface.json",
            "cymatic_reader_surface_json",
            "score_synthesized_cymatic_surface_verification",
            &reader_bundle_payload["cymatic_reader_surface"],
        )?,
        write_bundle_json_artifact(
            &bundle_dir,
            "runtime_carrier_packet.json",
            "runtime_carrier_packet_json",
            "carrier_payload_descriptor_verification",
            &reader_bundle_payload["runtime_carrier_packet"],
        )?,
        write_bundle_json_artifact(
            &bundle_dir,
            "packet_contract.json",
            "packet_contract_json",
            "hfield_packet_contract_gate_verification",
            &reader_bundle_payload["packet_contract"],
        )?,
        write_bundle_json_artifact(
            &bundle_dir,
            "identity_vault_reference_summary.json",
            "identity_vault_reference_summary_json",
            "reference_only_custody_boundary_verification",
            &reader_bundle_payload["identity_vault_reference_summary"],
        )?,
    ];
    let canonical_score_for_audio: FieldScore =
        serde_json::from_value(canonical_project_payload["score"].clone())
            .map_err(|err| format!("canonical score rehydrate failed for WAV export: {err}"))?;
    artifacts.push(write_bundle_wav_artifact(
        &bundle_dir,
        "combined_audio.wav",
        "combined_audio_wav",
        "audio_render_hash_for_later_replay_verifier",
        compile_combined_music_and_conductor_preview(&canonical_score_for_audio, 48_000),
    )?);

    let authority_boundaries = json!({
        "private_identity_export_disabled": reader_bundle_payload["identity_vault_reference_summary"]["private_identity_export_disabled"].clone(),
        "public_identity_disabled": reader_bundle_payload["identity_vault_reference_summary"]["public_identity_disabled"].clone(),
        "economic_processing_disabled": reader_bundle_payload["identity_vault_reference_summary"]["economic_processing_disabled"].clone(),
        "portable_rights_disabled": reader_bundle_payload["identity_vault_reference_summary"]["portable_rights_disabled"].clone(),
        "live_identity_vault_write_performed": reader_bundle_payload["identity_vault_reference_summary"]["live_identity_vault_write_performed"].clone(),
        "forge_mutation_performed": reader_bundle_payload["identity_vault_reference_summary"]["forge_mutation_performed"].clone(),
        "forge_bridge_execution_mode": reader_bundle_payload["forge_bridge_stub"]["execution_mode"].clone(),
        "forge_bridge_live_execution_authorized": reader_bundle_payload["forge_bridge_stub"]["export_policy"]["live_execution_authorized"].clone()
    });

    let mut manifest_payload = json!({
        "contract_id": "aiweb.hfield.canonical_bundle_manifest.v1",
        "export_kind": "canonical_bundle_manifest",
        "bundle_id": bundle_id,
        "bundle_manifest_hash": null,
        "created_unix_seconds": created_unix_seconds,
        "source_hfield_score_hash": source_score_hash,
        "canonical_project_json_hash": artifacts[0]["blake3_hash"].clone(),
        "reader_bundle_json_hash": artifacts[1]["blake3_hash"].clone(),
        "rust_render_manifest_json_hash": artifacts[2]["blake3_hash"].clone(),
        "cymatic_surface_json_hash": artifacts[3]["blake3_hash"].clone(),
        "runtime_carrier_packet_json_hash": artifacts[4]["blake3_hash"].clone(),
        "packet_contract_json_hash": artifacts[5]["blake3_hash"].clone(),
        "combined_wav_hash": artifacts[7]["blake3_hash"].clone(),
        "identity_vault_reference_summary": reader_bundle_payload["identity_vault_reference_summary"].clone(),
        "authority_boundaries": authority_boundaries,
        "toolchain_build_info": {
            "rust_crate": "harmonic-conductor-studio-src-tauri",
            "rust_crate_version": env!("CARGO_PKG_VERSION"),
            "cargo_manifest_dir": env!("CARGO_MANIFEST_DIR"),
            "target_os": std::env::consts::OS,
            "target_arch": std::env::consts::ARCH,
            "tauri_app_root": app_root_dir().to_string_lossy().to_string()
        },
        "export_paths": {
            "bundle_dir": bundle_dir.to_string_lossy().to_string(),
            "bundle_dir_relative": app_relative_export_path(&bundle_dir)
        },
        "export_inventory": artifacts,
        "replay_verifier_fields": {
            "contract_id": "aiweb.hfield.export_replay_verifier.input.v1",
            "expected_artifact_count": 8,
            "required_artifact_kinds": [
                "canonical_project_json",
                "reader_bundle_json",
                "rust_render_manifest_json",
                "cymatic_reader_surface_json",
                "runtime_carrier_packet_json",
                "packet_contract_json",
                "identity_vault_reference_summary_json",
                "combined_audio_wav"
            ],
            "hash_algorithm": "BLAKE3",
            "must_recompute_source_score_hash": true,
            "must_recompute_all_artifact_hashes": true,
            "must_verify_no_private_identity_export": true,
            "must_verify_no_live_identity_vault_write": true,
            "must_verify_no_forge_mutation": true,
            "must_verify_canonical_project_opens_as_hfield": true,
            "must_verify_reader_bundle_matches_manifest_hashes": true,
            "must_verify_audio_hash_matches_manifest": true
        },
        "warnings": []
    });

    let manifest_bytes_for_hash = serde_json::to_vec_pretty(&manifest_payload)
        .map_err(|err| format!("failed to serialize canonical bundle manifest for hash: {err}"))?;
    let bundle_manifest_hash = blake3::hash(&manifest_bytes_for_hash).to_hex().to_string();
    manifest_payload["bundle_manifest_hash"] =
        serde_json::Value::String(bundle_manifest_hash.clone());

    let manifest_artifact = write_bundle_json_artifact(
        &bundle_dir,
        "canonical_bundle_manifest.json",
        "canonical_bundle_manifest_json",
        "bundle_hash_inventory_and_replay_seed",
        &manifest_payload,
    )?;

    Ok(json!({
        "status": "ok",
        "export_kind": "canonical_bundle_manifest",
        "manifest_contract_id": "aiweb.hfield.canonical_bundle_manifest.v1",
        "bundle_id": manifest_payload["bundle_id"].clone(),
        "bundle_dir": bundle_dir.to_string_lossy().to_string(),
        "bundle_manifest_hash": bundle_manifest_hash,
        "manifest_file_hash": manifest_artifact["blake3_hash"].clone(),
        "manifest_file": manifest_artifact,
        "artifact_count": 8,
        "artifact_manifest": manifest_payload["export_inventory"].clone(),
        "authority_boundaries": manifest_payload["authority_boundaries"].clone(),
        "replay_verifier_fields": manifest_payload["replay_verifier_fields"].clone()
    }))
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

#[tauri::command]
fn get_playback_clock_report(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let guard = state
        .playback
        .lock()
        .map_err(|_| "playback state lock poisoned".to_string())?;

    let Some(active) = guard.as_ref() else {
        return Ok(json!({
            "status": "idle",
            "clock_role": "none",
            "sample_rate_hz": 0,
            "sample_index": 0,
            "sample_count": 0,
            "playback_elapsed_ms": 0,
            "playback_duration_ms": 0,
            "score_time_offset_ms": 0,
            "score_time_end_ms": null,
            "current_time_ms": 0,
            "progress_percent": 0.0,
            "is_active": false
        }));
    };

    Ok(playback_clock_report(active))
}

fn playback_clock_report(active: &ActivePlayback) -> serde_json::Value {
    let sample_index = active
        .playhead
        .load(Ordering::SeqCst)
        .min(active.sample_count);
    let sample_rate_hz = active.sample_rate_hz.max(1);
    let playback_duration_ms = ((active.sample_count as f64 / sample_rate_hz as f64) * 1000.0)
        .round()
        .max(0.0) as u32;
    let playback_elapsed_ms = ((sample_index as f64 / sample_rate_hz as f64) * 1000.0)
        .round()
        .max(0.0) as u32;
    let score_time_end_ms = active.score_time_end_ms.unwrap_or_else(|| {
        active
            .score_time_offset_ms
            .saturating_add(playback_duration_ms)
    });
    let current_time_ms = active
        .score_time_offset_ms
        .saturating_add(playback_elapsed_ms)
        .min(score_time_end_ms);
    let progress_percent = if playback_duration_ms == 0 {
        0.0
    } else {
        ((playback_elapsed_ms as f64 / playback_duration_ms as f64) * 100.0).clamp(0.0, 100.0)
    };
    let status = if active.stop_flag.load(Ordering::SeqCst) {
        "stopped"
    } else if sample_index >= active.sample_count {
        "ended"
    } else {
        "playing"
    };

    json!({
        "status": status,
        "clock_role": active.clock_role.clone(),
        "sample_rate_hz": sample_rate_hz,
        "sample_index": sample_index,
        "sample_count": active.sample_count,
        "playback_elapsed_ms": playback_elapsed_ms,
        "playback_duration_ms": playback_duration_ms,
        "score_time_offset_ms": active.score_time_offset_ms,
        "score_time_end_ms": active.score_time_end_ms,
        "current_time_ms": current_time_ms,
        "progress_percent": (progress_percent * 1000.0).round() / 1000.0,
        "is_active": status == "playing"
    })
}

fn start_native_playback<F>(
    state: tauri::State<'_, AppState>,
    compiler: F,
) -> Result<serde_json::Value, String>
where
    F: FnOnce(u32) -> CompiledAudio + Send + 'static,
{
    start_native_playback_with_clock(state, 0, None, "full_project", compiler)
}

fn start_native_playback_with_clock<F>(
    state: tauri::State<'_, AppState>,
    score_time_offset_ms: u32,
    score_time_end_ms: Option<u32>,
    clock_role: &'static str,
    compiler: F,
) -> Result<serde_json::Value, String>
where
    F: FnOnce(u32) -> CompiledAudio + Send + 'static,
{
    let stop_flag = Arc::new(AtomicBool::new(false));
    let thread_stop_flag = Arc::clone(&stop_flag);

    let (tx, rx) = mpsc::channel::<Result<PlaybackStartup, String>>();

    let playback_thread = thread::spawn(move || {
        run_playback_thread(compiler, thread_stop_flag, tx);
    });

    let mut startup = match rx.recv_timeout(Duration::from_secs(3)) {
        Ok(Ok(startup)) => startup,
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
        if let Some(object) = startup.report.as_object_mut() {
            object.insert("clock_role".to_string(), json!(clock_role));
            object.insert(
                "score_time_offset_ms".to_string(),
                json!(score_time_offset_ms),
            );
            object.insert("score_time_end_ms".to_string(), json!(score_time_end_ms));
            object.insert(
                "single_clock_sync".to_string(),
                json!("hcs_single_clock_playback_scan_sync_v1"),
            );
        }

        *guard = Some(ActivePlayback {
            stop_flag,
            playhead: startup.playhead,
            sample_rate_hz: startup.sample_rate_hz,
            sample_count: startup.sample_count,
            score_time_offset_ms,
            score_time_end_ms,
            clock_role: clock_role.to_string(),
            thread: playback_thread,
        });
    }

    Ok(startup.report)
}

fn run_playback_thread<F>(
    compiler: F,
    stop_flag: Arc<AtomicBool>,
    tx: mpsc::Sender<Result<PlaybackStartup, String>>,
) where
    F: FnOnce(u32) -> CompiledAudio,
{
    let setup = setup_playback_stream(compiler, Arc::clone(&stop_flag));

    let (stream, report, playhead, sample_count, sample_rate_hz) = match setup {
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

    let _ = tx.send(Ok(PlaybackStartup {
        report,
        playhead: Arc::clone(&playhead),
        sample_rate_hz,
        sample_count,
    }));

    while !stop_flag.load(Ordering::SeqCst) && playhead.load(Ordering::SeqCst) < sample_count {
        thread::sleep(Duration::from_millis(20));
    }

    drop(stream);
}

fn setup_playback_stream<F>(
    compiler: F,
    stop_flag: Arc<AtomicBool>,
) -> Result<
    (
        cpal::Stream,
        serde_json::Value,
        Arc<AtomicUsize>,
        usize,
        u32,
    ),
    String,
>
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

    Ok((stream, report, playhead, sample_count, sample_rate_hz))
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
            get_current_hfield_identity_vault_reference_report,
            bind_current_hfield_identity_vault_reference,
            get_current_hfield_packet_contract_report,
            get_current_hfield_field_synthesis_report,
            get_current_hfield_cymatic_reader_surface_report,
            get_current_hfield_runtime_carrier_packet_report,
            get_current_hfield_rust_render_manifest_report,
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
            get_hcs_track_editor_and_piano_roll_v1_report,
            get_hcs_virtual_keyboard_and_realtime_note_entry_v1_report,
            get_hcs_production_notation_render_sync_v1_report,
            get_hcs_instrument_rack_and_track_sound_v1_report,
            get_hcs_composer_first_workflow_and_soundfont_foundation_v1_report,
            get_hcs_composer_studio_canvas_rebuild_v1_report,
            play_hcs_fluidsynth_soundfont_mix_v1,
            get_hcs_composer_waveform_editor_true_sound_body_v1_report,
            get_hcs_waveform_to_3d_field_body_v1_report,
            get_hcs_key_frequency_registry_v1_report,
            lookup_hcs_key_frequency_v1,
            import_hcs_studio_score_json_v1,
            load_hcs_studio_score_preset_v1,
            set_hcs_piano_roll_note_v1,
            clear_current_studio_score_v1,
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
            export_current_hfield_project_json,
            export_current_hfield_packet_contract_json,
            export_current_hfield_runtime_carrier_packet_json,
            export_current_hfield_cymatic_surface_json,
            export_current_hfield_rust_render_manifest_json,
            export_current_hfield_reader_bundle_json,
            export_current_hfield_combined_wav,
            export_current_hfield_canonical_bundle_manifest_json,
            export_current_hfield_canonical_bundle_manifest_v2_json,
            get_hcs_sqlite_motif_project_library_v1_report,
            save_current_hcs_sqlite_project_library_v1,
            list_hcs_sqlite_project_library_v1,
            open_hcs_sqlite_project_from_library_v1,
            save_current_hcs_sqlite_motifs_v1,
            list_hcs_sqlite_motifs_v1,
            save_current_hcs_sqlite_receipt_v1,
            get_hcs_production_packaging_v1_report,
            get_hcs_studio_creation_backend_and_placeholder_purge_v1_report,
            verify_latest_hfield_export_replay_manifest_json,
            verify_hfield_export_replay_manifest_json_by_path,
            get_hfield_schema_version_migration_registry_json,
            inspect_current_hfield_schema_migration_registry_json,
            get_current_nine_gesture_conductor_engine_report,
            get_current_harmonic_field_score_v1_upgrade_report,
            get_current_coupling_profile_engine_v1_report,
            get_current_motif_library_annotation_layer_v1_report,
            get_current_deterministic_audio_engine_v2_report,
            export_current_deterministic_audio_engine_v2_wav,
            get_current_true_conductor_gesture_reference_manifest_v1_report,
            export_current_true_conductor_gesture_reference_manifest_v1_json,
            get_current_gesture_aware_field_renderer_v2_report,
            export_current_gesture_aware_field_renderer_v2_json,
            get_current_cymatic_field_model_v2_report,
            export_current_cymatic_field_model_v2_json,
            get_current_syllable_shaped_expression_v1_report,
            export_current_syllable_shaped_expression_v1_json,
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
            get_playback_clock_report,
            stop_playback
        ])
        .run(tauri::generate_context!())
        .expect("error while running Harmonic Conductor Studio");
}
