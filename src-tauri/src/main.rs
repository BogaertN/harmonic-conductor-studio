use hfield_analysis::summarize_waveform;
use hfield_conductor::nine_gesture_vocabulary;
use hfield_domain::FieldScore;
use hfield_dsp::{compile_pitch_preview, write_wav_i16};
use hfield_storage::{score_hash_hex, score_to_pretty_json};

#[tauri::command]
fn create_default_score() -> FieldScore {
    FieldScore::default_hcs()
}

#[tauri::command]
fn get_gesture_vocabulary() -> serde_json::Value {
    serde_json::to_value(nine_gesture_vocabulary()).expect("gesture vocabulary should serialize")
}

fn app_root_dir() -> std::path::PathBuf {
    let tauri_manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    tauri_manifest_dir
        .parent()
        .expect("src-tauri must have an app root parent")
        .to_path_buf()
}

#[tauri::command]
fn preview_score_report() -> serde_json::Value {
    let score = FieldScore::default_hcs();
    let compiled = compile_pitch_preview(&score, 48_000);
    let summary = summarize_waveform(&compiled.samples);
    let score_hash = score_hash_hex(&score).expect("default score should hash");
    let score_json = score_to_pretty_json(&score).expect("default score should serialize");

    serde_json::json!({
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
    let score = FieldScore::default_hcs();
    let compiled = compile_pitch_preview(&score, 48_000);
    let summary = summarize_waveform(&compiled.samples);

    let output_dir = app_root_dir().join("exports").join("audio");
    std::fs::create_dir_all(&output_dir).expect("audio export directory should be creatable");

    let output_path = output_dir.join("hcs_first_gesture_preview.wav");
    write_wav_i16(&output_path, &compiled).expect("wav export should succeed");

    let wav_bytes = std::fs::read(&output_path).expect("wav file should be readable after export");
    let wav_hash = blake3::hash(&wav_bytes).to_hex().to_string();

    serde_json::json!({
        "status": "ok",
        "output_path": output_path.to_string_lossy().to_string(),
        "wav_bytes": wav_bytes.len(),
        "wav_hash": wav_hash,
        "sample_rate_hz": compiled.sample_rate_hz,
        "sample_count": compiled.samples.len(),
        "waveform_summary": summary
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_default_score,
            get_gesture_vocabulary,
            preview_score_report,
            render_first_gesture_wav
        ])
        .run(tauri::generate_context!())
        .expect("error while running Harmonic Conductor Studio");
}
