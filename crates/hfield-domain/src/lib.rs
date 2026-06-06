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
pub const HARMONIC_FIELD_SCORE_V1_CONTRACT_ID: &str = "aiweb.hfield.harmonic_field_score.v1";
pub const HFIELD_NOTATION_PROBLEM_STATEMENT_ID: &str = "aiweb.hfield.notation_problem_statement.v1";
pub const HFIELD_RENDER_VIEW_REGISTRY_ID: &str = "aiweb.hfield.render_view_registry.v1";

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
pub struct HarmonicFieldScoreV1UpgradeReport {
    pub status: &'static str,
    pub contract_id: &'static str,
    pub problem_statement_id: &'static str,
    pub render_view_registry_id: &'static str,
    pub source_object_role: &'static str,
    pub problem_statement: HarmonicFieldNotationProblemStatement,
    pub authority_boundaries: HarmonicFieldScoreAuthorityBoundaries,
    pub source_layer_count: usize,
    pub source_layers: Vec<HarmonicFieldSourceLayer>,
    pub render_view_count: usize,
    pub render_views: Vec<HarmonicFieldRenderView>,
    pub accessibility_policy: HarmonicFieldAccessibilityPolicy,
    pub current_score_inventory: HarmonicFieldCurrentScoreInventory,
    pub readiness_gates: HarmonicFieldScoreReadinessGates,
    pub next_schema_work: Vec<&'static str>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HarmonicFieldNotationProblemStatement {
    pub summary: &'static str,
    pub chess_notation_lesson: &'static str,
    pub music_notation_lesson: &'static str,
    pub hcs_design_rule: &'static str,
    pub non_goal: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HarmonicFieldScoreAuthorityBoundaries {
    pub harmonic_field_score_is_source: bool,
    pub hfield_container_is_persistence_shell: bool,
    pub standard_notation_is_view: bool,
    pub piano_roll_is_view: bool,
    pub tablature_is_view: bool,
    pub audio_is_rendering: bool,
    pub waveform_is_measurement_display: bool,
    pub three_d_field_is_rendering: bool,
    pub cymatic_surface_is_rendering: bool,
    pub forge_bridge_is_adapter: bool,
    pub mutates_forge: bool,
    pub performs_identity_vault_write: bool,
    pub exports_private_identity: bool,
    pub authorizes_health_or_sensor_claims: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HarmonicFieldSourceLayer {
    pub layer_id: &'static str,
    pub owns_source_data: bool,
    pub description: &'static str,
    pub current_binding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HarmonicFieldRenderView {
    pub view_id: &'static str,
    pub rendering_role: &'static str,
    pub reads_from_layers: Vec<&'static str>,
    pub can_mutate_source_without_save_gate: bool,
    pub problem_addressed: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HarmonicFieldAccessibilityPolicy {
    pub principle: &'static str,
    pub supported_or_reserved_views: Vec<&'static str>,
    pub color_is_primary_meaning_channel: bool,
    pub source_data_preserved_across_views: bool,
    pub user_view_choice_must_not_change_score_hash: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HarmonicFieldCurrentScoreInventory {
    pub title: String,
    pub format: String,
    pub version: String,
    pub root_frequency_hz: f64,
    pub anchor_layout_id: String,
    pub phase_order: Vec<u8>,
    pub gesture_vocabulary: String,
    pub coupling_profile: String,
    pub music_track_count: usize,
    pub note_count: usize,
    pub primary_gesture_event_count: usize,
    pub expressive_gesture_event_count: usize,
    pub payload_layer_count: usize,
    pub render_target_count: usize,
    pub packet_contract_id: String,
    pub provenance_contract_id: String,
    pub forge_bridge_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HarmonicFieldScoreReadinessGates {
    pub has_format_id: bool,
    pub has_schema_version: bool,
    pub has_root_frequency: bool,
    pub has_three_anchor_model: bool,
    pub has_nine_phase_order: bool,
    pub has_music_track_layer: bool,
    pub has_conductor_gesture_layer: bool,
    pub has_packet_contract: bool,
    pub has_identity_provenance_contract: bool,
    pub has_render_targets: bool,
    pub has_reference_only_forge_bridge: bool,
    pub current_score_is_harmonic_field_score_v1_candidate: bool,
}

pub fn create_harmonic_field_score_v1_upgrade_report(
    score: &FieldScore,
) -> HarmonicFieldScoreV1UpgradeReport {
    let source_layers = harmonic_field_score_source_layers(score);
    let render_views = harmonic_field_score_render_views();

    HarmonicFieldScoreV1UpgradeReport {
        status: "ok",
        contract_id: HARMONIC_FIELD_SCORE_V1_CONTRACT_ID,
        problem_statement_id: HFIELD_NOTATION_PROBLEM_STATEMENT_ID,
        render_view_registry_id: HFIELD_RENDER_VIEW_REGISTRY_ID,
        source_object_role: "time_based_layered_three_dimensional_harmonic_trajectory_source",
        problem_statement: HarmonicFieldNotationProblemStatement {
            summary: "Traditional notation, piano roll, tab, colour notation, and analytic grids each optimize one reading surface while sacrificing others; HCS must preserve the underlying field once and render many lawful views from it.",
            chess_notation_lesson: "A durable notation standard wins by compactly preserving replayable state, not by describing every perception in prose.",
            music_notation_lesson: "Music notation is a layered compromise between pitch, rhythm, harmony, page economy, ensemble reading, accessibility, and performance context.",
            hcs_design_rule: "Do not trap the living harmonic structure inside one frozen representation; the Harmonic Field Score is source, every display is downstream.",
            non_goal: "This patch does not replace standard notation and does not claim any one visual surface is the final truth.",
        },
        authority_boundaries: HarmonicFieldScoreAuthorityBoundaries {
            harmonic_field_score_is_source: true,
            hfield_container_is_persistence_shell: true,
            standard_notation_is_view: true,
            piano_roll_is_view: true,
            tablature_is_view: true,
            audio_is_rendering: true,
            waveform_is_measurement_display: true,
            three_d_field_is_rendering: true,
            cymatic_surface_is_rendering: true,
            forge_bridge_is_adapter: true,
            mutates_forge: false,
            performs_identity_vault_write: false,
            exports_private_identity: false,
            authorizes_health_or_sensor_claims: false,
        },
        source_layer_count: source_layers.len(),
        source_layers,
        render_view_count: render_views.len(),
        render_views,
        accessibility_policy: HarmonicFieldAccessibilityPolicy {
            principle: "Accessibility views may aid perception, but no accessibility view may become the only source record.",
            supported_or_reserved_views: vec![
                "standard_notation",
                "large_staff_notation_reserved",
                "note_name_overlay_reserved",
                "solfege_noteheads_reserved",
                "color_reinforcement_reserved",
                "braille_export_reserved",
                "jianpu_export_reserved",
                "piano_roll_preview_reserved",
            ],
            color_is_primary_meaning_channel: false,
            source_data_preserved_across_views: true,
            user_view_choice_must_not_change_score_hash: true,
        },
        current_score_inventory: harmonic_field_current_score_inventory(score),
        readiness_gates: harmonic_field_score_readiness_gates(score),
        next_schema_work: vec![
            "promote this report into serialized score metadata after migration fixtures exist",
            "bind render-view registry hash into canonical bundle manifest v2",
            "add source-layer explicit objects without breaking archived .hfield files",
            "add accessibility view descriptors as preferences outside the source hash",
            "later bind Forge trace events as source-adapter references, not renderer guesses",
        ],
    }
}

fn harmonic_field_score_source_layers(score: &FieldScore) -> Vec<HarmonicFieldSourceLayer> {
    vec![
        HarmonicFieldSourceLayer {
            layer_id: "score_identity",
            owns_source_data: true,
            description: "format, version, title, and root identity of the field score",
            current_binding: format!(
                "format={} version={} title={}",
                score.format, score.version, score.title
            ),
        },
        HarmonicFieldSourceLayer {
            layer_id: "frequency_anchor_model",
            owns_source_data: true,
            description: "stable frequency anchors that make movement around the field legible",
            current_binding: format!(
                "a1={} a5={} a9={} root={}Hz",
                score.anchors.anchor_1.ratio,
                score.anchors.anchor_5.ratio,
                score.anchors.anchor_9.ratio,
                score.root_frequency_hz
            ),
        },
        HarmonicFieldSourceLayer {
            layer_id: "nine_phase_geometry",
            owns_source_data: true,
            description: "phase order and anchor layout used by field renderers and conductor scans",
            current_binding: format!(
                "layout={} phase_order={:?}",
                score.conductor.field_layout, HFIELD_PHASE_ORDER
            ),
        },
        HarmonicFieldSourceLayer {
            layer_id: "musical_event_layer",
            owns_source_data: true,
            description: "timed pitch events, durations, velocity, meter, tempo, tuning, and tracks",
            current_binding: format!(
                "tracks={} notes={} tempo={} meter={}",
                score.music.tracks.len(),
                harmonic_field_note_count(score),
                score.music.tempo_bpm,
                score.music.meter
            ),
        },
        HarmonicFieldSourceLayer {
            layer_id: "gesture_motion_layer",
            owns_source_data: true,
            description: "timed conductor gesture events through the G1-G9 physical gesture engine",
            current_binding: format!(
                "vocabulary={} primary_events={} expressive_events={}",
                score.gesture_vocabulary,
                score.conductor.primary_hand_track.events.len(),
                score
                    .conductor
                    .expressive_hand_track
                    .as_ref()
                    .map(|track| track.events.len())
                    .unwrap_or(0)
            ),
        },
        HarmonicFieldSourceLayer {
            layer_id: "coupling_profile_layer",
            owns_source_data: true,
            description: "rules that bind music, gesture, field, and preview renderers without making any renderer source",
            current_binding: score.coupling_profile.clone(),
        },
        HarmonicFieldSourceLayer {
            layer_id: "packet_and_render_contract_layer",
            owns_source_data: true,
            description: "packet payload layers, render targets, and bridge reservations carried by the .hfield packet",
            current_binding: format!(
                "payload_layers={} render_targets={}",
                score.packet.payload_layers.len(),
                score.packet.render_targets.len()
            ),
        },
        HarmonicFieldSourceLayer {
            layer_id: "identity_provenance_layer",
            owns_source_data: true,
            description: "reference-only custody, artifact identity, derivative chain, consent refs, and provenance hash",
            current_binding: format!(
                "custody={} disclosure={} raw_private_identity_exported={}",
                score.provenance.custody_model,
                score.provenance.disclosure_class,
                score.provenance.raw_private_identity_exported
            ),
        },
        HarmonicFieldSourceLayer {
            layer_id: "forge_adapter_reference_layer",
            owns_source_data: true,
            description: "future Forge trace references stay as adapter/custody references until live execution is authorized elsewhere",
            current_binding: format!(
                "status={} bridge_profile={}",
                score.packet.forge_bridge.status, score.packet.forge_bridge.bridge_profile
            ),
        },
    ]
}

fn harmonic_field_score_render_views() -> Vec<HarmonicFieldRenderView> {
    vec![
        HarmonicFieldRenderView {
            view_id: "standard_staff_notation",
            rendering_role: "human_readable_music_view",
            reads_from_layers: vec!["musical_event_layer", "coupling_profile_layer"],
            can_mutate_source_without_save_gate: false,
            problem_addressed: "preserves traditional music literacy without making staff notation the source object",
        },
        HarmonicFieldRenderView {
            view_id: "conductor_path_view",
            rendering_role: "gesture_time_motion_view",
            reads_from_layers: vec!["gesture_motion_layer", "nine_phase_geometry"],
            can_mutate_source_without_save_gate: false,
            problem_addressed: "shows physical G1-G9 movement and ictus/cutoff behavior from score events",
        },
        HarmonicFieldRenderView {
            view_id: "three_dimensional_field_view",
            rendering_role: "spatial_phase_trajectory_view",
            reads_from_layers: vec![
                "frequency_anchor_model",
                "nine_phase_geometry",
                "gesture_motion_layer",
                "musical_event_layer",
            ],
            can_mutate_source_without_save_gate: false,
            problem_addressed: "renders the field trajectory without flattening it into a page-only representation",
        },
        HarmonicFieldRenderView {
            view_id: "audio_preview",
            rendering_role: "audible_rendering",
            reads_from_layers: vec!["musical_event_layer", "gesture_motion_layer", "coupling_profile_layer"],
            can_mutate_source_without_save_gate: false,
            problem_addressed: "lets the score be heard while keeping WAV output downstream of the score",
        },
        HarmonicFieldRenderView {
            view_id: "waveform_and_spectrum_display",
            rendering_role: "measurement_display",
            reads_from_layers: vec!["audio_preview", "musical_event_layer"],
            can_mutate_source_without_save_gate: false,
            problem_addressed: "shows emitted or previewed sound as measurement/display, not source authority",
        },
        HarmonicFieldRenderView {
            view_id: "cymatic_reader_surface",
            rendering_role: "modeled_cymatic_field_view",
            reads_from_layers: vec![
                "frequency_anchor_model",
                "musical_event_layer",
                "gesture_motion_layer",
            ],
            can_mutate_source_without_save_gate: false,
            problem_addressed: "models surface behavior while preserving the distinction between model and measured physics",
        },
        HarmonicFieldRenderView {
            view_id: "piano_roll_preview_reserved",
            rendering_role: "timeline_editor_view_reserved",
            reads_from_layers: vec!["musical_event_layer"],
            can_mutate_source_without_save_gate: false,
            problem_addressed: "allows a DAW-like view later without confusing piano roll with source truth",
        },
        HarmonicFieldRenderView {
            view_id: "forge_packet_adapter_reserved",
            rendering_role: "future_authorized_forge_adapter",
            reads_from_layers: vec![
                "score_identity",
                "packet_and_render_contract_layer",
                "forge_adapter_reference_layer",
            ],
            can_mutate_source_without_save_gate: false,
            problem_addressed: "keeps Forge trace binding as a governed adapter after HCS replay trust exists",
        },
    ]
}

fn harmonic_field_current_score_inventory(
    score: &FieldScore,
) -> HarmonicFieldCurrentScoreInventory {
    HarmonicFieldCurrentScoreInventory {
        title: score.title.clone(),
        format: score.format.clone(),
        version: score.version.clone(),
        root_frequency_hz: score.root_frequency_hz,
        anchor_layout_id: score.conductor.field_layout.clone(),
        phase_order: HFIELD_PHASE_ORDER.to_vec(),
        gesture_vocabulary: score.gesture_vocabulary.clone(),
        coupling_profile: score.coupling_profile.clone(),
        music_track_count: score.music.tracks.len(),
        note_count: harmonic_field_note_count(score),
        primary_gesture_event_count: score.conductor.primary_hand_track.events.len(),
        expressive_gesture_event_count: score
            .conductor
            .expressive_hand_track
            .as_ref()
            .map(|track| track.events.len())
            .unwrap_or(0),
        payload_layer_count: score.packet.payload_layers.len(),
        render_target_count: score.packet.render_targets.len(),
        packet_contract_id: score.packet.contract_id.clone(),
        provenance_contract_id: score.provenance.contract_id.clone(),
        forge_bridge_status: score.packet.forge_bridge.status.clone(),
    }
}

fn harmonic_field_score_readiness_gates(score: &FieldScore) -> HarmonicFieldScoreReadinessGates {
    let has_three_anchor_model = score.anchors.anchor_1.ratio > 0.0
        && score.anchors.anchor_5.ratio > 0.0
        && score.anchors.anchor_9.ratio > 0.0;
    let has_nine_phase_order = HFIELD_PHASE_ORDER.len() == HFIELD_PHASE_COUNT as usize;
    let has_music_track_layer = !score.music.tracks.is_empty();
    let has_conductor_gesture_layer = !score
        .conductor
        .primary_hand_track
        .track_id
        .trim()
        .is_empty();
    let has_packet_contract = score.packet.contract_id == HFIELD_PACKET_CONTRACT_ID;
    let has_identity_provenance_contract =
        score.provenance.contract_id == HFIELD_IDENTITY_PROVENANCE_CONTRACT_ID;
    let has_render_targets = !score.packet.render_targets.is_empty();
    let has_reference_only_forge_bridge = score.packet.forge_bridge.status == "reserved"
        && score.packet.forge_bridge.forge_runtime_ref.is_none()
        && score.packet.forge_bridge.symbolic_trace_ref.is_none()
        && score.packet.forge_bridge.validation_ref.is_none();

    HarmonicFieldScoreReadinessGates {
        has_format_id: score.format == HFIELD_FORMAT_ID,
        has_schema_version: !score.version.trim().is_empty(),
        has_root_frequency: score.root_frequency_hz > 0.0,
        has_three_anchor_model,
        has_nine_phase_order,
        has_music_track_layer,
        has_conductor_gesture_layer,
        has_packet_contract,
        has_identity_provenance_contract,
        has_render_targets,
        has_reference_only_forge_bridge,
        current_score_is_harmonic_field_score_v1_candidate: score.format == HFIELD_FORMAT_ID
            && score.root_frequency_hz > 0.0
            && has_three_anchor_model
            && has_nine_phase_order
            && has_music_track_layer
            && has_conductor_gesture_layer
            && has_packet_contract
            && has_identity_provenance_contract
            && has_render_targets,
    }
}

fn harmonic_field_note_count(score: &FieldScore) -> usize {
    score
        .music
        .tracks
        .iter()
        .map(|track| track.notes.len())
        .sum()
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

    #[test]
    fn harmonic_field_score_v1_report_keeps_source_and_renderings_separate() {
        let report = create_harmonic_field_score_v1_upgrade_report(&FieldScore::default_hcs());

        assert_eq!(report.contract_id, HARMONIC_FIELD_SCORE_V1_CONTRACT_ID);
        assert!(report.authority_boundaries.harmonic_field_score_is_source);
        assert!(report.authority_boundaries.standard_notation_is_view);
        assert!(report.authority_boundaries.piano_roll_is_view);
        assert!(report.authority_boundaries.audio_is_rendering);
        assert!(report.authority_boundaries.three_d_field_is_rendering);
        assert!(report.authority_boundaries.forge_bridge_is_adapter);
        assert!(!report.authority_boundaries.mutates_forge);
        assert!(!report.authority_boundaries.performs_identity_vault_write);
        assert!(!report.authority_boundaries.exports_private_identity);

        assert!(report
            .source_layers
            .iter()
            .any(|layer| layer.layer_id == "gesture_motion_layer" && layer.owns_source_data));
        assert!(report
            .render_views
            .iter()
            .any(|view| view.view_id == "standard_staff_notation"
                && !view.can_mutate_source_without_save_gate));
    }

    #[test]
    fn harmonic_field_score_v1_report_uses_current_score_inventory() {
        let score = FieldScore::default_hcs();
        let report = create_harmonic_field_score_v1_upgrade_report(&score);

        assert!((report.current_score_inventory.root_frequency_hz - 144.0).abs() < f64::EPSILON);
        assert_eq!(report.current_score_inventory.music_track_count, 3);
        assert_eq!(
            report.current_score_inventory.primary_gesture_event_count,
            3
        );
        assert!(
            report
                .readiness_gates
                .current_score_is_harmonic_field_score_v1_candidate
        );
        assert_eq!(report.source_layer_count, report.source_layers.len());
        assert_eq!(report.render_view_count, report.render_views.len());
        assert!(
            report
                .accessibility_policy
                .source_data_preserved_across_views
        );
    }
}
