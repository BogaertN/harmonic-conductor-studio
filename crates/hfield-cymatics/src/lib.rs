use hfield_domain::{FieldScore, HFIELD_PHASE_ORDER};
use hfield_field::{synthesize_hfield_field, FieldHarmonicEvent};
use hfield_music::midi_note_to_name;
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

const CYMATIC_READER_CONTRACT_ID: &str = "aiweb.hfield.cymatic_reader_surface_mesh.v1";
const X_SEGMENTS: usize = 41;
const T_SEGMENTS: usize = 37;
const MAX_TONES: usize = 128;
const ACTIVE_WINDOW_PAD_MS: u32 = 180;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HfieldCymaticReaderSurfaceReport {
    pub strategy: String,
    pub status: String,
    pub cymatic_reader_contract_id: String,
    pub source_field_contract_id: String,
    pub source_field_hash: String,
    pub title: String,
    pub root_frequency_hz: f64,
    pub phase_order: Vec<u8>,
    pub phase_grid_rows: Vec<Vec<u8>>,
    pub reader_model: String,
    pub color_profile_id: String,
    pub standard_frequency_reference: String,
    pub glass_reader: GlassReaderPlane,
    pub anchor_colors: Vec<PhaseColorBand>,
    pub active_tones: Vec<CymaticTone>,
    pub reader_surface: CymaticReaderSurface,
    pub interference_slices: Vec<InterferenceTimeSlice>,
    pub ambient_field_points: Vec<AmbientCymaticFieldPoint>,
    pub deterministic_reader_hash: String,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GlassReaderPlane {
    pub label: String,
    pub role: String,
    pub material_model: String,
    pub width_units: f32,
    pub height_units: f32,
    pub thickness_units: f32,
    pub orientation: String,
    pub time_axis: String,
    pub frequency_axis: String,
    pub displacement_axis: String,
    pub opacity_hint: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PhaseColorBand {
    pub phase: u8,
    pub phase_role: String,
    pub anchor_role: String,
    pub base_frequency_hz: f64,
    pub color_hex: String,
    pub hue_degrees: f32,
    pub semantic_note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CymaticTone {
    pub tone_index: usize,
    pub event_kind: String,
    pub source_track_id: String,
    pub source_role: String,
    pub phase: u8,
    pub anchor_phase: u8,
    pub note_name: Option<String>,
    pub gesture_id: Option<String>,
    pub frequency_hz: f64,
    pub amplitude: f32,
    pub start_ms: u32,
    pub duration_ms: u32,
    pub end_ms: u32,
    pub color_hex: String,
    pub hue_degrees: f32,
    pub spatial_x: f32,
    pub spatial_y: f32,
    pub spatial_z: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CymaticReaderSurface {
    pub x_segments: usize,
    pub t_segments: usize,
    pub vertex_count: usize,
    pub triangle_count: usize,
    pub max_abs_displacement: f32,
    pub polyphonic_interference_count: usize,
    pub vertices: Vec<CymaticSurfaceVertex>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CymaticSurfaceVertex {
    pub vertex_index: usize,
    pub x_norm: f32,
    pub time_norm: f32,
    pub time_ms: u32,
    pub displacement: f32,
    pub intensity: f32,
    pub active_tone_count: usize,
    pub dominant_phase: u8,
    pub dominant_frequency_hz: f64,
    pub color_hex: String,
    pub r: f32,
    pub g: f32,
    pub b: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InterferenceTimeSlice {
    pub slice_index: usize,
    pub time_ms: u32,
    pub time_norm: f32,
    pub active_tone_count: usize,
    pub dominant_phase: u8,
    pub dominant_frequency_hz: f64,
    pub constructive_energy: f32,
    pub destructive_energy: f32,
    pub net_displacement: f32,
    pub color_hex: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AmbientCymaticFieldPoint {
    pub point_index: usize,
    pub time_ms: u32,
    pub time_norm: f32,
    pub phase: u8,
    pub frequency_hz: f64,
    pub amplitude: f32,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub color_hex: String,
    pub role: String,
}

pub fn synthesize_hfield_cymatic_reader_surface(
    score: &FieldScore,
) -> HfieldCymaticReaderSurfaceReport {
    let field_report = synthesize_hfield_field(score);
    let duration_ms = field_report.time_window.duration_ms.max(1);
    let root_frequency_hz = field_report.root_frequency_hz.max(1.0);
    let color_bands = create_phase_color_bands(root_frequency_hz);
    let active_tones = create_active_tones(&field_report.harmonic_events, &color_bands);
    let (reader_surface, interference_slices) =
        create_reader_surface(&active_tones, duration_ms, root_frequency_hz, &color_bands);
    let ambient_field_points = create_ambient_points(&active_tones, duration_ms);

    let mut report = HfieldCymaticReaderSurfaceReport {
        strategy: "rust_owned_glass_reader_cymatic_surface_mesh_v1".to_string(),
        status: "ok".to_string(),
        cymatic_reader_contract_id: CYMATIC_READER_CONTRACT_ID.to_string(),
        source_field_contract_id: field_report.field_contract_id,
        source_field_hash: field_report.deterministic_field_hash,
        title: field_report.title,
        root_frequency_hz: field_report.root_frequency_hz,
        phase_order: HFIELD_PHASE_ORDER.to_vec(),
        phase_grid_rows: vec![vec![2, 1, 3], vec![4, 5, 6], vec![7, 9, 8]],
        reader_model: "transparent_glass_slide_as_cymatics_reader_plane".to_string(),
        color_profile_id: "hcs_canonical_phase_frequency_color_v1".to_string(),
        standard_frequency_reference:
            "pitch_frequency_hz_from_equal_temperament_plus_hcs_governed_phase_color_profile"
                .to_string(),
        glass_reader: GlassReaderPlane {
            label: "Glass Reader Plane".to_string(),
            role: "actual_cymatics_reader_slice_that_intercepts_the_harmonic_packet".to_string(),
            material_model: "transparent_refractive_glass_with_frequency_displacement_overlay"
                .to_string(),
            width_units: 6.4,
            height_units: 2.8,
            thickness_units: 0.04,
            orientation: "vertical_x_frequency_by_z_time_slice".to_string(),
            time_axis: "front_to_back_packet_time".to_string(),
            frequency_axis: "left_to_right_spatial_frequency_interference".to_string(),
            displacement_axis: "surface_height_represents_signed_wave_interference".to_string(),
            opacity_hint: 0.22,
        },
        anchor_colors: color_bands,
        active_tones,
        reader_surface,
        interference_slices,
        ambient_field_points,
        deterministic_reader_hash: String::new(),
        warnings: Vec::new(),
    };

    if report.active_tones.is_empty() {
        report.status = "warning".to_string();
        report
            .warnings
            .push("no harmonic tones available for cymatic reader surface".to_string());
    }
    if report.reader_surface.polyphonic_interference_count == 0 {
        report.warnings.push(
            "surface contains no simultaneous polyphonic overlap in this packet window".to_string(),
        );
    }

    report.deterministic_reader_hash = stable_reader_hash(&report);
    report
}

fn create_active_tones(
    events: &[FieldHarmonicEvent],
    color_bands: &[PhaseColorBand],
) -> Vec<CymaticTone> {
    events
        .iter()
        .take(MAX_TONES)
        .enumerate()
        .map(|(index, event)| {
            let color = phase_color_band(color_bands, event.phase);
            CymaticTone {
                tone_index: index + 1,
                event_kind: event.event_kind.clone(),
                source_track_id: event.source_track_id.clone(),
                source_role: event.source_role.clone(),
                phase: event.phase,
                anchor_phase: event.anchor_phase,
                note_name: event.note_name.clone().or_else(|| {
                    if event.event_kind == "note" {
                        Some(midi_note_to_name(60))
                    } else {
                        None
                    }
                }),
                gesture_id: event.gesture_id.clone(),
                frequency_hz: event.frequency_hz,
                amplitude: event.amplitude,
                start_ms: event.start_ms,
                duration_ms: event.duration_ms.max(1),
                end_ms: event.end_ms.max(event.start_ms.saturating_add(1)),
                color_hex: color.color_hex.clone(),
                hue_degrees: color.hue_degrees,
                spatial_x: event.x,
                spatial_y: event.y,
                spatial_z: event.z,
            }
        })
        .collect()
}

fn create_reader_surface(
    tones: &[CymaticTone],
    duration_ms: u32,
    root_frequency_hz: f64,
    color_bands: &[PhaseColorBand],
) -> (CymaticReaderSurface, Vec<InterferenceTimeSlice>) {
    let mut vertices = Vec::with_capacity(X_SEGMENTS * T_SEGMENTS);
    let mut max_abs_displacement = 0.0_f32;
    let mut polyphonic_interference_count = 0usize;
    let mut slice_accumulator = Vec::with_capacity(T_SEGMENTS);

    for t_index in 0..T_SEGMENTS {
        let time_norm = if T_SEGMENTS <= 1 {
            0.0
        } else {
            t_index as f32 / (T_SEGMENTS - 1) as f32
        };
        let time_ms = ((duration_ms as f32) * time_norm).round() as u32;
        let active = active_tones_at(tones, time_ms);
        if active.len() > 1 {
            polyphonic_interference_count += 1;
        }
        let slice = summarize_interference_slice(t_index, time_ms, time_norm, &active, color_bands);
        slice_accumulator.push(slice);

        for x_index in 0..X_SEGMENTS {
            let x_norm = if X_SEGMENTS <= 1 {
                0.0
            } else {
                (x_index as f32 / (X_SEGMENTS - 1) as f32) * 2.0 - 1.0
            };
            let sample = sample_surface_vertex(
                vertices.len() + 1,
                x_norm,
                time_norm,
                time_ms,
                &active,
                root_frequency_hz,
                color_bands,
            );
            max_abs_displacement = max_abs_displacement.max(sample.displacement.abs());
            vertices.push(sample);
        }
    }

    let quad_count = (X_SEGMENTS - 1) * (T_SEGMENTS - 1);
    let surface = CymaticReaderSurface {
        x_segments: X_SEGMENTS,
        t_segments: T_SEGMENTS,
        vertex_count: vertices.len(),
        triangle_count: quad_count * 2,
        max_abs_displacement: round4(max_abs_displacement),
        polyphonic_interference_count,
        vertices,
    };

    (surface, slice_accumulator)
}

fn sample_surface_vertex(
    vertex_index: usize,
    x_norm: f32,
    time_norm: f32,
    time_ms: u32,
    active: &[&CymaticTone],
    root_frequency_hz: f64,
    color_bands: &[PhaseColorBand],
) -> CymaticSurfaceVertex {
    if active.is_empty() {
        let neutral = phase_color_band(color_bands, 1);
        let (r, g, b) = hex_to_rgb(&neutral.color_hex);
        return CymaticSurfaceVertex {
            vertex_index,
            x_norm: round4(x_norm),
            time_norm: round4(time_norm),
            time_ms,
            displacement: 0.0,
            intensity: 0.0,
            active_tone_count: 0,
            dominant_phase: 1,
            dominant_frequency_hz: root_frequency_hz,
            color_hex: neutral.color_hex.clone(),
            r,
            g,
            b,
        };
    }

    let seconds = time_ms as f64 / 1000.0;
    let mut signed_sum = 0.0_f64;
    let mut abs_sum = 0.0_f64;
    let mut weighted_frequency = 0.0_f64;
    let mut weighted_phase = 0.0_f64;
    let mut total_weight = 0.0_f64;
    let mut color_r = 0.0_f64;
    let mut color_g = 0.0_f64;
    let mut color_b = 0.0_f64;

    for tone in active {
        let envelope = tone_envelope(tone, time_ms) as f64;
        let amp = tone.amplitude.clamp(0.0, 1.0) as f64 * envelope;
        let ratio = tone.frequency_hz / root_frequency_hz.max(1.0);
        let phase_angle = phase_angle(tone.phase);
        let spatial_term = x_norm as f64 * PI * (1.0 + ratio.fract() * 4.0);
        let wave = (2.0 * PI * ratio * seconds + phase_angle + spatial_term).sin();
        let contribution = wave * amp;
        signed_sum += contribution;
        abs_sum += contribution.abs();
        weighted_frequency += tone.frequency_hz * amp.max(0.0001);
        weighted_phase += tone.phase as f64 * amp.max(0.0001);
        total_weight += amp.max(0.0001);
        let (r, g, b) = hex_to_rgb(&tone.color_hex);
        color_r += r as f64 * amp.max(0.0001);
        color_g += g as f64 * amp.max(0.0001);
        color_b += b as f64 * amp.max(0.0001);
    }

    let normalization = (active.len() as f64).sqrt().max(1.0);
    let displacement = (signed_sum / normalization * 0.42).clamp(-0.9, 0.9) as f32;
    let intensity = ((abs_sum / active.len() as f64).min(1.0)) as f32;
    let dominant_frequency_hz = weighted_frequency / total_weight.max(0.0001);
    let dominant_phase_float = weighted_phase / total_weight.max(0.0001);
    let dominant_phase = dominant_phase_float.round().clamp(1.0, 9.0) as u8;
    let r = (color_r / total_weight.max(0.0001)).clamp(0.0, 1.0) as f32;
    let g = (color_g / total_weight.max(0.0001)).clamp(0.0, 1.0) as f32;
    let b = (color_b / total_weight.max(0.0001)).clamp(0.0, 1.0) as f32;

    CymaticSurfaceVertex {
        vertex_index,
        x_norm: round4(x_norm),
        time_norm: round4(time_norm),
        time_ms,
        displacement: round4(displacement),
        intensity: round4(intensity),
        active_tone_count: active.len(),
        dominant_phase,
        dominant_frequency_hz: round3(dominant_frequency_hz),
        color_hex: rgb_to_hex(r, g, b),
        r: round4(r),
        g: round4(g),
        b: round4(b),
    }
}

fn summarize_interference_slice(
    slice_index: usize,
    time_ms: u32,
    time_norm: f32,
    active: &[&CymaticTone],
    color_bands: &[PhaseColorBand],
) -> InterferenceTimeSlice {
    if active.is_empty() {
        let neutral = phase_color_band(color_bands, 1);
        return InterferenceTimeSlice {
            slice_index: slice_index + 1,
            time_ms,
            time_norm: round4(time_norm),
            active_tone_count: 0,
            dominant_phase: 1,
            dominant_frequency_hz: 0.0,
            constructive_energy: 0.0,
            destructive_energy: 0.0,
            net_displacement: 0.0,
            color_hex: neutral.color_hex.clone(),
        };
    }

    let mut constructive = 0.0_f64;
    let mut destructive = 0.0_f64;
    let mut signed = 0.0_f64;
    let mut weighted_frequency = 0.0_f64;
    let mut weighted_phase = 0.0_f64;
    let mut total_weight = 0.0_f64;
    let mut r = 0.0_f64;
    let mut g = 0.0_f64;
    let mut b = 0.0_f64;

    for tone in active {
        let amp = tone.amplitude.clamp(0.0, 1.0) as f64 * tone_envelope(tone, time_ms) as f64;
        let phase_wave =
            (phase_angle(tone.phase) + time_ms as f64 / 1000.0 * tone.frequency_hz / 144.0).sin();
        let contribution = phase_wave * amp;
        if contribution >= 0.0 {
            constructive += contribution.abs();
        } else {
            destructive += contribution.abs();
        }
        signed += contribution;
        weighted_frequency += tone.frequency_hz * amp.max(0.0001);
        weighted_phase += tone.phase as f64 * amp.max(0.0001);
        total_weight += amp.max(0.0001);
        let (cr, cg, cb) = hex_to_rgb(&tone.color_hex);
        r += cr as f64 * amp.max(0.0001);
        g += cg as f64 * amp.max(0.0001);
        b += cb as f64 * amp.max(0.0001);
    }

    let dominant_phase = (weighted_phase / total_weight.max(0.0001))
        .round()
        .clamp(1.0, 9.0) as u8;
    InterferenceTimeSlice {
        slice_index: slice_index + 1,
        time_ms,
        time_norm: round4(time_norm),
        active_tone_count: active.len(),
        dominant_phase,
        dominant_frequency_hz: round3(weighted_frequency / total_weight.max(0.0001)),
        constructive_energy: round4((constructive / active.len() as f64).min(1.0) as f32),
        destructive_energy: round4((destructive / active.len() as f64).min(1.0) as f32),
        net_displacement: round4((signed / (active.len() as f64).sqrt().max(1.0) * 0.42) as f32),
        color_hex: rgb_to_hex(
            (r / total_weight.max(0.0001)) as f32,
            (g / total_weight.max(0.0001)) as f32,
            (b / total_weight.max(0.0001)) as f32,
        ),
    }
}

fn create_ambient_points(tones: &[CymaticTone], duration_ms: u32) -> Vec<AmbientCymaticFieldPoint> {
    let mut points = Vec::new();
    for tone in tones.iter().take(72) {
        let span_count = if tone.event_kind == "note" { 3 } else { 2 };
        for step in 0..span_count {
            let fraction = if span_count <= 1 {
                0.0
            } else {
                step as f32 / (span_count - 1) as f32
            };
            let time_ms = tone
                .start_ms
                .saturating_add((tone.duration_ms as f32 * fraction).round() as u32);
            let time_norm = percent01(time_ms, duration_ms);
            let angle = phase_angle(tone.phase) + fraction as f64 * PI;
            let radius = 1.15 + (tone.frequency_hz / 144.0).log2().abs().fract() as f32 * 0.55;
            points.push(AmbientCymaticFieldPoint {
                point_index: points.len() + 1,
                time_ms,
                time_norm,
                phase: tone.phase,
                frequency_hz: tone.frequency_hz,
                amplitude: tone.amplitude,
                x: round4(tone.spatial_x + radius * angle.cos() as f32 * 0.18),
                y: round4(tone.spatial_y + tone.amplitude * 0.2),
                z: round4(time_norm * 2.0 - 1.0),
                color_hex: tone.color_hex.clone(),
                role: if tone.event_kind == "note" {
                    "tone_frequency_marker".to_string()
                } else {
                    "gesture_phase_marker".to_string()
                },
            });
        }
    }
    points
}

fn active_tones_at(tones: &[CymaticTone], time_ms: u32) -> Vec<&CymaticTone> {
    tones
        .iter()
        .filter(|tone| {
            let start = tone.start_ms.saturating_sub(ACTIVE_WINDOW_PAD_MS);
            let end = tone.end_ms.saturating_add(ACTIVE_WINDOW_PAD_MS);
            time_ms >= start && time_ms <= end
        })
        .collect()
}

fn tone_envelope(tone: &CymaticTone, time_ms: u32) -> f32 {
    let start = tone.start_ms as i64;
    let end = tone.end_ms.max(tone.start_ms + 1) as i64;
    let time = time_ms as i64;
    if time < start {
        let distance = (start - time) as f32;
        return (1.0 - distance / ACTIVE_WINDOW_PAD_MS as f32).clamp(0.0, 0.35);
    }
    if time > end {
        let distance = (time - end) as f32;
        return (1.0 - distance / ACTIVE_WINDOW_PAD_MS as f32).clamp(0.0, 0.35);
    }
    let duration = (end - start).max(1) as f32;
    let local = (time - start) as f32 / duration;
    let attack = (local / 0.12).clamp(0.0, 1.0);
    let release = ((1.0 - local) / 0.18).clamp(0.0, 1.0);
    attack.min(release).max(0.25)
}

fn create_phase_color_bands(root_frequency_hz: f64) -> Vec<PhaseColorBand> {
    HFIELD_PHASE_ORDER
        .iter()
        .map(|phase| {
            let hue = phase_hue(*phase);
            PhaseColorBand {
                phase: *phase,
                phase_role: phase_role(*phase).to_string(),
                anchor_role: anchor_role(*phase).to_string(),
                base_frequency_hz: round3(root_frequency_hz.max(1.0) * *phase as f64),
                color_hex: hsl_to_hex(
                    hue,
                    0.86,
                    if [1, 5, 9].contains(phase) {
                        0.72
                    } else {
                        0.58
                    },
                ),
                hue_degrees: round4(hue),
                semantic_note: match *phase {
                    1 => "center/root is held in warm luminous gold-white".to_string(),
                    5 => "lower/depth is held in amber copper weight".to_string(),
                    9 => "upper/expression is held in blue-violet lift".to_string(),
                    _ => "phase color is governed by HCS canonical frequency profile".to_string(),
                },
            }
        })
        .collect()
}

fn phase_color_band(bands: &[PhaseColorBand], phase: u8) -> &PhaseColorBand {
    bands
        .iter()
        .find(|band| band.phase == phase)
        .unwrap_or_else(|| {
            bands
                .iter()
                .find(|band| band.phase == 1)
                .expect("phase color band 1 exists")
        })
}

fn phase_hue(phase: u8) -> f32 {
    match phase {
        1 => 48.0,
        2 => 198.0,
        3 => 138.0,
        4 => 222.0,
        5 => 32.0,
        6 => 302.0,
        7 => 168.0,
        8 => 348.0,
        9 => 262.0,
        _ => 48.0,
    }
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

fn anchor_role(phase: u8) -> &'static str {
    match phase {
        4..=6 => "lower_depth_weight",
        7..=9 => "upper_lift_expression",
        _ => "center_home_root",
    }
}

fn phase_angle(phase: u8) -> f64 {
    let index = HFIELD_PHASE_ORDER
        .iter()
        .position(|candidate| *candidate == phase)
        .unwrap_or(0) as f64;
    2.0 * PI * index / 9.0
}

fn percent01(value_ms: u32, duration_ms: u32) -> f32 {
    if duration_ms == 0 {
        0.0
    } else {
        ((value_ms as f64 / duration_ms as f64).clamp(0.0, 1.0) as f32 * 10000.0).round() / 10000.0
    }
}

fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

fn round4(value: f32) -> f32 {
    (value * 10_000.0).round() / 10_000.0
}

fn hsl_to_hex(h: f32, s: f32, l: f32) -> String {
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let h_prime = (h / 60.0).rem_euclid(6.0);
    let x = c * (1.0 - (h_prime.rem_euclid(2.0) - 1.0).abs());
    let (r1, g1, b1) = match h_prime {
        hp if (0.0..1.0).contains(&hp) => (c, x, 0.0),
        hp if (1.0..2.0).contains(&hp) => (x, c, 0.0),
        hp if (2.0..3.0).contains(&hp) => (0.0, c, x),
        hp if (3.0..4.0).contains(&hp) => (0.0, x, c),
        hp if (4.0..5.0).contains(&hp) => (x, 0.0, c),
        _ => (c, 0.0, x),
    };
    let m = l - c / 2.0;
    rgb_to_hex(r1 + m, g1 + m, b1 + m)
}

fn rgb_to_hex(r: f32, g: f32, b: f32) -> String {
    let rr = (r.clamp(0.0, 1.0) * 255.0).round() as u8;
    let gg = (g.clamp(0.0, 1.0) * 255.0).round() as u8;
    let bb = (b.clamp(0.0, 1.0) * 255.0).round() as u8;
    format!("#{rr:02x}{gg:02x}{bb:02x}")
}

fn hex_to_rgb(hex: &str) -> (f32, f32, f32) {
    let clean = hex.trim_start_matches('#');
    if clean.len() != 6 {
        return (1.0, 1.0, 1.0);
    }
    let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(255) as f32 / 255.0;
    let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(255) as f32 / 255.0;
    let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(255) as f32 / 255.0;
    (r, g, b)
}

fn stable_reader_hash(report: &HfieldCymaticReaderSurfaceReport) -> String {
    let mut clone = report.clone();
    clone.deterministic_reader_hash.clear();
    let bytes = serde_json::to_vec(&clone).unwrap_or_default();
    blake3::hash(&bytes).to_hex().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use hfield_domain::{FieldScore, NoteEvent};

    fn chord_score() -> FieldScore {
        let mut score = FieldScore::default_hcs();
        score.music.tracks[0].notes = vec![
            NoteEvent {
                midi_note: 60,
                start_ms: 0,
                duration_ms: 1200,
                velocity: 0.82,
            },
            NoteEvent {
                midi_note: 64,
                start_ms: 0,
                duration_ms: 1200,
                velocity: 0.72,
            },
            NoteEvent {
                midi_note: 67,
                start_ms: 0,
                duration_ms: 1200,
                velocity: 0.78,
            },
        ];
        score.music.tracks[1].notes = vec![NoteEvent {
            midi_note: 48,
            start_ms: 0,
            duration_ms: 1200,
            velocity: 0.66,
        }];
        score
    }

    #[test]
    fn creates_glass_reader_surface_from_default_score() {
        let report = synthesize_hfield_cymatic_reader_surface(&FieldScore::default_hcs());
        assert_eq!(
            report.cymatic_reader_contract_id,
            CYMATIC_READER_CONTRACT_ID
        );
        assert_eq!(report.glass_reader.label, "Glass Reader Plane");
        assert_eq!(report.reader_surface.vertex_count, X_SEGMENTS * T_SEGMENTS);
        assert_eq!(
            report.reader_surface.triangle_count,
            (X_SEGMENTS - 1) * (T_SEGMENTS - 1) * 2
        );
    }

    #[test]
    fn chord_score_produces_polyphonic_interference() {
        let report = synthesize_hfield_cymatic_reader_surface(&chord_score());
        assert!(report.active_tones.len() >= 4);
        assert!(report.reader_surface.polyphonic_interference_count > 0);
        assert!(report.reader_surface.max_abs_displacement > 0.0);
        assert!(report
            .reader_surface
            .vertices
            .iter()
            .any(|vertex| vertex.active_tone_count > 1));
    }

    #[test]
    fn color_profile_preserves_anchors() {
        let report = synthesize_hfield_cymatic_reader_surface(&FieldScore::default_hcs());
        let phase_1 = phase_color_band(&report.anchor_colors, 1);
        let phase_5 = phase_color_band(&report.anchor_colors, 5);
        let phase_9 = phase_color_band(&report.anchor_colors, 9);
        assert_eq!(phase_1.anchor_role, "center_home_root");
        assert_eq!(phase_5.anchor_role, "lower_depth_weight");
        assert_eq!(phase_9.anchor_role, "upper_lift_expression");
        assert_ne!(phase_1.color_hex, phase_5.color_hex);
        assert_ne!(phase_5.color_hex, phase_9.color_hex);
    }

    #[test]
    fn mesh_output_is_deterministic() {
        let score = chord_score();
        let a = synthesize_hfield_cymatic_reader_surface(&score);
        let b = synthesize_hfield_cymatic_reader_surface(&score);
        assert_eq!(a.deterministic_reader_hash, b.deterministic_reader_hash);
        assert_eq!(a.reader_surface.vertices, b.reader_surface.vertices);
        assert_eq!(a.interference_slices, b.interference_slices);
    }

    #[test]
    fn surface_uses_frequency_colors_from_active_tones() {
        let report = synthesize_hfield_cymatic_reader_surface(&chord_score());
        let colored_vertices = report
            .reader_surface
            .vertices
            .iter()
            .filter(|vertex| vertex.intensity > 0.0)
            .count();
        assert!(colored_vertices > 0);
        assert!(report
            .active_tones
            .iter()
            .all(|tone| tone.color_hex.starts_with('#')));
    }
}
