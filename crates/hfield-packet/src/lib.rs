use hfield_domain::{
    FieldScore, HFIELD_ANCHOR_LAYOUT_ID, HFIELD_FORMAT_ID, HFIELD_PACKET_CONTRACT_ID,
    HFIELD_PHASE_COUNT, HFIELD_PHASE_ORDER, HFIELD_VERSION,
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
    pub note_count: usize,
    pub conductor_event_count: usize,
    pub packet_hash: String,
    pub readiness: PacketReadiness,
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

pub fn validate_hfield_packet_contract(score: &FieldScore) -> HfieldPacketContractReport {
    let mut fatal_errors = Vec::new();
    let mut warnings = Vec::new();

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

    require_payload_layer(score, "score", &mut fatal_errors);
    require_payload_layer(score, "frequency_phase", &mut fatal_errors);
    require_payload_layer(score, "gesture", &mut fatal_errors);
    require_payload_layer(score, "field", &mut fatal_errors);
    require_payload_layer(score, "render", &mut fatal_errors);
    require_payload_layer(score, "forge_bridge", &mut fatal_errors);

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
        || score.packet.forge_bridge.validation_ref.is_some();

    let readiness = PacketReadiness {
        hcs_readable: fatal_errors.is_empty(),
        analog_renderable: fatal_errors.is_empty() && (note_count > 0 || conductor_event_count > 0),
        forge_bridge_reserved: score.packet.forge_bridge.status == "reserved"
            || forge_runtime_bound,
        forge_runtime_bound,
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
        note_count,
        conductor_event_count,
        packet_hash: score_hash_hex(score).unwrap_or_else(|_| "hash_unavailable".to_string()),
        readiness,
        fatal_errors,
        warnings,
    }
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
    fn default_packet_has_contract_but_warns_about_empty_score() {
        let score = FieldScore::default_hcs();
        let report = validate_hfield_packet_contract(&score);

        assert!(report.fatal_errors.is_empty());
        assert_eq!(report.contract_id, HFIELD_PACKET_CONTRACT_ID);
        assert_eq!(report.phase_count, 9);
        assert_eq!(report.phase_order, vec![2, 1, 3, 4, 5, 6, 7, 9, 8]);
        assert!(report
            .warnings
            .iter()
            .any(|warning| warning.contains("no music notes")));
    }

    #[test]
    fn populated_score_is_hcs_readable_and_analog_renderable() {
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
}
