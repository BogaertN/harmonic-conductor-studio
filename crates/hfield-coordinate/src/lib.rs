use hfield_domain::FieldScore;
use serde::{Deserialize, Serialize};

const FIELD_X_MIN: f64 = -4.2;
const FIELD_X_MAX: f64 = 4.2;
const FIELD_Z_MIN: f64 = -3.65;
const FIELD_Z_MAX: f64 = 3.65;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CoordinateLayer {
    FileIdentityCarrier,
    RuntimePathCarrier,
    PayloadTone,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum VerticalLane {
    Identity,
    PayloadLead,
    RuntimeDepth,
    RuntimeField,
    RuntimeOther,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HarmonicCoordinateEntry {
    pub entry_id: String,
    pub layer: CoordinateLayer,
    pub lane: VerticalLane,
    pub track_id: String,
    pub label: String,
    pub midi_note: Option<u8>,
    pub note_name: Option<String>,
    pub frequency_hz: f64,
    pub start_ms: u32,
    pub duration_ms: u32,
    pub end_ms: u32,
    pub x_pitch_position: f64,
    pub y_lane_position: f64,
    pub z_start_position: f64,
    pub z_end_position: f64,
    pub z_center_position: f64,
    pub z_body_length: f64,
    pub pitch_class: Option<u8>,
    pub layer_color: String,
    pub pitch_color: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HarmonicCoordinateRegistry {
    pub contract_id: String,
    pub coordinate_profile: String,
    pub axis_contract: AxisContract,
    pub total_duration_ms: u32,
    pub entries: Vec<HarmonicCoordinateEntry>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AxisContract {
    pub x: String,
    pub y: String,
    pub z: String,
    pub t: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct InterferenceEligibility {
    pub left_entry_id: String,
    pub right_entry_id: String,
    pub overlap_ms: u32,
    pub pitch_distance: f64,
    pub lane_distance: f64,
    pub eligible: bool,
}

pub fn build_harmonic_coordinate_registry(score: &FieldScore) -> HarmonicCoordinateRegistry {
    let total_duration_ms = score_total_duration_ms(score);
    let mut entries = Vec::new();

    entries.push(file_identity_entry(score, total_duration_ms));

    for track in &score.music.tracks {
        let lane = lane_for_track(&track.track_id);
        let layer = layer_for_lane(&lane);

        for note in &track.notes {
            let midi_note = note.midi_note;
            let frequency_hz = midi_to_hz(midi_note);
            let start_ms = note.start_ms;
            let duration_ms = note.duration_ms.max(1);
            let end_ms = start_ms.saturating_add(duration_ms);
            let pitch_class = midi_note % 12;
            let note_name = midi_note_name(midi_note);

            let z_start = time_to_z(start_ms, total_duration_ms);
            let z_end = time_to_z(end_ms, total_duration_ms);
            let z_body_length = (z_end - z_start).abs();

            entries.push(HarmonicCoordinateEntry {
                entry_id: format!(
                    "{}:{}:{}:{}",
                    track.track_id, note_name, start_ms, duration_ms
                ),
                layer: layer.clone(),
                lane: lane.clone(),
                track_id: track.track_id.clone(),
                label: format!("{} {}", track.track_id, note_name),
                midi_note: Some(midi_note),
                note_name: Some(note_name),
                frequency_hz: round3(frequency_hz),
                start_ms,
                duration_ms,
                end_ms,
                x_pitch_position: round4(pitch_class_to_x(pitch_class)),
                y_lane_position: round4(lane_to_y(&lane)),
                z_start_position: round4(z_start),
                z_end_position: round4(z_end),
                z_center_position: round4((z_start + z_end) / 2.0),
                z_body_length: round4(z_body_length),
                pitch_class: Some(pitch_class),
                layer_color: layer_color(&layer).to_string(),
                pitch_color: pitch_class_color(pitch_class).to_string(),
            });
        }
    }

    HarmonicCoordinateRegistry {
        contract_id: "aiweb.hfield.harmonic_coordinate_registry.v1".to_string(),
        coordinate_profile: "hcs_canonical_harmonic_coordinate_profile_v1".to_string(),
        axis_contract: AxisContract {
            x: "reader surface pitch/spatial reference".to_string(),
            y: "cymatic displacement lane and harmonic amplitude region".to_string(),
            z: "field depth / spatial reference".to_string(),
            t: "glass reader scan time; not a static rendered axis".to_string(),
        },
        total_duration_ms,
        entries,
    }
}

pub fn calculate_interference_eligibility(
    registry: &HarmonicCoordinateRegistry,
) -> Vec<InterferenceEligibility> {
    let mut results = Vec::new();

    for left_index in 0..registry.entries.len() {
        for right_index in (left_index + 1)..registry.entries.len() {
            let left = &registry.entries[left_index];
            let right = &registry.entries[right_index];

            if left.layer == CoordinateLayer::FileIdentityCarrier
                && right.layer == CoordinateLayer::FileIdentityCarrier
            {
                continue;
            }

            let overlap_ms = temporal_overlap_ms(left, right);
            let pitch_distance = (left.x_pitch_position - right.x_pitch_position).abs();
            let lane_distance = (left.y_lane_position - right.y_lane_position).abs();
            let eligible = overlap_ms > 0 && pitch_distance <= 1.35 && lane_distance <= 1.25;

            results.push(InterferenceEligibility {
                left_entry_id: left.entry_id.clone(),
                right_entry_id: right.entry_id.clone(),
                overlap_ms,
                pitch_distance: round4(pitch_distance),
                lane_distance: round4(lane_distance),
                eligible,
            });
        }
    }

    results
}

pub fn midi_to_hz(midi_note: u8) -> f64 {
    440.0 * 2f64.powf((f64::from(midi_note) - 69.0) / 12.0)
}

pub fn midi_note_name(midi_note: u8) -> String {
    let names = [
        "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
    ];
    let pitch_class = midi_note % 12;
    let octave = i16::from(midi_note) / 12 - 1;

    format!("{}{}", names[usize::from(pitch_class)], octave)
}

pub fn pitch_class_to_x(pitch_class: u8) -> f64 {
    let clamped = f64::from(pitch_class % 12);
    FIELD_X_MIN + ((clamped + 0.5) / 12.0) * (FIELD_X_MAX - FIELD_X_MIN)
}

pub fn time_to_z(time_ms: u32, total_duration_ms: u32) -> f64 {
    let safe_total = total_duration_ms.max(1);
    let ratio = (f64::from(time_ms) / f64::from(safe_total)).clamp(0.0, 1.0);

    FIELD_Z_MIN + ratio * (FIELD_Z_MAX - FIELD_Z_MIN)
}

pub fn lane_for_track(track_id: &str) -> VerticalLane {
    let lower = track_id.to_lowercase();

    if lower.contains("lead") || lower.contains("payload") || lower.contains("primary") {
        VerticalLane::PayloadLead
    } else if lower.contains("depth") || lower.contains("lower") || lower.contains("anchor_5") {
        VerticalLane::RuntimeDepth
    } else if lower.contains("field") || lower.contains("upper") || lower.contains("anchor_9") {
        VerticalLane::RuntimeField
    } else {
        VerticalLane::RuntimeOther
    }
}

pub fn lane_to_y(lane: &VerticalLane) -> f64 {
    match lane {
        VerticalLane::Identity => 3.05,
        VerticalLane::RuntimeDepth => 0.85,
        VerticalLane::PayloadLead => 1.42,
        VerticalLane::RuntimeField => 2.12,
        VerticalLane::RuntimeOther => 1.68,
    }
}

pub fn pitch_class_color(pitch_class: u8) -> &'static str {
    match pitch_class % 12 {
        0 => "#ff3b30",
        1 => "#ff6b2b",
        2 => "#ffb000",
        3 => "#f6d84a",
        4 => "#e8f66a",
        5 => "#7ee36d",
        6 => "#35d07f",
        7 => "#36d6ff",
        8 => "#2f8dff",
        9 => "#6657ff",
        10 => "#a56bff",
        _ => "#ff73d1",
    }
}

fn file_identity_entry(score: &FieldScore, total_duration_ms: u32) -> HarmonicCoordinateEntry {
    let artifact_id = score.provenance.artifact_id.clone();
    let frequency_hz = deterministic_identity_frequency_hz(&artifact_id);
    let z_start = time_to_z(0, total_duration_ms);
    let z_end = time_to_z(total_duration_ms, total_duration_ms);

    HarmonicCoordinateEntry {
        entry_id: "file_identity_carrier".to_string(),
        layer: CoordinateLayer::FileIdentityCarrier,
        lane: VerticalLane::Identity,
        track_id: "file_identity".to_string(),
        label: artifact_id,
        midi_note: None,
        note_name: None,
        frequency_hz: round3(frequency_hz),
        start_ms: 0,
        duration_ms: total_duration_ms,
        end_ms: total_duration_ms,
        x_pitch_position: 0.0,
        y_lane_position: lane_to_y(&VerticalLane::Identity),
        z_start_position: round4(z_start),
        z_end_position: round4(z_end),
        z_center_position: round4((z_start + z_end) / 2.0),
        z_body_length: round4((z_end - z_start).abs()),
        pitch_class: None,
        layer_color: layer_color(&CoordinateLayer::FileIdentityCarrier).to_string(),
        pitch_color: layer_color(&CoordinateLayer::FileIdentityCarrier).to_string(),
    }
}

fn deterministic_identity_frequency_hz(artifact_id: &str) -> f64 {
    let mut hash: u64 = 14_695_981_039_346_656_037;

    for byte in artifact_id.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(1_099_511_628_211);
    }

    let fractional = (hash % 1_000_000) as f64 / 1_000_000.0;
    96.0 + fractional * 1344.0
}

fn layer_for_lane(lane: &VerticalLane) -> CoordinateLayer {
    match lane {
        VerticalLane::Identity => CoordinateLayer::FileIdentityCarrier,
        VerticalLane::PayloadLead => CoordinateLayer::PayloadTone,
        VerticalLane::RuntimeDepth | VerticalLane::RuntimeField | VerticalLane::RuntimeOther => {
            CoordinateLayer::RuntimePathCarrier
        }
    }
}

fn layer_color(layer: &CoordinateLayer) -> &'static str {
    match layer {
        CoordinateLayer::FileIdentityCarrier => "#f6d36b",
        CoordinateLayer::RuntimePathCarrier => "#56d6ff",
        CoordinateLayer::PayloadTone => "#fff2ad",
    }
}

fn score_total_duration_ms(score: &FieldScore) -> u32 {
    score
        .music
        .tracks
        .iter()
        .flat_map(|track| &track.notes)
        .map(|note| note.start_ms.saturating_add(note.duration_ms))
        .max()
        .unwrap_or(1)
        .max(1)
}

fn temporal_overlap_ms(left: &HarmonicCoordinateEntry, right: &HarmonicCoordinateEntry) -> u32 {
    let start = left.start_ms.max(right.start_ms);
    let end = left.end_ms.min(right.end_ms);

    end.saturating_sub(start)
}

fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

fn round4(value: f64) -> f64 {
    (value * 10000.0).round() / 10000.0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn canonical_score() -> FieldScore {
        serde_json::from_str(include_str!(
            "../../../projects/hcs_canonical_reader_packet_v1.hfield"
        ))
        .expect("canonical reader must parse")
    }

    #[test]
    fn maps_known_pitches_to_stable_coordinates() {
        let score = canonical_score();
        let registry = build_harmonic_coordinate_registry(&score);

        let c4_entries: Vec<_> = registry
            .entries
            .iter()
            .filter(|entry| entry.note_name.as_deref() == Some("C4"))
            .collect();

        assert!(c4_entries.len() >= 3);

        let c4_x = c4_entries[0].x_pitch_position;
        assert!(c4_entries
            .iter()
            .all(|entry| entry.x_pitch_position == c4_x));

        let g4 = registry
            .entries
            .iter()
            .find(|entry| entry.note_name.as_deref() == Some("G4"))
            .expect("G4 must exist");

        assert_ne!(g4.x_pitch_position, c4_x);
        assert_eq!(g4.pitch_class, Some(7));
        assert_eq!(g4.pitch_color, pitch_class_color(7));
    }

    #[test]
    fn maps_track_roles_to_vertical_lanes() {
        let score = canonical_score();
        let registry = build_harmonic_coordinate_registry(&score);

        let lead = registry
            .entries
            .iter()
            .find(|entry| {
                entry.track_id == "lead_voice" && entry.note_name.as_deref() == Some("C4")
            })
            .expect("lead C4 must exist");

        let depth = registry
            .entries
            .iter()
            .find(|entry| {
                entry.track_id == "depth_voice" && entry.note_name.as_deref() == Some("G3")
            })
            .expect("depth G3 must exist");

        let field = registry
            .entries
            .iter()
            .find(|entry| {
                entry.track_id == "field_voice" && entry.note_name.as_deref() == Some("G4")
            })
            .expect("field G4 must exist");

        assert_eq!(lead.lane, VerticalLane::PayloadLead);
        assert_eq!(depth.lane, VerticalLane::RuntimeDepth);
        assert_eq!(field.lane, VerticalLane::RuntimeField);

        assert!(depth.y_lane_position < lead.y_lane_position);
        assert!(field.y_lane_position > lead.y_lane_position);
    }

    #[test]
    fn maps_start_and_duration_to_z_positions() {
        let score = canonical_score();
        let registry = build_harmonic_coordinate_registry(&score);

        assert_eq!(registry.total_duration_ms, 8000);

        let first_c4 = registry
            .entries
            .iter()
            .find(|entry| {
                entry.track_id == "lead_voice"
                    && entry.note_name.as_deref() == Some("C4")
                    && entry.start_ms == 0
            })
            .expect("first C4 must exist");

        let packet_g4 = registry
            .entries
            .iter()
            .find(|entry| {
                entry.track_id == "lead_voice"
                    && entry.note_name.as_deref() == Some("G4")
                    && entry.start_ms == 6000
            })
            .expect("packet G4 must exist");

        assert_eq!(first_c4.z_start_position, round4(FIELD_Z_MIN));
        assert!(first_c4.z_body_length > 1.7);
        assert!(packet_g4.z_start_position > 1.7);
        assert_eq!(packet_g4.z_end_position, round4(FIELD_Z_MAX));
    }

    #[test]
    fn identity_carrier_is_deterministic_and_not_example_locked() {
        let score = canonical_score();
        let registry = build_harmonic_coordinate_registry(&score);

        let identity = registry
            .entries
            .iter()
            .find(|entry| entry.layer == CoordinateLayer::FileIdentityCarrier)
            .expect("identity carrier must exist");

        assert_ne!(identity.frequency_hz, 174.0);
        assert!(identity.frequency_hz >= 96.0);
        assert!(identity.frequency_hz <= 1440.0);
        assert_eq!(identity.start_ms, 0);
        assert_eq!(identity.duration_ms, 8000);
    }

    #[test]
    fn overlapping_events_report_interference_eligibility_without_guessing() {
        let score = canonical_score();
        let registry = build_harmonic_coordinate_registry(&score);
        let reports = calculate_interference_eligibility(&registry);

        assert!(reports.iter().any(|report| report.overlap_ms > 0));
        assert!(reports.iter().any(|report| report.eligible));
    }
}
