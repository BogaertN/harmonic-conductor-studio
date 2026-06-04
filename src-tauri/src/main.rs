use hfield_analysis::summarize_waveform;
use hfield_conductor::nine_gesture_vocabulary;
use hfield_domain::FieldScore;
use hfield_dsp::compile_pitch_preview;
use hfield_storage::{score_hash_hex, score_to_pretty_json};

#[tauri::command]
fn create_default_score() -> FieldScore {
    FieldScore::default_hcs()
}

#[tauri::command]
fn get_gesture_vocabulary() -> serde_json::Value {
    serde_json::to_value(nine_gesture_vocabulary()).expect("gesture vocabulary should serialize")
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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_default_score,
            get_gesture_vocabulary,
            preview_score_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running Harmonic Conductor Studio");
}
