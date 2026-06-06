use hfield_domain::{
    FieldScore, HFIELD_ANCHOR_LAYOUT_ID, HFIELD_FORMAT_ID, HFIELD_IDENTITY_PROVENANCE_CONTRACT_ID,
    HFIELD_PACKET_CONTRACT_ID, HFIELD_PHASE_COUNT, HFIELD_PHASE_ORDER, HFIELD_VERSION,
};
use hfield_storage::score_hash_hex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HfieldPacketContractReport {
    pub status: String,
    pub contract_id: String,
    pub file_format: String,
    pub file_version: String,
    pub packet_kind: String,
    pub packet_role: String,
    pub source_system: String,
    pub target_systems: Vec<String>,
    pub analog_bridge_intent: String,
    pub root_frequency_hz: f64,
    pub phase_count: u8,
    pub phase_order: Vec<u8>,
    pub anchor_layout: String,
    pub payload_layers: Vec<String>,
    pub render_targets: Vec<String>,
    pub forge_bridge_status: String,
    pub forge_bridge_profile: String,
    pub provenance_contract_id: String,
    pub artifact_id: String,
    pub artifact_kind: String,
    pub custody_model: String,
    pub disclosure_class: String,
    pub identity_vault_status: String,
    pub creator_principal_bound: bool,
    pub contributor_count: usize,
    pub parent_artifact_count: usize,
    pub derivative_chain_count: usize,
    pub forge_trace_ref_bound: bool,
    pub memory_capsule_ref_bound: bool,
    pub authority_receipt_ref_bound: bool,
    pub consent_event_ref_bound: bool,
    pub provenance_hash_bound: bool,
    pub raw_private_identity_exported: bool,
    pub public_identity_authorized: bool,
    pub economic_processing_authorized: bool,
    pub portable_rights_authorized: bool,
    pub note_count: usize,
    pub conductor_event_count: usize,
    pub packet_hash: String,
    pub readiness: PacketReadiness,
    pub custody_readiness: CustodyReadiness,
    pub fatal_errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PacketReadiness {
    pub hcs_readable: bool,
    pub analog_renderable: bool,
    pub forge_bridge_reserved: bool,
    pub forge_runtime_bound: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CustodyReadiness {
    pub identity_vault_reference_only: bool,
    pub private_identity_contained: bool,
    pub creator_bound: bool,
    pub provenance_hash_bound: bool,
    pub public_disclosure_authorized: bool,
    pub economic_processing_authorized: bool,
    pub portable_rights_authorized: bool,
}

pub fn validate_hfield_packet_contract(score: &FieldScore) -> HfieldPacketContractReport {
    let mut fatal_errors = Vec::new();
    let mut warnings = Vec::new();

    validate_packet_core(score, &mut fatal_errors, &mut warnings);
    validate_identity_provenance(score, &mut fatal_errors, &mut warnings);

    let note_count = note_count(score);
    let conductor_event_count = conductor_event_count(score);

    if note_count == 0 {
        warnings.push("packet contains no music notes yet".to_string());
    }

    if conductor_event_count == 0 {
        warnings.push("packet contains no conductor gesture events yet".to_string());
    }

    if score.music.tracks.is_empty() {
        fatal_errors.push("packet music track list must not be empty".to_string());
    }

    if score
        .conductor
        .primary_hand_track
        .track_id
        .trim()
        .is_empty()
    {
        fatal_errors.push("packet primary conductor track id must not be empty".to_string());
    }

    let forge_runtime_bound = score.packet.forge_bridge.forge_runtime_ref.is_some()
        || score.packet.forge_bridge.symbolic_trace_ref.is_some()
        || score.packet.forge_bridge.validation_ref.is_some()
        || score.provenance.forge_trace_ref.is_some();

    let identity_vault_reference_only =
        score.provenance.custody_model == "identity_vault_reference_only";
    let private_identity_contained = !score.provenance.raw_private_identity_exported;
    let creator_bound = score.provenance.creator.principal_id.is_some();
    let provenance_hash_bound = score.provenance.provenance_hash.is_some();
    let public_disclosure_authorized = score.provenance.public_identity_authorized;
    let economic_processing_authorized = score.provenance.economic_processing_authorized;
    let portable_rights_authorized = score.provenance.portable_rights_authorized;

    let readiness = PacketReadiness {
        hcs_readable: fatal_errors.is_empty(),
        analog_renderable: fatal_errors.is_empty() && (note_count > 0 || conductor_event_count > 0),
        forge_bridge_reserved: score.packet.forge_bridge.status == "reserved"
            || forge_runtime_bound,
        forge_runtime_bound,
    };

    let custody_readiness = CustodyReadiness {
        identity_vault_reference_only,
        private_identity_contained,
        creator_bound,
        provenance_hash_bound,
        public_disclosure_authorized,
        economic_processing_authorized,
        portable_rights_authorized,
    };

    let status = if !fatal_errors.is_empty() {
        "error"
    } else if !warnings.is_empty() {
        "warning"
    } else {
        "ok"
    }
    .to_string();

    HfieldPacketContractReport {
        status,
        contract_id: score.packet.contract_id.clone(),
        file_format: score.format.clone(),
        file_version: score.version.clone(),
        packet_kind: score.packet.packet_kind.clone(),
        packet_role: score.packet.packet_role.clone(),
        source_system: score.packet.source_system.clone(),
        target_systems: score.packet.target_systems.clone(),
        analog_bridge_intent: score.packet.analog_bridge_intent.clone(),
        root_frequency_hz: score.root_frequency_hz,
        phase_count: score.packet.phase_profile.phase_count,
        phase_order: score.packet.phase_profile.phase_order.clone(),
        anchor_layout: score.packet.phase_profile.anchor_layout.clone(),
        payload_layers: score.packet.payload_layers.clone(),
        render_targets: score.packet.render_targets.clone(),
        forge_bridge_status: score.packet.forge_bridge.status.clone(),
        forge_bridge_profile: score.packet.forge_bridge.bridge_profile.clone(),
        provenance_contract_id: score.provenance.contract_id.clone(),
        artifact_id: score.provenance.artifact_id.clone(),
        artifact_kind: score.provenance.artifact_kind.clone(),
        custody_model: score.provenance.custody_model.clone(),
        disclosure_class: score.provenance.disclosure_class.clone(),
        identity_vault_status: score.provenance.identity_vault.status.clone(),
        creator_principal_bound: score.provenance.creator.principal_id.is_some(),
        contributor_count: score.provenance.contributors.len(),
        parent_artifact_count: score.provenance.parent_artifacts.len(),
        derivative_chain_count: score.provenance.derivative_chain.len(),
        forge_trace_ref_bound: score.provenance.forge_trace_ref.is_some(),
        memory_capsule_ref_bound: score.provenance.memory_capsule_ref.is_some(),
        authority_receipt_ref_bound: score.provenance.authority_receipt_ref.is_some(),
        consent_event_ref_bound: score.provenance.consent_event_ref.is_some(),
        provenance_hash_bound: score.provenance.provenance_hash.is_some(),
        raw_private_identity_exported: score.provenance.raw_private_identity_exported,
        public_identity_authorized: score.provenance.public_identity_authorized,
        economic_processing_authorized: score.provenance.economic_processing_authorized,
        portable_rights_authorized: score.provenance.portable_rights_authorized,
        note_count,
        conductor_event_count,
        packet_hash: score_hash_hex(score).unwrap_or_else(|_| "hash_unavailable".to_string()),
        readiness,
        custody_readiness,
        fatal_errors,
        warnings,
    }
}

fn validate_packet_core(
    score: &FieldScore,
    fatal_errors: &mut Vec<String>,
    warnings: &mut Vec<String>,
) {
    if score.format != HFIELD_FORMAT_ID {
        fatal_errors.push(format!(
            "invalid .hfield format: expected {HFIELD_FORMAT_ID}, found {}",
            score.format
        ));
    }

    if score.version != HFIELD_VERSION {
        warnings.push(format!(
            "version differs from current writer: expected {HFIELD_VERSION}, found {}",
            score.version
        ));
    }

    if score.packet.contract_id != HFIELD_PACKET_CONTRACT_ID {
        fatal_errors.push(format!(
            "invalid packet contract id: expected {HFIELD_PACKET_CONTRACT_ID}, found {}",
            score.packet.contract_id
        ));
    }

    if score.packet.phase_profile.phase_count != HFIELD_PHASE_COUNT {
        fatal_errors.push(format!(
            "invalid phase count: expected {HFIELD_PHASE_COUNT}, found {}",
            score.packet.phase_profile.phase_count
        ));
    }

    if score.packet.phase_profile.phase_order != HFIELD_PHASE_ORDER.to_vec() {
        fatal_errors.push(format!(
            "invalid phase order: expected {:?}, found {:?}",
            HFIELD_PHASE_ORDER, score.packet.phase_profile.phase_order
        ));
    }

    if (score.root_frequency_hz - 144.0).abs() > f64::EPSILON {
        warnings.push(format!(
            "root frequency differs from AI.Web v1 core: expected 144 Hz, found {} Hz",
            score.root_frequency_hz
        ));
    }

    if (score.packet.phase_profile.root_frequency_hz - score.root_frequency_hz).abs() > f64::EPSILON
    {
        fatal_errors.push(format!(
            "packet root frequency {} does not match score root frequency {}",
            score.packet.phase_profile.root_frequency_hz, score.root_frequency_hz
        ));
    }

    if score.packet.phase_profile.anchor_layout != HFIELD_ANCHOR_LAYOUT_ID {
        fatal_errors.push(format!(
            "invalid packet anchor layout: expected {HFIELD_ANCHOR_LAYOUT_ID}, found {}",
            score.packet.phase_profile.anchor_layout
        ));
    }

    if score.conductor.field_layout != HFIELD_ANCHOR_LAYOUT_ID {
        warnings.push(format!(
            "conductor field layout differs from packet anchor layout: {}",
            score.conductor.field_layout
        ));
    }

    require_payload_layer(score, "score", fatal_errors);
    require_payload_layer(score, "frequency_phase", fatal_errors);
    require_payload_layer(score, "gesture", fatal_errors);
    require_payload_layer(score, "field", fatal_errors);
    require_payload_layer(score, "render", fatal_errors);
    require_payload_layer(score, "forge_bridge", fatal_errors);

    if !score
        .packet
        .target_systems
        .iter()
        .any(|target| target.eq_ignore_ascii_case("Forge"))
    {
        fatal_errors
            .push("packet target systems must include Forge for bridge readiness".to_string());
    }

    if score.packet.forge_bridge.status == "reserved" {
        warnings.push(
            "Forge bridge is reserved but not yet bound to a live Forge runtime reference"
                .to_string(),
        );
    }
}

fn validate_identity_provenance(
    score: &FieldScore,
    fatal_errors: &mut Vec<String>,
    warnings: &mut Vec<String>,
) {
    if score.provenance.contract_id != HFIELD_IDENTITY_PROVENANCE_CONTRACT_ID {
        fatal_errors.push(format!(
            "invalid identity provenance contract id: expected {HFIELD_IDENTITY_PROVENANCE_CONTRACT_ID}, found {}",
            score.provenance.contract_id
        ));
    }

    if score.provenance.artifact_kind != "harmonic_field_packet" {
        fatal_errors.push(format!(
            "invalid artifact kind: expected harmonic_field_packet, found {}",
            score.provenance.artifact_kind
        ));
    }

    if score.provenance.custody_model != "identity_vault_reference_only" {
        fatal_errors.push(format!(
            "invalid custody model: expected identity_vault_reference_only, found {}",
            score.provenance.custody_model
        ));
    }

    if !is_allowed_disclosure_class(&score.provenance.disclosure_class) {
        fatal_errors.push(format!(
            "invalid disclosure class: {}",
            score.provenance.disclosure_class
        ));
    }

    if score.provenance.raw_private_identity_exported {
        fatal_errors.push(
            ".hfield must not export raw private identity payloads from Identity Vault".to_string(),
        );
    }

    if score.provenance.public_identity_authorized {
        fatal_errors.push(
            "public identity disclosure is not authorized by the v1 .hfield custody contract"
                .to_string(),
        );
    }

    if score.provenance.economic_processing_authorized {
        fatal_errors.push(
            "economic processing is not authorized by the v1 .hfield custody contract".to_string(),
        );
    }

    if score.provenance.portable_rights_authorized {
        fatal_errors.push(
            "portable rights transfer is not authorized by the v1 .hfield custody contract"
                .to_string(),
        );
    }

    if score.provenance.identity_vault.status == "unbound" {
        warnings.push(
            "Identity Vault reference is unbound; provenance remains local/private".to_string(),
        );
    }

    if score.provenance.creator.principal_id.is_none() {
        warnings.push("creator principal is unbound; artifact is not yet attributable".to_string());
    }

    if score.provenance.authority_receipt_ref.is_none() {
        warnings.push("authority receipt reference is not yet bound".to_string());
    }

    if score.provenance.consent_event_ref.is_none() {
        warnings.push("consent event reference is not yet bound".to_string());
    }

    if score.provenance.provenance_hash.is_none() {
        warnings.push("provenance hash is not yet sealed".to_string());
    }
}

fn is_allowed_disclosure_class(value: &str) -> bool {
    matches!(
        value,
        "private_reference_only"
            | "internal_attribution_reference"
            | "capsule_candidate_reference"
            | "public_attribution_reserved"
    )
}

fn require_payload_layer(score: &FieldScore, layer: &str, fatal_errors: &mut Vec<String>) {
    if !score
        .packet
        .payload_layers
        .iter()
        .any(|value| value == layer)
    {
        fatal_errors.push(format!("packet payload layer is missing: {layer}"));
    }
}

pub fn assert_hfield_packet_openable(
    score: &FieldScore,
) -> Result<HfieldPacketContractReport, String> {
    let report = validate_hfield_packet_contract(score);

    if report.fatal_errors.is_empty() {
        Ok(report)
    } else {
        Err(format!(
            "invalid .hfield packet contract: {}",
            report.fatal_errors.join("; ")
        ))
    }
}

fn note_count(score: &FieldScore) -> usize {
    score
        .music
        .tracks
        .iter()
        .map(|track| track.notes.len())
        .sum()
}

fn conductor_event_count(score: &FieldScore) -> usize {
    score.conductor.primary_hand_track.events.len()
}

#[cfg(test)]
mod tests {
    use super::*;
    use hfield_domain::{FieldScore, NoteEvent};

    #[test]
    fn default_packet_has_contract_but_warns_about_empty_score_and_unbound_custody() {
        let score = FieldScore::default_hcs();
        let report = validate_hfield_packet_contract(&score);

        assert!(report.fatal_errors.is_empty());
        assert_eq!(report.contract_id, HFIELD_PACKET_CONTRACT_ID);
        assert_eq!(
            report.provenance_contract_id,
            HFIELD_IDENTITY_PROVENANCE_CONTRACT_ID
        );
        assert_eq!(report.phase_count, 9);
        assert_eq!(report.phase_order, vec![2, 1, 3, 4, 5, 6, 7, 9, 8]);
        assert!(report.custody_readiness.identity_vault_reference_only);
        assert!(report.custody_readiness.private_identity_contained);
        assert!(report
            .warnings
            .iter()
            .any(|warning| warning.contains("no music notes")));
        assert!(report
            .warnings
            .iter()
            .any(|warning| warning.contains("Identity Vault reference is unbound")));
    }

    #[test]
    fn populated_score_is_hcs_readable_analog_renderable_and_private_by_default() {
        let mut score = FieldScore::default_hcs();
        score.music.tracks[0].notes.push(NoteEvent {
            midi_note: 64,
            start_ms: 0,
            duration_ms: 714,
            velocity: 0.8,
        });

        let report = validate_hfield_packet_contract(&score);

        assert!(report.fatal_errors.is_empty());
        assert!(report.readiness.hcs_readable);
        assert!(report.readiness.analog_renderable);
        assert!(report.readiness.forge_bridge_reserved);
        assert!(!report.raw_private_identity_exported);
        assert!(!report.public_identity_authorized);
        assert!(!report.economic_processing_authorized);
        assert!(!report.portable_rights_authorized);
    }

    #[test]
    fn rejects_wrong_phase_count() {
        let mut score = FieldScore::default_hcs();
        score.packet.phase_profile.phase_count = 8;

        let report = validate_hfield_packet_contract(&score);

        assert_eq!(report.status, "error");
        assert!(report
            .fatal_errors
            .iter()
            .any(|error| error.contains("invalid phase count")));
    }

    #[test]
    fn requires_forge_as_target_system() {
        let mut score = FieldScore::default_hcs();
        score.packet.target_systems = vec!["HCS".to_string()];

        let report = validate_hfield_packet_contract(&score);

        assert!(report
            .fatal_errors
            .iter()
            .any(|error| error.contains("must include Forge")));
    }

    #[test]
    fn rejects_raw_private_identity_export() {
        let mut score = FieldScore::default_hcs();
        score.provenance.raw_private_identity_exported = true;

        let report = validate_hfield_packet_contract(&score);

        assert_eq!(report.status, "error");
        assert!(report
            .fatal_errors
            .iter()
            .any(|error| error.contains("must not export raw private identity")));
    }

    #[test]
    fn rejects_public_or_economic_authority_without_future_gate() {
        let mut score = FieldScore::default_hcs();
        score.provenance.public_identity_authorized = true;
        score.provenance.economic_processing_authorized = true;
        score.provenance.portable_rights_authorized = true;

        let report = validate_hfield_packet_contract(&score);

        assert_eq!(report.status, "error");
        assert!(report
            .fatal_errors
            .iter()
            .any(|error| error.contains("public identity disclosure")));
        assert!(report
            .fatal_errors
            .iter()
            .any(|error| error.contains("economic processing")));
        assert!(report
            .fatal_errors
            .iter()
            .any(|error| error.contains("portable rights transfer")));
    }

    #[test]
    fn rejects_invalid_disclosure_class() {
        let mut score = FieldScore::default_hcs();
        score.provenance.disclosure_class = "raw_public_identity".to_string();

        let report = validate_hfield_packet_contract(&score);

        assert!(report
            .fatal_errors
            .iter()
            .any(|error| error.contains("invalid disclosure class")));
    }
}
