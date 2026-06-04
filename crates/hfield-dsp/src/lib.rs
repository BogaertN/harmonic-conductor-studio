use hfield_domain::{FieldScore, GestureEvent};
use std::f32::consts::TAU;

#[derive(Debug, Clone, PartialEq)]
pub struct CompiledAudio {
    pub sample_rate_hz: u32,
    pub samples: Vec<f32>,
}

pub fn compile_pitch_preview(score: &FieldScore, sample_rate_hz: u32) -> CompiledAudio {
    let total_duration_ms = score
        .conductor
        .primary_hand_track
        .events
        .iter()
        .map(|event| event.start_ms + event.duration_ms)
        .max()
        .unwrap_or(0)
        .max(1);

    let total_samples =
        ((total_duration_ms as f64 / 1000.0) * sample_rate_hz as f64).ceil() as usize;
    let mut samples = vec![0.0_f32; total_samples];

    for event in &score.conductor.primary_hand_track.events {
        render_gesture_event(score, event, sample_rate_hz, &mut samples);
    }

    for sample in &mut samples {
        *sample = sample.clamp(-0.80, 0.80);
    }

    CompiledAudio {
        sample_rate_hz,
        samples,
    }
}

fn render_gesture_event(
    score: &FieldScore,
    event: &GestureEvent,
    sample_rate_hz: u32,
    output: &mut [f32],
) {
    let start_sample = ((event.start_ms as f64 / 1000.0) * sample_rate_hz as f64).round() as usize;
    let event_samples =
        ((event.duration_ms as f64 / 1000.0) * sample_rate_hz as f64).round() as usize;
    if event_samples == 0 {
        return;
    }

    let frequency_hz =
        gesture_frequency_hz(score.root_frequency_hz as f32, event.gesture_id.as_str());
    let amplitude = (0.08 + event.intensity * 0.18).clamp(0.0, 0.30);

    for n in 0..event_samples {
        let output_index = start_sample + n;
        if output_index >= output.len() {
            break;
        }

        let t = n as f32 / sample_rate_hz as f32;
        let envelope = smooth_envelope(n, event_samples);
        let value = amplitude * envelope * (TAU * frequency_hz * t).sin();

        output[output_index] += value;
    }
}

pub fn gesture_frequency_hz(root_hz: f32, gesture_id: &str) -> f32 {
    match gesture_id {
        "g4" => root_hz * 0.625,
        "g5" => root_hz * 0.5,
        "g6" => root_hz * 0.75,
        "g2" => root_hz * 0.94,
        "g1" => root_hz,
        "g3" => root_hz * 1.06,
        "g7" => root_hz * 2.0,
        "g9" => root_hz * 3.0,
        "g8" => root_hz * 4.0,
        _ => root_hz,
    }
}

fn smooth_envelope(sample_index: usize, total_samples: usize) -> f32 {
    if total_samples <= 1 {
        return 0.0;
    }

    let attack = (total_samples / 10).max(1);
    let release = (total_samples / 8).max(1);

    if sample_index < attack {
        sample_index as f32 / attack as f32
    } else if sample_index + release >= total_samples {
        let remaining = total_samples.saturating_sub(sample_index);
        remaining as f32 / release as f32
    } else {
        1.0
    }
    .clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use hfield_domain::FieldScore;

    #[test]
    fn compiles_default_score_to_audio_samples() {
        let score = FieldScore::default_hcs();
        let compiled = compile_pitch_preview(&score, 48_000);
        assert_eq!(compiled.sample_rate_hz, 48_000);
        assert!(!compiled.samples.is_empty());
        assert!(compiled.samples.iter().any(|sample| sample.abs() > 0.0001));
    }

    #[test]
    fn center_root_frequency_is_144() {
        assert_eq!(gesture_frequency_hz(144.0, "g1"), 144.0);
    }
}
