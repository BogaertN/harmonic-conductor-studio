use serde::{Deserialize, Serialize};

pub const HFIELD_FORMAT_ID: &str = "aiweb.hfield";
pub const HFIELD_VERSION: &str = "0.1.0";
pub const DEFAULT_ROOT_FREQUENCY_HZ: f64 = 144.0;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldScore {
    pub format: String,
    pub version: String,
    pub title: String,
    pub root_frequency_hz: f64,
    pub anchors: AnchorModel,
    pub gesture_vocabulary: String,
    pub coupling_profile: String,
    pub music: MusicScore,
    pub conductor: ConductedPerformance,
}

impl FieldScore {
    pub fn default_hcs() -> Self {
        Self {
            format: HFIELD_FORMAT_ID.to_string(),
            version: HFIELD_VERSION.to_string(),
            title: "Untitled Harmonic Conductor Score".to_string(),
            root_frequency_hz: DEFAULT_ROOT_FREQUENCY_HZ,
            anchors: AnchorModel::default(),
            gesture_vocabulary: "nine_gesture_conductor_v0".to_string(),
            coupling_profile: "pitch_preview_v0".to_string(),
            music: MusicScore::default(),
            conductor: ConductedPerformance::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AnchorModel {
    pub anchor_1: Anchor,
    pub anchor_5: Anchor,
    pub anchor_9: Anchor,
}

impl Default for AnchorModel {
    fn default() -> Self {
        Self {
            anchor_1: Anchor {
                ratio: 1.0,
                role: "center_home_root_presence".to_string(),
            },
            anchor_5: Anchor {
                ratio: 0.5,
                role: "lower_depth_weight_transformation".to_string(),
            },
            anchor_9: Anchor {
                ratio: 3.0,
                role: "upper_lift_expression_release".to_string(),
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Anchor {
    pub ratio: f64,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MusicScore {
    pub tempo_bpm: f64,
    pub meter: String,
    pub tuning_mode: String,
    pub tracks: Vec<MusicTrack>,
}

impl Default for MusicScore {
    fn default() -> Self {
        Self {
            tempo_bpm: 84.0,
            meter: "4/4".to_string(),
            tuning_mode: "twelve_tone_equal_temperament".to_string(),
            tracks: vec![
                MusicTrack {
                    track_id: "lead_voice".to_string(),
                    role: "melody".to_string(),
                    notes: vec![],
                },
                MusicTrack {
                    track_id: "depth_voice".to_string(),
                    role: "bass_depth".to_string(),
                    notes: vec![],
                },
                MusicTrack {
                    track_id: "field_voice".to_string(),
                    role: "harmonic_field_support".to_string(),
                    notes: vec![],
                },
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MusicTrack {
    pub track_id: String,
    pub role: String,
    pub notes: Vec<NoteEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NoteEvent {
    pub midi_note: u8,
    pub start_ms: u32,
    pub duration_ms: u32,
    pub velocity: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ConductedPerformance {
    pub field_layout: String,
    pub primary_hand_track: GestureTrack,
    pub expressive_hand_track: Option<GestureTrack>,
}

impl Default for ConductedPerformance {
    fn default() -> Self {
        Self {
            field_layout: "center_1_lower_5_upper_9".to_string(),
            primary_hand_track: GestureTrack {
                track_id: "primary_hand".to_string(),
                events: vec![
                    GestureEvent {
                        gesture_id: "g2".to_string(),
                        start_ms: 0,
                        duration_ms: 180,
                        intensity: 0.35,
                        operator: Some("prepare".to_string()),
                    },
                    GestureEvent {
                        gesture_id: "g1".to_string(),
                        start_ms: 180,
                        duration_ms: 220,
                        intensity: 0.45,
                        operator: Some("ictus".to_string()),
                    },
                    GestureEvent {
                        gesture_id: "g3".to_string(),
                        start_ms: 400,
                        duration_ms: 220,
                        intensity: 0.50,
                        operator: Some("emerge".to_string()),
                    },
                ],
            },
            expressive_hand_track: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GestureTrack {
    pub track_id: String,
    pub events: Vec<GestureEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GestureEvent {
    pub gesture_id: String,
    pub start_ms: u32,
    pub duration_ms: u32,
    pub intensity: f32,
    pub operator: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_score_uses_hfield_format() {
        let score = FieldScore::default_hcs();
        assert_eq!(score.format, HFIELD_FORMAT_ID);
        assert_eq!(score.root_frequency_hz, 144.0);
        assert_eq!(score.conductor.field_layout, "center_1_lower_5_upper_9");
    }
}
