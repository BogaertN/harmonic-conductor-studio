use hfield_domain::{FieldScore, GestureEvent, MusicTrack, NoteEvent};
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

    let total_samples = ms_to_samples(total_duration_ms, sample_rate_hz).max(1);
    let mut samples = vec![0.0_f32; total_samples];

    for event in &score.conductor.primary_hand_track.events {
        render_gesture_event(score, event, sample_rate_hz, &mut samples);
    }

    normalize_safety(&mut samples);

    CompiledAudio {
        sample_rate_hz,
        samples,
    }
}

pub fn compile_music_preview(score: &FieldScore, sample_rate_hz: u32) -> CompiledAudio {
    let total_duration_ms = score
        .music
        .tracks
        .iter()
        .flat_map(|track| track.notes.iter())
        .map(|note| note.start_ms + note.duration_ms)
        .max()
        .unwrap_or(0)
        .max(1);

    let total_samples = ms_to_samples(total_duration_ms, sample_rate_hz).max(1);
    let mut samples = vec![0.0_f32; total_samples];

    for track in &score.music.tracks {
        render_music_track(track, sample_rate_hz, &mut samples);
    }

    normalize_safety(&mut samples);

    CompiledAudio {
        sample_rate_hz,
        samples,
    }
}

pub fn compile_combined_music_and_conductor_preview(
    score: &FieldScore,
    sample_rate_hz: u32,
) -> CompiledAudio {
    let conductor = compile_pitch_preview(score, sample_rate_hz);
    let music = compile_music_preview(score, sample_rate_hz);
    let total_samples = conductor.samples.len().max(music.samples.len()).max(1);
    let mut samples = vec![0.0_f32; total_samples];

    for (idx, out) in samples.iter_mut().enumerate() {
        let music_sample = music.samples.get(idx).copied().unwrap_or(0.0);
        let conductor_sample = conductor.samples.get(idx).copied().unwrap_or(0.0);

        // Music is foreground. Conductor tone is quiet guidance for now.
        *out = (music_sample * 0.90) + (conductor_sample * 0.22);
    }

    normalize_safety(&mut samples);

    CompiledAudio {
        sample_rate_hz,
        samples,
    }
}

fn render_music_track(track: &MusicTrack, sample_rate_hz: u32, output: &mut [f32]) {
    let track_gain = match track.role.as_str() {
        "melody" => 0.22,
        "bass_depth" => 0.18,
        "harmonic_field_support" => 0.09,
        _ => 0.14,
    };

    for note in &track.notes {
        render_note_event(note, track_gain, sample_rate_hz, output);
    }
}

fn render_note_event(note: &NoteEvent, track_gain: f32, sample_rate_hz: u32, output: &mut [f32]) {
    let start_sample = ms_to_samples(note.start_ms, sample_rate_hz);
    let note_samples = ms_to_samples(note.duration_ms, sample_rate_hz);
    if note_samples == 0 {
        return;
    }

    let frequency_hz = midi_note_to_frequency_hz(note.midi_note);
    let amplitude = (track_gain * note.velocity.clamp(0.0, 1.0)).clamp(0.0, 0.35);

    for n in 0..note_samples {
        let output_index = start_sample + n;
        if output_index >= output.len() {
            break;
        }

        let t = n as f32 / sample_rate_hz as f32;
        let envelope = music_envelope(n, note_samples);

        // Simple musical tone v1: sine fundamental with a quiet second harmonic.
        let fundamental = (TAU * frequency_hz * t).sin();
        let second_harmonic = 0.18 * (TAU * frequency_hz * 2.0 * t).sin();

        output[output_index] += amplitude * envelope * (fundamental + second_harmonic);
    }
}

fn render_gesture_event(
    score: &FieldScore,
    event: &GestureEvent,
    sample_rate_hz: u32,
    output: &mut [f32],
) {
    let start_sample = ms_to_samples(event.start_ms, sample_rate_hz);
    let event_samples = ms_to_samples(event.duration_ms, sample_rate_hz);
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

pub fn midi_note_to_frequency_hz(midi_note: u8) -> f32 {
    440.0 * 2.0_f32.powf((midi_note as f32 - 69.0) / 12.0)
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

fn ms_to_samples(ms: u32, sample_rate_hz: u32) -> usize {
    ((ms as f64 / 1000.0) * sample_rate_hz as f64).round() as usize
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

fn music_envelope(sample_index: usize, total_samples: usize) -> f32 {
    if total_samples <= 1 {
        return 0.0;
    }

    let attack = (total_samples / 18).max(1);
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

fn normalize_safety(samples: &mut [f32]) {
    let peak = samples
        .iter()
        .fold(0.0_f32, |acc, sample| acc.max(sample.abs()));

    if peak > 0.80 {
        let scale = 0.80 / peak;
        for sample in samples.iter_mut() {
            *sample *= scale;
        }
    }

    for sample in samples {
        *sample = sample.clamp(-0.80, 0.80);
    }
}

pub fn write_wav_i16<P: AsRef<std::path::Path>>(
    path: P,
    compiled: &CompiledAudio,
) -> Result<(), hound::Error> {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: compiled.sample_rate_hz,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = hound::WavWriter::create(path, spec)?;

    for sample in &compiled.samples {
        let clamped = sample.clamp(-1.0, 1.0);
        let value = (clamped * i16::MAX as f32).round() as i16;
        writer.write_sample(value)?;
    }

    writer.finalize()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use hfield_domain::{FieldScore, NoteEvent};

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

    #[test]
    fn midi_a4_is_440_hz() {
        let a4 = midi_note_to_frequency_hz(69);
        assert!((a4 - 440.0).abs() < 0.001);
    }

    #[test]
    fn compiles_music_note_to_audio_samples() {
        let mut score = FieldScore::default_hcs();
        score.music.tracks[0].notes.push(NoteEvent {
            midi_note: 69,
            start_ms: 0,
            duration_ms: 500,
            velocity: 0.8,
        });

        let compiled = compile_music_preview(&score, 48_000);
        assert_eq!(compiled.sample_rate_hz, 48_000);
        assert!(!compiled.samples.is_empty());
        assert!(compiled.samples.iter().any(|sample| sample.abs() > 0.0001));
    }

    #[test]
    fn writes_wav_file() {
        let score = FieldScore::default_hcs();
        let compiled = compile_pitch_preview(&score, 48_000);
        let path = std::env::temp_dir().join("hcs_test_preview.wav");
        write_wav_i16(&path, &compiled).expect("write wav");
        let metadata = std::fs::metadata(&path).expect("wav metadata");
        assert!(metadata.len() > 44);
        let _ = std::fs::remove_file(path);
    }
}
