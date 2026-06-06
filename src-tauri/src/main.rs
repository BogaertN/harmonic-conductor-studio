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
    GestureTrack, NoteEvent,
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
use hfield_music::{append_note_to_track, clear_track_notes, create_music_timeline_report};
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
