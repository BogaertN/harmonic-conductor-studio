use serde::{Deserialize, Serialize};

pub const HFIELD_FORMAT_ID: &str = "aiweb.hfield";
pub const HFIELD_VERSION: &str = "0.1.0";
pub const HFIELD_PACKET_CONTRACT_ID: &str = "aiweb.hfield.packet_contract.v1";
pub const HFIELD_IDENTITY_PROVENANCE_CONTRACT_ID: &str =
    "aiweb.hfield.identity_provenance_contract.v1";
pub const DEFAULT_ROOT_FREQUENCY_HZ: f64 = 144.0;
pub const HFIELD_PHASE_COUNT: u8 = 9;
pub const HFIELD_PHASE_ORDER: [u8; 9] = [2, 1, 3, 4, 5, 6, 7, 9, 8];
pub const HFIELD_ANCHOR_LAYOUT_ID: &str = "center_1_lower_5_upper_9";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldScore {
    pub format: String,
    pub version: String,
    #[serde(default)]
    pub packet: HfieldPacketContract,
    #[serde(default)]
    pub provenance: HfieldIdentityProvenanceContract,
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
            packet: HfieldPacketContract::default(),
            provenance: HfieldIdentityProvenanceContract::default(),
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
pub struct HfieldPacketContract {
    pub contract_id: String,
    pub packet_kind: String,
    pub packet_role: String,
    pub source_system: String,
    pub target_systems: Vec<String>,
    pub analog_bridge_intent: String,
    pub phase_profile: NinePhaseProfile,
    pub payload_layers: Vec<String>,
    pub render_targets: Vec<String>,
    pub forge_bridge: ForgeBridgeDescriptor,
    pub migration_profile: String,
}

impl Default for HfieldPacketContract {
    fn default() -> Self {
        Self {
            contract_id: HFIELD_PACKET_CONTRACT_ID.to_string(),
            packet_kind: "harmonic_symbolic_field_packet".to_string(),
            packet_role: "human_readable_and_forge_bridgeable_source_object".to_string(),
            source_system: "HCS".to_string(),
            target_systems: vec!["HCS".to_string(), "Forge".to_string()],
            analog_bridge_intent: "render_digital_symbolic_state_as_score_sound_gesture_and_field"
                .to_string(),
            phase_profile: NinePhaseProfile::default(),
            payload_layers: vec![
                "score".to_string(),
                "frequency_phase".to_string(),
                "gesture".to_string(),
                "field".to_string(),
                "render".to_string(),
                "forge_bridge".to_string(),
            ],
            render_targets: vec![
                "notation".to_string(),
                "audio".to_string(),
                "conductor_motion".to_string(),
                "three_dimensional_field_reserved".to_string(),
                "cymatic_field_reserved".to_string(),
            ],
            forge_bridge: ForgeBridgeDescriptor::default(),
            migration_profile: "no_migration_required_v1".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NinePhaseProfile {
    pub phase_count: u8,
    pub phase_order: Vec<u8>,
    pub anchor_layout: String,
    pub root_frequency_hz: f64,
    pub communication_mode: String,
}

impl Default for NinePhaseProfile {
    fn default() -> Self {
        Self {
            phase_count: HFIELD_PHASE_COUNT,
            phase_order: HFIELD_PHASE_ORDER.to_vec(),
            anchor_layout: HFIELD_ANCHOR_LAYOUT_ID.to_string(),
            root_frequency_hz: DEFAULT_ROOT_FREQUENCY_HZ,
            communication_mode: "nine_phase_frequency_packet".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ForgeBridgeDescriptor {
    pub status: String,
    pub bridge_profile: String,
    pub forge_runtime_ref: Option<String>,
    pub symbolic_trace_ref: Option<String>,
    pub validation_ref: Option<String>,
}

impl Default for ForgeBridgeDescriptor {
    fn default() -> Self {
        Self {
            status: "reserved".to_string(),
            bridge_profile: "forge_packet_bridge_v0_reserved".to_string(),
            forge_runtime_ref: None,
            symbolic_trace_ref: None,
            validation_ref: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HfieldIdentityProvenanceContract {
    pub contract_id: String,
    pub artifact_id: String,
    pub artifact_kind: String,
    pub custody_model: String,
    pub disclosure_class: String,
    pub identity_vault: IdentityVaultReference,
    pub creator: PrincipalReference,
    pub contributors: Vec<ContributionReference>,
    pub parent_artifacts: Vec<ArtifactReference>,
    pub derivative_chain: Vec<ArtifactReference>,
    pub forge_trace_ref: Option<String>,
    pub memory_capsule_ref: Option<String>,
    pub authority_receipt_ref: Option<String>,
    pub consent_event_ref: Option<String>,
    pub license_ref: Option<String>,
    pub rights_policy_ref: Option<String>,
    pub signature_ref: Option<String>,
    pub provenance_hash: Option<String>,
    pub raw_private_identity_exported: bool,
    pub public_identity_authorized: bool,
    pub economic_processing_authorized: bool,
    pub portable_rights_authorized: bool,
}

impl Default for HfieldIdentityProvenanceContract {
    fn default() -> Self {
        Self {
            contract_id: HFIELD_IDENTITY_PROVENANCE_CONTRACT_ID.to_string(),
            artifact_id: "hfield_artifact_unbound".to_string(),
            artifact_kind: "harmonic_field_packet".to_string(),
            custody_model: "identity_vault_reference_only".to_string(),
            disclosure_class: "private_reference_only".to_string(),
            identity_vault: IdentityVaultReference::default(),
            creator: PrincipalReference::default(),
            contributors: Vec::new(),
            parent_artifacts: Vec::new(),
            derivative_chain: Vec::new(),
            forge_trace_ref: None,
            memory_capsule_ref: None,
            authority_receipt_ref: None,
            consent_event_ref: None,
            license_ref: None,
            rights_policy_ref: None,
            signature_ref: None,
            provenance_hash: None,
            raw_private_identity_exported: false,
            public_identity_authorized: false,
            economic_processing_authorized: false,
            portable_rights_authorized: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct IdentityVaultReference {
    pub status: String,
    pub vault_profile: String,
    pub vault_record_ref: Option<String>,
    pub public_identity_ref: Option<String>,
}

impl Default for IdentityVaultReference {
    fn default() -> Self {
        Self {
            status: "unbound".to_string(),
            vault_profile: "aiweb.identity_vault.reference.v1".to_string(),
            vault_record_ref: None,
            public_identity_ref: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PrincipalReference {
    pub principal_id: Option<String>,
    pub principal_kind: String,
    pub display_label: Option<String>,
    pub identity_vault_ref: Option<String>,
    pub authority_scope: String,
}

impl Default for PrincipalReference {
    fn default() -> Self {
        Self {
            principal_id: None,
            principal_kind: "human_creator".to_string(),
            display_label: None,
            identity_vault_ref: None,
            authority_scope: "creator_unbound_private".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContributionReference {
    pub contributor: PrincipalReference,
    pub contribution_kind: String,
    pub contribution_ref: Option<String>,
    pub contribution_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ArtifactReference {
    pub artifact_id: String,
    pub artifact_kind: String,
    pub relation: String,
    pub proof_hash: Option<String>,
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
            field_layout: HFIELD_ANCHOR_LAYOUT_ID.to_string(),
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

    #[test]
    fn default_score_has_packet_contract() {
        let score = FieldScore::default_hcs();
        assert_eq!(score.packet.contract_id, HFIELD_PACKET_CONTRACT_ID);
        assert_eq!(score.packet.phase_profile.phase_count, 9);
        assert_eq!(
            score.packet.phase_profile.phase_order,
            vec![2, 1, 3, 4, 5, 6, 7, 9, 8]
        );
        assert!(score
            .packet
            .target_systems
            .iter()
            .any(|target| target == "Forge"));
    }

    #[test]
    fn default_score_has_identity_provenance_contract() {
        let score = FieldScore::default_hcs();
        assert_eq!(
            score.provenance.contract_id,
            HFIELD_IDENTITY_PROVENANCE_CONTRACT_ID
        );
        assert_eq!(score.provenance.artifact_kind, "harmonic_field_packet");
        assert_eq!(
            score.provenance.custody_model,
            "identity_vault_reference_only"
        );
        assert_eq!(score.provenance.disclosure_class, "private_reference_only");
        assert!(!score.provenance.raw_private_identity_exported);
        assert!(!score.provenance.public_identity_authorized);
        assert!(!score.provenance.economic_processing_authorized);
        assert!(!score.provenance.portable_rights_authorized);
    }

    #[test]
    fn old_hfield_json_without_packet_defaults_contract() {
        let old_json = r#"{
            "format":"aiweb.hfield",
            "version":"0.1.0",
            "title":"Old Packet",
            "root_frequency_hz":144.0,
            "anchors":{
                "anchor_1":{"ratio":1.0,"role":"center_home_root_presence"},
                "anchor_5":{"ratio":0.5,"role":"lower_depth_weight_transformation"},
                "anchor_9":{"ratio":3.0,"role":"upper_lift_expression_release"}
            },
            "gesture_vocabulary":"nine_gesture_conductor_v0",
            "coupling_profile":"pitch_preview_v0",
            "music":{"tempo_bpm":84.0,"meter":"4/4","tuning_mode":"twelve_tone_equal_temperament","tracks":[]},
            "conductor":{"field_layout":"center_1_lower_5_upper_9","primary_hand_track":{"track_id":"primary_hand","events":[]},"expressive_hand_track":null}
        }"#;

        let score: FieldScore = serde_json::from_str(old_json).expect("old .hfield parses");
        assert_eq!(score.packet.contract_id, HFIELD_PACKET_CONTRACT_ID);
        assert_eq!(score.packet.phase_profile.phase_count, 9);
        assert_eq!(
            score.provenance.contract_id,
            HFIELD_IDENTITY_PROVENANCE_CONTRACT_ID
        );
        assert_eq!(score.provenance.disclosure_class, "private_reference_only");
    }
}
