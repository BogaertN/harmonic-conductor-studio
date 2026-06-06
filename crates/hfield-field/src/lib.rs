use hfield_domain::{FieldScore, HFIELD_PHASE_ORDER};
use hfield_music::{midi_note_to_frequency_hz, midi_note_to_name};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

const FIELD_CONTRACT_ID: &str = "aiweb.hfield.field_synthesis_engine.v1";
const SAMPLE_TARGET_PER_EVENT: usize = 7;
const MAX_WAVE_SAMPLES: usize = 360;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HfieldFieldSynthesisReport {
    pub strategy: String,
    pub status: String,
    pub field_contract_id: String,
    pub title: String,
    pub source_format: String,
    pub source_version: String,
    pub root_frequency_hz: f64,
    pub phase_count: u8,
    pub phase_order: Vec<u8>,
    pub phase_grid_rows: Vec<Vec<u8>>,
    pub anchor_layout: String,
    pub renderer_intent: String,
    pub open_source_renderer_profile: String,
    pub time_window: FieldTimeWindow,
    pub phase_nodes: Vec<FieldPhaseNode>,
    pub anchors: FieldAnchors,
    pub harmonic_events: Vec<FieldHarmonicEvent>,
    pub cymatic_wave_samples: Vec<CymaticWaveSample>,
    pub field_trace: Vec<FieldTracePoint>,
    pub total_note_count: usize,
    pub total_conductor_event_count: usize,
    pub deterministic_field_hash: String,
    pub ready_for_3d_viewport: bool,
    pub ready_for_cymatic_mesh: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldTimeWindow {
    pub start_ms: u32,
    pub end_ms: u32,
    pub duration_ms: u32,
    pub duration_seconds: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldAnchors {
    pub center_1: FieldPhaseNode,
    pub lower_5: FieldPhaseNode,
    pub upper_9: FieldPhaseNode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldPhaseNode {
    pub phase: u8,
    pub label: String,
    pub role: String,
    pub anchor_role: String,
    pub conductor_order_index: usize,
    pub conductor_grid_row: u8,
    pub conductor_grid_col: u8,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub base_frequency_hz: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldHarmonicEvent {
    pub event_kind: String,
    pub source_track_id: String,
    pub source_role: String,
    pub event_index: usize,
    pub phase: u8,
    pub anchor_phase: u8,
    pub field_region: String,
    pub note_name: Option<String>,
    pub gesture_id: Option<String>,
    pub operator: Option<String>,
    pub frequency_hz: f64,
    pub amplitude: f32,
    pub start_ms: u32,
    pub duration_ms: u32,
    pub end_ms: u32,
    pub time_norm_start: f32,
    pub time_norm_end: f32,
    pub phase_angle_rad: f64,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub cymatic_radius: f32,
    pub cymatic_displacement: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CymaticWaveSample {
    pub sample_index: usize,
    pub source_event_index: usize,
    pub event_kind: String,
    pub time_ms: u32,
    pub time_norm: f32,
    pub phase: u8,
    pub frequency_hz: f64,
    pub amplitude: f32,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub radial_displacement: f32,
    pub coherence_weight: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldTracePoint {
    pub point_index: usize,
    pub time_ms: u32,
    pub time_norm: f32,
    pub phase: u8,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub field_region: String,
    pub intensity: f32,
}

pub fn synthesize_hfield_field(score: &FieldScore) -> HfieldFieldSynthesisReport {
    let phase_nodes = create_phase_nodes(score.root_frequency_hz);
    let anchors = FieldAnchors {
        center_1: phase_node(&phase_nodes, 1),
        lower_5: phase_node(&phase_nodes, 5),
        upper_9: phase_node(&phase_nodes, 9),
    };

    let total_note_count = score
        .music
        .tracks
        .iter()
        .map(|track| track.notes.len())
        .sum();
    let total_conductor_event_count = score.conductor.primary_hand_track.events.len()
        + score
            .conductor
            .expressive_hand_track
            .as_ref()
            .map(|track| track.events.len())
            .unwrap_or(0);
    let duration_ms = total_duration_ms(score).max(1);
    let time_window = FieldTimeWindow {
        start_ms: 0,
        end_ms: duration_ms,
        duration_ms,
        duration_seconds: round3(duration_ms as f64 / 1000.0),
    };

    let mut harmonic_events = collect_note_events(score, &phase_nodes, duration_ms);
    harmonic_events.extend(collect_gesture_events(score, &phase_nodes, duration_ms));
    harmonic_events.sort_by_key(|event| (event.start_ms, event.phase, event.event_index));

    let cymatic_wave_samples =
        create_cymatic_wave_samples(&harmonic_events, score.root_frequency_hz, duration_ms);
    let field_trace = create_field_trace(&harmonic_events, duration_ms);

    let mut report = HfieldFieldSynthesisReport {
        strategy: "rust_owned_hfield_field_synthesis_engine_v1".to_string(),
        status: "ok".to_string(),
        field_contract_id: FIELD_CONTRACT_ID.to_string(),
        title: score.title.clone(),
        source_format: score.format.clone(),
        source_version: score.version.clone(),
        root_frequency_hz: score.root_frequency_hz,
        phase_count: 9,
        phase_order: HFIELD_PHASE_ORDER.to_vec(),
        phase_grid_rows: vec![vec![2, 1, 3], vec![4, 5, 6], vec![7, 9, 8]],
        anchor_layout: "center_1_lower_5_upper_9".to_string(),
        renderer_intent: "render_phase_locked_harmonic_packet_as_time_space_cymatic_field"
            .to_string(),
        open_source_renderer_profile: "three_js_or_react_three_fiber_runtime_blender_export_later"
            .to_string(),
        time_window,
        phase_nodes,
        anchors,
        harmonic_events,
        cymatic_wave_samples,
        field_trace,
        total_note_count,
        total_conductor_event_count,
        deterministic_field_hash: String::new(),
        ready_for_3d_viewport: true,
        ready_for_cymatic_mesh: true,
        warnings: Vec::new(),
    };

    if report.total_note_count == 0 {
        report.warnings.push(
            "field synthesized from conductor cues only because score has no music notes"
                .to_string(),
        );
    }
    if report.harmonic_events.is_empty() {
        report.status = "warning".to_string();
        report.ready_for_3d_viewport = false;
        report.ready_for_cymatic_mesh = false;
        report
            .warnings
            .push("no score or conductor events available for field synthesis".to_string());
    }

    report.deterministic_field_hash = stable_report_hash(&report);
    report
}

fn collect_note_events(
    score: &FieldScore,
    phase_nodes: &[FieldPhaseNode],
    duration_ms: u32,
) -> Vec<FieldHarmonicEvent> {
    let mut events = Vec::new();

    for track in &score.music.tracks {
        let mut sorted_notes = track.notes.clone();
        sorted_notes.sort_by_key(|note| (note.start_ms, note.midi_note));
        for (index, note) in sorted_notes.iter().enumerate() {
            let frequency_hz = midi_note_to_frequency_hz(note.midi_note) as f64;
            let phase = phase_for_frequency(frequency_hz, score.root_frequency_hz);
            let node = phase_node(phase_nodes, phase);
            let anchor_phase = anchor_for_track_role_and_phase(&track.role, phase);
            let field_region = field_region_for_anchor(anchor_phase).to_string();
            let amplitude = note.velocity.clamp(0.0, 1.0);
            let start_norm = percent01(note.start_ms, duration_ms);
            let end_ms = note.start_ms.saturating_add(note.duration_ms);
            let end_norm = percent01(end_ms, duration_ms);
            let phase_angle_rad = phase_angle(phase);
            let displacement = cymatic_displacement(
                frequency_hz,
                score.root_frequency_hz,
                amplitude,
                note.start_ms,
            );
            events.push(FieldHarmonicEvent {
                event_kind: "note".to_string(),
                source_track_id: track.track_id.clone(),
                source_role: track.role.clone(),
                event_index: index + 1,
                phase,
                anchor_phase,
                field_region,
                note_name: Some(midi_note_to_name(note.midi_note)),
                gesture_id: None,
                operator: None,
                frequency_hz: round3(frequency_hz),
                amplitude,
                start_ms: note.start_ms,
                duration_ms: note.duration_ms.max(1),
                end_ms,
                time_norm_start: start_norm,
                time_norm_end: end_norm,
                phase_angle_rad: round6(phase_angle_rad),
                x: round4(node.x + displacement * phase_angle_rad.cos() as f32),
                y: round4(node.y + displacement * phase_angle_rad.sin() as f32),
                z: round4(time_to_z(start_norm)),
                cymatic_radius: round4(cymatic_radius(
                    frequency_hz,
                    score.root_frequency_hz,
                    amplitude,
                )),
                cymatic_displacement: round4(displacement),
            });
        }
    }

    events
}

fn collect_gesture_events(
    score: &FieldScore,
    phase_nodes: &[FieldPhaseNode],
    duration_ms: u32,
) -> Vec<FieldHarmonicEvent> {
    let mut events = Vec::new();
    let tracks = std::iter::once(&score.conductor.primary_hand_track)
        .chain(score.conductor.expressive_hand_track.iter());

    for track in tracks {
        let mut sorted_events = track.events.clone();
        sorted_events.sort_by_key(|event| (event.start_ms, event.gesture_id.clone()));
        for (index, event) in sorted_events.iter().enumerate() {
            let phase = phase_from_gesture(&event.gesture_id).unwrap_or(1);
            let node = phase_node(phase_nodes, phase);
            let anchor_phase = anchor_for_phase(phase);
            let field_region = field_region_for_anchor(anchor_phase).to_string();
            let frequency_hz =
                gesture_frequency_for_phase(score.root_frequency_hz, phase, event.intensity);
            let amplitude = event.intensity.clamp(0.0, 1.0);
            let start_norm = percent01(event.start_ms, duration_ms);
            let end_ms = event.start_ms.saturating_add(event.duration_ms);
            let end_norm = percent01(end_ms, duration_ms);
            let phase_angle_rad = phase_angle(phase);
            let displacement = cymatic_displacement(
                frequency_hz,
                score.root_frequency_hz,
                amplitude,
                event.start_ms,
            );
            events.push(FieldHarmonicEvent {
                event_kind: "gesture".to_string(),
                source_track_id: track.track_id.clone(),
                source_role: "conductor_gesture".to_string(),
                event_index: index + 1,
                phase,
                anchor_phase,
                field_region,
                note_name: None,
                gesture_id: Some(event.gesture_id.clone()),
                operator: event.operator.clone(),
                frequency_hz: round3(frequency_hz),
                amplitude,
                start_ms: event.start_ms,
                duration_ms: event.duration_ms.max(1),
                end_ms,
                time_norm_start: start_norm,
                time_norm_end: end_norm,
                phase_angle_rad: round6(phase_angle_rad),
                x: round4(node.x + displacement * phase_angle_rad.cos() as f32),
                y: round4(node.y + displacement * phase_angle_rad.sin() as f32),
                z: round4(time_to_z(start_norm)),
                cymatic_radius: round4(cymatic_radius(
                    frequency_hz,
                    score.root_frequency_hz,
                    amplitude,
                )),
                cymatic_displacement: round4(displacement),
            });
        }
    }

    events
}

fn create_cymatic_wave_samples(
    events: &[FieldHarmonicEvent],
    root_frequency_hz: f64,
    duration_ms: u32,
) -> Vec<CymaticWaveSample> {
    let mut samples = Vec::new();
    let safe_root = root_frequency_hz.max(1.0);

    for (source_index, event) in events.iter().enumerate() {
        for sample_step in 0..SAMPLE_TARGET_PER_EVENT {
            if samples.len() >= MAX_WAVE_SAMPLES {
                return samples;
            }
            let fraction = sample_step as f64 / (SAMPLE_TARGET_PER_EVENT - 1) as f64;
            let time_ms = event
                .start_ms
                .saturating_add((event.duration_ms as f64 * fraction).round() as u32);
            let time_norm = percent01(time_ms, duration_ms);
            let seconds = time_ms as f64 / 1000.0;
            let wave = (2.0 * PI * (event.frequency_hz / safe_root) * seconds
                + event.phase_angle_rad)
                .sin();
            let radial_displacement = (wave as f32 * event.amplitude * 0.18).clamp(-1.0, 1.0);
            let orbit = event.phase_angle_rad + fraction * 2.0 * PI;
            samples.push(CymaticWaveSample {
                sample_index: samples.len() + 1,
                source_event_index: source_index + 1,
                event_kind: event.event_kind.clone(),
                time_ms,
                time_norm,
                phase: event.phase,
                frequency_hz: event.frequency_hz,
                amplitude: event.amplitude,
                x: round4(event.x + radial_displacement * orbit.cos() as f32),
                y: round4(event.y + radial_displacement * orbit.sin() as f32),
                z: round4(time_to_z(time_norm) + radial_displacement * 0.25),
                radial_displacement: round4(radial_displacement),
                coherence_weight: round4(coherence_weight(
                    event.phase,
                    event.anchor_phase,
                    event.amplitude,
                )),
            });
        }
    }

    samples
}

fn create_field_trace(events: &[FieldHarmonicEvent], duration_ms: u32) -> Vec<FieldTracePoint> {
    events
        .iter()
        .enumerate()
        .map(|(index, event)| FieldTracePoint {
            point_index: index + 1,
            time_ms: event.start_ms,
            time_norm: percent01(event.start_ms, duration_ms),
            phase: event.phase,
            x: event.x,
            y: event.y,
            z: event.z,
            field_region: event.field_region.clone(),
            intensity: event.amplitude,
        })
        .collect()
}

fn create_phase_nodes(root_frequency_hz: f64) -> Vec<FieldPhaseNode> {
    HFIELD_PHASE_ORDER
        .iter()
        .enumerate()
        .map(|(index, phase)| {
            let (row, col) = conductor_grid_position(*phase);
            let (x, y, z) = spatial_position(*phase);
            FieldPhaseNode {
                phase: *phase,
                label: format!("Φ{phase}"),
                role: phase_role(*phase).to_string(),
                anchor_role: anchor_label_for_phase(*phase).to_string(),
                conductor_order_index: index + 1,
                conductor_grid_row: row,
                conductor_grid_col: col,
                x,
                y,
                z,
                base_frequency_hz: round3(root_frequency_hz * *phase as f64),
            }
        })
        .collect()
}

fn phase_node(nodes: &[FieldPhaseNode], phase: u8) -> FieldPhaseNode {
    nodes
        .iter()
        .find(|node| node.phase == phase)
        .cloned()
        .unwrap_or_else(|| FieldPhaseNode {
            phase,
            label: format!("Φ{phase}"),
            role: phase_role(phase).to_string(),
            anchor_role: anchor_label_for_phase(phase).to_string(),
            conductor_order_index: phase as usize,
            conductor_grid_row: 2,
            conductor_grid_col: 2,
            x: 0.0,
            y: 0.0,
            z: 0.0,
            base_frequency_hz: round3(144.0 * phase as f64),
        })
}

fn phase_for_frequency(frequency_hz: f64, root_frequency_hz: f64) -> u8 {
    if frequency_hz <= 0.0 || root_frequency_hz <= 0.0 {
        return 1;
    }
    let octave_position = (frequency_hz / root_frequency_hz).log2().rem_euclid(1.0);
    let index = (octave_position * 9.0).floor().clamp(0.0, 8.0) as usize;
    HFIELD_PHASE_ORDER[index]
}

fn phase_from_gesture(gesture_id: &str) -> Option<u8> {
    gesture_id
        .strip_prefix('g')?
        .parse::<u8>()
        .ok()
        .filter(|phase| (1..=9).contains(phase))
}

fn anchor_for_track_role_and_phase(role: &str, phase: u8) -> u8 {
    let lower = role.to_lowercase();
    if lower.contains("bass") || lower.contains("depth") {
        5
    } else if lower.contains("field") || lower.contains("support") {
        9
    } else {
        anchor_for_phase(phase)
    }
}

fn anchor_for_phase(phase: u8) -> u8 {
    match phase {
        4..=6 => 5,
        7..=9 => 9,
        _ => 1,
    }
}

fn field_region_for_anchor(anchor_phase: u8) -> &'static str {
    match anchor_phase {
        5 => "lower_depth_weight",
        9 => "upper_lift_expression",
        _ => "center_home_root",
    }
}

fn anchor_label_for_phase(phase: u8) -> &'static str {
    field_region_for_anchor(anchor_for_phase(phase))
}

fn phase_role(phase: u8) -> &'static str {
    match phase {
        1 => "center_home_root_presence",
        2 => "polarity_receptive_contrast",
        3 => "emergence_directional_motion",
        4 => "constraint_friction_entry",
        5 => "lower_depth_weight_transformation",
        6 => "release_after_weight",
        7 => "gather_lift_binding",
        8 => "outward_expression_emission",
        9 => "upper_lift_expression_hold",
        _ => "unknown_phase",
    }
}

fn conductor_grid_position(phase: u8) -> (u8, u8) {
    match phase {
        2 => (1, 1),
        1 => (1, 2),
        3 => (1, 3),
        4 => (2, 1),
        5 => (2, 2),
        6 => (2, 3),
        7 => (3, 1),
        9 => (3, 2),
        8 => (3, 3),
        _ => (2, 2),
    }
}

fn spatial_position(phase: u8) -> (f32, f32, f32) {
    match phase {
        1 => (0.0, 0.0, 0.0),
        5 => (0.0, -1.15, 0.0),
        9 => (0.0, 1.15, 0.0),
        2 => (-0.95, 0.0, -0.12),
        3 => (0.95, 0.0, 0.12),
        4 => (-0.95, -0.75, -0.08),
        6 => (0.95, -0.75, 0.08),
        7 => (-0.95, 0.75, -0.08),
        8 => (0.95, 0.75, 0.08),
        _ => (0.0, 0.0, 0.0),
    }
}

fn gesture_frequency_for_phase(root_frequency_hz: f64, phase: u8, intensity: f32) -> f64 {
    root_frequency_hz.max(1.0)
        * (1.0 + phase as f64 / 9.0)
        * (0.75 + intensity.clamp(0.0, 1.0) as f64 * 0.5)
}

fn phase_angle(phase: u8) -> f64 {
    let index = HFIELD_PHASE_ORDER
        .iter()
        .position(|candidate| *candidate == phase)
        .unwrap_or(0) as f64;
    2.0 * PI * index / 9.0
}

fn cymatic_radius(frequency_hz: f64, root_frequency_hz: f64, amplitude: f32) -> f32 {
    let ratio = frequency_hz / root_frequency_hz.max(1.0);
    round4(((ratio.log2().abs().fract() as f32) * 0.72 + 0.18) * amplitude.clamp(0.05, 1.0))
}

fn cymatic_displacement(
    frequency_hz: f64,
    root_frequency_hz: f64,
    amplitude: f32,
    time_ms: u32,
) -> f32 {
    let seconds = time_ms as f64 / 1000.0;
    let ratio = frequency_hz / root_frequency_hz.max(1.0);
    let wave = (2.0 * PI * ratio * seconds).sin() as f32;
    round4(wave * amplitude.clamp(0.0, 1.0) * 0.16)
}

fn coherence_weight(phase: u8, anchor_phase: u8, amplitude: f32) -> f32 {
    let phase_distance = (phase as i16 - anchor_phase as i16).unsigned_abs() as f32;
    let base = 1.0 / (1.0 + phase_distance / 9.0);
    (base * (0.5 + amplitude.clamp(0.0, 1.0) * 0.5)).clamp(0.0, 1.0)
}

fn total_duration_ms(score: &FieldScore) -> u32 {
    let music_end = score
        .music
        .tracks
        .iter()
        .flat_map(|track| track.notes.iter())
        .map(|note| note.start_ms.saturating_add(note.duration_ms))
        .max()
        .unwrap_or(0);
    let conductor_end = score
        .conductor
        .primary_hand_track
        .events
        .iter()
        .chain(
            score
                .conductor
                .expressive_hand_track
                .iter()
                .flat_map(|track| track.events.iter()),
        )
        .map(|event| event.start_ms.saturating_add(event.duration_ms))
        .max()
        .unwrap_or(0);
    music_end.max(conductor_end).max(1)
}

fn percent01(value_ms: u32, duration_ms: u32) -> f32 {
    if duration_ms == 0 {
        0.0
    } else {
        ((value_ms as f64 / duration_ms as f64).clamp(0.0, 1.0) as f32 * 1000.0).round() / 1000.0
    }
}

fn time_to_z(time_norm: f32) -> f32 {
    round4(time_norm * 2.0 - 1.0)
}

fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

fn round6(value: f64) -> f64 {
    (value * 1_000_000.0).round() / 1_000_000.0
}

fn round4(value: f32) -> f32 {
    (value * 10_000.0).round() / 10_000.0
}

fn stable_report_hash(report: &HfieldFieldSynthesisReport) -> String {
    let mut clone = report.clone();
    clone.deterministic_field_hash.clear();
    let bytes = serde_json::to_vec(&clone).unwrap_or_default();
    blake3::hash(&bytes).to_hex().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use hfield_domain::{FieldScore, NoteEvent};

    fn score_with_notes() -> FieldScore {
        let mut score = FieldScore::default_hcs();
        score.music.tracks[0].notes = vec![
            NoteEvent {
                midi_note: 60,
                start_ms: 0,
                duration_ms: 500,
                velocity: 0.8,
            },
            NoteEvent {
                midi_note: 67,
                start_ms: 500,
                duration_ms: 500,
                velocity: 0.9,
            },
        ];
        score.music.tracks[1].notes = vec![NoteEvent {
            midi_note: 48,
            start_ms: 0,
            duration_ms: 1000,
            velocity: 0.5,
        }];
        score
    }

    #[test]
    fn default_score_creates_nine_phase_field() {
        let report = synthesize_hfield_field(&FieldScore::default_hcs());
        assert_eq!(report.phase_count, 9);
        assert_eq!(report.phase_nodes.len(), 9);
        assert_eq!(report.phase_order, vec![2, 1, 3, 4, 5, 6, 7, 9, 8]);
        assert!(report.total_conductor_event_count > 0);
    }

    #[test]
    fn anchors_one_five_nine_are_preserved() {
        let report = synthesize_hfield_field(&FieldScore::default_hcs());
        assert_eq!(report.anchors.center_1.phase, 1);
        assert_eq!(report.anchors.lower_5.phase, 5);
        assert_eq!(report.anchors.upper_9.phase, 9);
        assert!(report.anchors.upper_9.y > report.anchors.center_1.y);
        assert!(report.anchors.lower_5.y < report.anchors.center_1.y);
    }

    #[test]
    fn note_pitch_and_timing_shape_field_events() {
        let report = synthesize_hfield_field(&score_with_notes());
        let note_events = report
            .harmonic_events
            .iter()
            .filter(|event| event.event_kind == "note")
            .collect::<Vec<_>>();
        assert_eq!(note_events.len(), 3);
        assert_ne!(note_events[0].frequency_hz, note_events[1].frequency_hz);
        assert!(note_events[1].time_norm_start >= note_events[0].time_norm_start);
        assert!(report.cymatic_wave_samples.len() >= 21);
    }

    #[test]
    fn conductor_gestures_affect_phase_path() {
        let report = synthesize_hfield_field(&FieldScore::default_hcs());
        let phases = report
            .harmonic_events
            .iter()
            .filter(|event| event.event_kind == "gesture")
            .map(|event| event.phase)
            .collect::<Vec<_>>();
        assert!(phases.contains(&2));
        assert!(phases.contains(&1));
        assert!(phases.contains(&3));
    }

    #[test]
    fn field_output_is_deterministic() {
        let score = score_with_notes();
        let a = synthesize_hfield_field(&score);
        let b = synthesize_hfield_field(&score);
        assert_eq!(a.deterministic_field_hash, b.deterministic_field_hash);
        assert_eq!(a.cymatic_wave_samples, b.cymatic_wave_samples);
    }
}
