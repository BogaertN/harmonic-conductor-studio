use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GestureDefinition {
    pub id: &'static str,
    pub display_order: u8,
    pub name: &'static str,
    pub field_region: &'static str,
    pub anchor: &'static str,
    pub physical_action: &'static str,
    pub candidate_association: &'static str,
}

pub fn nine_gesture_vocabulary() -> Vec<GestureDefinition> {
    vec![
        GestureDefinition {
            id: "g2",
            display_order: 1,
            name: "Inward Opening",
            field_region: "center",
            anchor: "anchor_1",
            physical_action: "approach the receptive side of the center root field",
            candidate_association: "prepare, listen, open, receive",
        },
        GestureDefinition {
            id: "g1",
            display_order: 2,
            name: "Root Settle",
            field_region: "center",
            anchor: "anchor_1",
            physical_action: "settle into center home/root presence",
            candidate_association: "home, identity, return, baseline",
        },
        GestureDefinition {
            id: "g3",
            display_order: 3,
            name: "Emergent Extension",
            field_region: "center",
            anchor: "anchor_1",
            physical_action: "extend outward from center into active motion",
            candidate_association: "begin, emerge, initiate, brighten",
        },
        GestureDefinition {
            id: "g4",
            display_order: 4,
            name: "Constraint Entry",
            field_region: "lower",
            anchor: "anchor_5",
            physical_action: "descend into the constrained side of the lower depth field",
            candidate_association: "friction, question, compression, unresolved weight",
        },
        GestureDefinition {
            id: "g5",
            display_order: 5,
            name: "Transformation Hold",
            field_region: "lower",
            anchor: "anchor_5",
            physical_action: "hold or orbit around lower depth/transformation",
            candidate_association: "processing, weight, emotion, transformation",
        },
        GestureDefinition {
            id: "g6",
            display_order: 6,
            name: "Resolving Release",
            field_region: "lower",
            anchor: "anchor_5",
            physical_action: "release outward from lower depth toward center or lift",
            candidate_association: "correction, recovery, release, clarification",
        },
        GestureDefinition {
            id: "g7",
            display_order: 7,
            name: "Expression Binding",
            field_region: "upper",
            anchor: "anchor_9",
            physical_action: "gather into the inward side of the upper expression field",
            candidate_association: "name, bind, prepare expression",
        },
        GestureDefinition {
            id: "g9",
            display_order: 8,
            name: "Formed Expression Hold",
            field_region: "upper",
            anchor: "anchor_9",
            physical_action: "hold completed expression in the upper field",
            candidate_association: "formed output, readiness, completion",
        },
        GestureDefinition {
            id: "g8",
            display_order: 9,
            name: "Outward Emission",
            field_region: "upper",
            anchor: "anchor_9",
            physical_action: "emit outward from the upper expression field",
            candidate_association: "deliver, project, release outward",
        },
    ]
}

pub fn is_valid_gesture_id(id: &str) -> bool {
    nine_gesture_vocabulary().iter().any(|g| g.id == id)
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NineGestureConductorEngineReport {
    pub status: &'static str,
    pub contract_id: &'static str,
    pub gesture_vocabulary_id: &'static str,
    pub engine_role: &'static str,
    pub source_score_gesture_vocabulary: String,
    pub field_layout_id: String,
    pub root_frequency_hz: f64,
    pub research_basis: NineGestureResearchBasis,
    pub authority_boundaries: NineGestureAuthorityBoundaries,
    pub field_geometry: NineGestureFieldGeometry,
    pub conducting_law: ConductingLawSummary,
    pub primitive_count: usize,
    pub primitives: Vec<NineGesturePrimitive>,
    pub current_score_scan: NineGestureScoreScan,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NineGestureResearchBasis {
    pub hcs_architecture_ruling: &'static str,
    pub public_conducting_manual_basis: Vec<&'static str>,
    pub boundary_rule: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NineGestureAuthorityBoundaries {
    pub physical_definition_is_core_logic: bool,
    pub candidate_interpretation_is_editable: bool,
    pub forge_operational_meaning_locked: bool,
    pub mutates_forge: bool,
    pub performs_identity_vault_write: bool,
    pub exports_private_identity: bool,
    pub authorizes_health_or_sensor_claims: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NineGestureFieldGeometry {
    pub layout_id: &'static str,
    pub conductor_order: Vec<&'static str>,
    pub spatial_rows: Vec<Vec<&'static str>>,
    pub anchor_gestures: Vec<&'static str>,
    pub orbit_gestures: Vec<&'static str>,
    pub anchor_frequency_ratios: Vec<AnchorFrequencyRatio>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AnchorFrequencyRatio {
    pub anchor: &'static str,
    pub gesture_id: &'static str,
    pub role: &'static str,
    pub ratio_to_root: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ConductingLawSummary {
    pub downbeat_rule: &'static str,
    pub ictus_rule: &'static str,
    pub preparatory_beat_rule: &'static str,
    pub cutoff_rule: &'static str,
    pub pickup_rule: &'static str,
    pub fermata_rule: &'static str,
    pub style_rule: &'static str,
    pub dynamic_rule: &'static str,
    pub left_hand_rule: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NineGesturePrimitive {
    pub gesture_id: &'static str,
    pub display_order: u8,
    pub name: &'static str,
    pub anchor: &'static str,
    pub anchor_role: &'static str,
    pub field_row: &'static str,
    pub physical_definition: &'static str,
    pub motion_family: &'static str,
    pub conductor_technique_basis: Vec<&'static str>,
    pub candidate_annotations: Vec<&'static str>,
    pub interpretation_status: &'static str,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NineGestureScoreScan {
    pub event_count: usize,
    pub invalid_event_count: usize,
    pub total_duration_ms: u32,
    pub uses_all_nine_gestures: bool,
    pub observed_gesture_ids: Vec<String>,
    pub event_reports: Vec<NineGestureEventReport>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NineGestureEventReport {
    pub event_index: usize,
    pub gesture_id: String,
    pub valid: bool,
    pub primitive_name: String,
    pub physical_definition: String,
    pub candidate_annotations: Vec<String>,
    pub start_ms: u32,
    pub duration_ms: u32,
    pub end_ms: u32,
    pub intensity: f32,
    pub operator: Option<String>,
}

pub fn nine_gesture_engine_primitives() -> Vec<NineGesturePrimitive> {
    vec![
        NineGesturePrimitive {
            gesture_id: "g2",
            display_order: 1,
            name: "Inward Opening",
            anchor: "anchor_1",
            anchor_role: "root_presence_receptive_side",
            field_row: "root_row",
            physical_definition: "approach the receptive side of anchor_1 without claiming final meaning",
            motion_family: "preparatory_approach",
            conductor_technique_basis: vec!["preparatory_beat", "pickup_preparation", "simple_visible_motion"],
            candidate_annotations: vec!["listening", "opening", "receiving", "distinguishing signal from silence"],
            interpretation_status: "candidate_annotation_only_not_forge_law",
        },
        NineGesturePrimitive {
            gesture_id: "g1",
            display_order: 2,
            name: "Root Settle",
            anchor: "anchor_1",
            anchor_role: "root_presence_anchor",
            field_row: "root_row",
            physical_definition: "converge into and stabilize at anchor_1 as the root settling point",
            motion_family: "settle_ictus_hold",
            conductor_technique_basis: vec!["downbeat", "ictus", "steady_fundamental_beat"],
            candidate_annotations: vec!["presence", "centering", "beginning", "returning to baseline"],
            interpretation_status: "candidate_annotation_only_not_forge_law",
        },
        NineGesturePrimitive {
            gesture_id: "g3",
            display_order: 3,
            name: "Emergent Extension",
            anchor: "anchor_1",
            anchor_role: "root_presence_outward_side",
            field_row: "root_row",
            physical_definition: "move outward from anchor_1 toward active expression or the middle field",
            motion_family: "outward_extension",
            conductor_technique_basis: vec!["upbeat", "smooth_pattern_continuation", "phrase_beginning"],
            candidate_annotations: vec!["motion beginning", "intention", "expansion", "first outward articulation"],
            interpretation_status: "candidate_annotation_only_not_forge_law",
        },
        NineGesturePrimitive {
            gesture_id: "g4",
            display_order: 4,
            name: "Constraint Entry",
            anchor: "anchor_5",
            anchor_role: "transformation_inward_side",
            field_row: "transformation_row",
            physical_definition: "move inward toward the constrained side of anchor_5",
            motion_family: "constraint_entry",
            conductor_technique_basis: vec!["controlled_dip", "smaller_pattern_under_constraint", "held_tension"],
            candidate_annotations: vec!["friction", "uncertainty", "question", "compression", "approaching difficulty"],
            interpretation_status: "candidate_annotation_only_not_forge_law",
        },
        NineGesturePrimitive {
            gesture_id: "g5",
            display_order: 5,
            name: "Transformation Hold",
            anchor: "anchor_5",
            anchor_role: "transformation_anchor",
            field_row: "transformation_row",
            physical_definition: "stabilize or orbit around anchor_5 as the transformation holding point",
            motion_family: "processing_hold",
            conductor_technique_basis: vec!["hold", "fermata_readiness", "sustained_phrase_support"],
            candidate_annotations: vec!["processing", "concentration", "comparison", "held tension", "transformation"],
            interpretation_status: "candidate_annotation_only_not_forge_law",
        },
        NineGesturePrimitive {
            gesture_id: "g6",
            display_order: 6,
            name: "Resolving Release",
            anchor: "anchor_5",
            anchor_role: "transformation_outward_side",
            field_row: "transformation_row",
            physical_definition: "move outward from anchor_5 toward stabilization or expression",
            motion_family: "release_from_constraint",
            conductor_technique_basis: vec!["cutoff_tail_as_preparation", "resolution_motion", "return_to_steady_pattern"],
            candidate_annotations: vec!["correction", "clarity", "relief", "transition out of tension"],
            interpretation_status: "candidate_annotation_only_not_forge_law",
        },
        NineGesturePrimitive {
            gesture_id: "g7",
            display_order: 7,
            name: "Expression Binding",
            anchor: "anchor_9",
            anchor_role: "expression_inward_side",
            field_row: "expression_row",
            physical_definition: "approach the inward side of anchor_9 before a formed expression is delivered",
            motion_family: "expression_gathering",
            conductor_technique_basis: vec!["left_hand_cue", "preparatory_expression", "phrase_gathering"],
            candidate_annotations: vec!["naming", "gathering", "preparing a formed phrase", "binding an expression before delivery"],
            interpretation_status: "candidate_annotation_only_not_forge_law",
        },
        NineGesturePrimitive {
            gesture_id: "g9",
            display_order: 8,
            name: "Formed Expression Hold",
            anchor: "anchor_9",
            anchor_role: "expression_anchor",
            field_row: "expression_row",
            physical_definition: "stabilize at anchor_9 as the formed-expression holding point",
            motion_family: "formed_expression_hold",
            conductor_technique_basis: vec!["sustained_hold", "phrase_completion", "readiness_before_release"],
            candidate_annotations: vec!["completed phrase", "coherent formed output", "readiness before release"],
            interpretation_status: "candidate_annotation_only_not_forge_law",
        },
        NineGesturePrimitive {
            gesture_id: "g8",
            display_order: 9,
            name: "Outward Emission",
            anchor: "anchor_9",
            anchor_role: "expression_outward_side",
            field_row: "expression_row",
            physical_definition: "release outward from anchor_9 into visible, audible, or later authorized expression",
            motion_family: "outward_emission",
            conductor_technique_basis: vec!["final_cutoff_release", "projected_phrase_end", "definite_bounce"],
            candidate_annotations: vec!["delivery", "projection", "external expression", "audible discharge"],
            interpretation_status: "candidate_annotation_only_not_forge_law",
        },
    ]
}

pub fn nine_gesture_engine_primitive(id: &str) -> Option<NineGesturePrimitive> {
    nine_gesture_engine_primitives()
        .into_iter()
        .find(|primitive| primitive.gesture_id == id)
}

pub fn create_nine_gesture_conductor_engine_report(
    score: &hfield_domain::FieldScore,
) -> NineGestureConductorEngineReport {
    let primitives = nine_gesture_engine_primitives();
    let mut observed_gesture_ids: Vec<String> = Vec::new();
    let mut invalid_event_count = 0usize;
    let event_reports = score
        .conductor
        .primary_hand_track
        .events
        .iter()
        .enumerate()
        .map(|(index, event)| {
            if !observed_gesture_ids
                .iter()
                .any(|id| id == &event.gesture_id)
            {
                observed_gesture_ids.push(event.gesture_id.clone());
            }

            let primitive = nine_gesture_engine_primitive(&event.gesture_id);
            if primitive.is_none() {
                invalid_event_count += 1;
            }
            let end_ms = event.start_ms.saturating_add(event.duration_ms);

            match primitive {
                Some(primitive) => NineGestureEventReport {
                    event_index: index + 1,
                    gesture_id: event.gesture_id.clone(),
                    valid: true,
                    primitive_name: primitive.name.to_string(),
                    physical_definition: primitive.physical_definition.to_string(),
                    candidate_annotations: primitive
                        .candidate_annotations
                        .iter()
                        .map(|annotation| (*annotation).to_string())
                        .collect(),
                    start_ms: event.start_ms,
                    duration_ms: event.duration_ms,
                    end_ms,
                    intensity: event.intensity,
                    operator: event.operator.clone(),
                },
                None => NineGestureEventReport {
                    event_index: index + 1,
                    gesture_id: event.gesture_id.clone(),
                    valid: false,
                    primitive_name: "Unknown Gesture".to_string(),
                    physical_definition: "No registered physical definition".to_string(),
                    candidate_annotations: Vec::new(),
                    start_ms: event.start_ms,
                    duration_ms: event.duration_ms,
                    end_ms,
                    intensity: event.intensity,
                    operator: event.operator.clone(),
                },
            }
        })
        .collect::<Vec<_>>();

    let uses_all_nine_gestures = primitives.iter().all(|primitive| {
        observed_gesture_ids
            .iter()
            .any(|id| id == primitive.gesture_id)
    });
    let total_duration_ms = event_reports
        .iter()
        .map(|event| event.end_ms)
        .max()
        .unwrap_or(0);

    NineGestureConductorEngineReport {
        status: "ok",
        contract_id: "aiweb.hfield.nine_gesture_conductor_engine.v1",
        gesture_vocabulary_id: "nine_gesture_conductor_v1",
        engine_role: "physical gesture primitive registry and score-event scan for HCS renderers",
        source_score_gesture_vocabulary: score.gesture_vocabulary.clone(),
        field_layout_id: score.conductor.field_layout.clone(),
        root_frequency_hz: score.root_frequency_hz,
        research_basis: NineGestureResearchBasis {
            hcs_architecture_ruling: "Harmonic Field Score feeds the Nine-Gesture Conductor Engine; audio, field, notation, cymatic, syllable, and Forge layers are downstream renderers or adapters.",
            public_conducting_manual_basis: vec![
                "Beat patterns must show steady rhythm through visible arm motion.",
                "The downbeat is a strong downward motion on the first beat.",
                "The ictus is the clear beat point, emphasized by a small bounce or dip.",
                "The preparatory beat occurs before the first sung beat and sets tempo, mood, and breath.",
                "The cutoff is a definite motion that marks where sound ends.",
                "Pickup beats and fermatas require preparatory or cutoff-linked transition gestures.",
                "Conducting style should stay simple, readable, and expressive without distracting flourishes.",
            ],
            boundary_rule: "Core logic stores physical motion definitions; candidate meanings remain editable until later Forge authorization.",
        },
        authority_boundaries: NineGestureAuthorityBoundaries {
            physical_definition_is_core_logic: true,
            candidate_interpretation_is_editable: true,
            forge_operational_meaning_locked: false,
            mutates_forge: false,
            performs_identity_vault_write: false,
            exports_private_identity: false,
            authorizes_health_or_sensor_claims: false,
        },
        field_geometry: NineGestureFieldGeometry {
            layout_id: "center_1_lower_5_upper_9",
            conductor_order: vec!["g2", "g1", "g3", "g4", "g5", "g6", "g7", "g9", "g8"],
            spatial_rows: vec![
                vec!["g2", "g1", "g3"],
                vec!["g4", "g5", "g6"],
                vec!["g7", "g9", "g8"],
            ],
            anchor_gestures: vec!["g1", "g5", "g9"],
            orbit_gestures: vec!["g2", "g3", "g4", "g6", "g7", "g8"],
            anchor_frequency_ratios: vec![
                AnchorFrequencyRatio {
                    anchor: "anchor_1",
                    gesture_id: "g1",
                    role: "root settle",
                    ratio_to_root: 1.0,
                },
                AnchorFrequencyRatio {
                    anchor: "anchor_5",
                    gesture_id: "g5",
                    role: "transformation hold",
                    ratio_to_root: 3.0,
                },
                AnchorFrequencyRatio {
                    anchor: "anchor_9",
                    gesture_id: "g9",
                    role: "formed expression hold",
                    ratio_to_root: 9.0,
                },
            ],
        },
        conducting_law: ConductingLawSummary {
            downbeat_rule: "Use a clear downward motion to establish beat one and root/settle behavior.",
            ictus_rule: "Every primitive must expose a readable beat point; ambiguous movement is a failed conducting signal.",
            preparatory_beat_rule: "A preparatory motion must precede entry, breath, pickup, or new phrase behavior.",
            cutoff_rule: "A cutoff must be definite, must show where the sound or phrase ends, and may flow into a new preparatory motion.",
            pickup_rule: "Pickup behavior is treated as a prepared partial-entry, not as a full reset of the measure.",
            fermata_rule: "Hold behavior may extend duration, then transition through cutoff/preparatory motion before continuing.",
            style_rule: "Keep gestures simple, visible, steady, smooth when legato, sharper when bright or staccato.",
            dynamic_rule: "Size and intensity may scale expression; larger for forte/crescendo, smaller for piano/diminuendo.",
            left_hand_rule: "Left-hand meaning is reserved for later cue, sustain, subgroup, and phrasing support; right-hand conductor path remains primary.",
        },
        primitive_count: primitives.len(),
        primitives,
        current_score_scan: NineGestureScoreScan {
            event_count: event_reports.len(),
            invalid_event_count,
            total_duration_ms,
            uses_all_nine_gestures,
            observed_gesture_ids,
            event_reports,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vocabulary_has_nine_gestures() {
        let vocab = nine_gesture_vocabulary();
        assert_eq!(vocab.len(), 9);
        assert!(is_valid_gesture_id("g1"));
        assert!(is_valid_gesture_id("g9"));
        assert!(!is_valid_gesture_id("g10"));
    }

    #[test]
    fn display_order_is_conductor_order() {
        let ids: Vec<&str> = nine_gesture_vocabulary().iter().map(|g| g.id).collect();
        assert_eq!(
            ids,
            vec!["g2", "g1", "g3", "g4", "g5", "g6", "g7", "g9", "g8"]
        );
    }

    #[test]
    fn nine_gesture_engine_separates_physical_definition_from_candidate_meaning() {
        let report =
            create_nine_gesture_conductor_engine_report(&hfield_domain::FieldScore::default_hcs());

        assert_eq!(
            report.contract_id,
            "aiweb.hfield.nine_gesture_conductor_engine.v1"
        );
        assert_eq!(report.primitive_count, 9);
        assert!(
            report
                .authority_boundaries
                .physical_definition_is_core_logic
        );
        assert!(
            report
                .authority_boundaries
                .candidate_interpretation_is_editable
        );
        assert!(!report.authority_boundaries.forge_operational_meaning_locked);
        assert!(!report.authority_boundaries.mutates_forge);
        assert!(!report.authority_boundaries.performs_identity_vault_write);

        let g6 = report
            .primitives
            .iter()
            .find(|primitive| primitive.gesture_id == "g6")
            .expect("g6 primitive exists");
        assert_eq!(
            g6.physical_definition,
            "move outward from anchor_5 toward stabilization or expression"
        );
        assert!(g6.candidate_annotations.contains(&"correction"));
        assert_eq!(
            g6.interpretation_status,
            "candidate_annotation_only_not_forge_law"
        );
    }

    #[test]
    fn default_score_scan_reports_registered_gesture_events() {
        let report =
            create_nine_gesture_conductor_engine_report(&hfield_domain::FieldScore::default_hcs());

        assert_eq!(report.current_score_scan.event_count, 3);
        assert_eq!(report.current_score_scan.invalid_event_count, 0);
        assert!(report.current_score_scan.total_duration_ms > 0);
        assert!(report
            .current_score_scan
            .event_reports
            .iter()
            .all(|event| event.valid));
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GestureTimelineReport {
    pub track_id: String,
    pub event_count: usize,
    pub total_duration_ms: u32,
    pub total_duration_seconds: f64,
    pub events: Vec<GestureTimelineEventView>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GestureTimelineEventView {
    pub event_index: usize,
    pub gesture_id: String,
    pub gesture_name: String,
    pub operator: Option<String>,
    pub field_region: String,
    pub anchor: String,
    pub start_ms: u32,
    pub duration_ms: u32,
    pub end_ms: u32,
    pub start_seconds: f64,
    pub duration_seconds: f64,
    pub intensity: f32,
    pub cue_text: String,
}

pub fn gesture_definition(id: &str) -> Option<GestureDefinition> {
    nine_gesture_vocabulary()
        .into_iter()
        .find(|definition| definition.id == id)
}

pub fn create_gesture_timeline_report(score: &hfield_domain::FieldScore) -> GestureTimelineReport {
    let events = score
        .conductor
        .primary_hand_track
        .events
        .iter()
        .enumerate()
        .map(|(index, event)| {
            let definition = gesture_definition(&event.gesture_id);
            let gesture_name = definition
                .as_ref()
                .map(|definition| definition.name.to_string())
                .unwrap_or_else(|| "Unknown Gesture".to_string());

            let field_region = definition
                .as_ref()
                .map(|definition| definition.field_region.to_string())
                .unwrap_or_else(|| "unknown".to_string());

            let anchor = definition
                .as_ref()
                .map(|definition| definition.anchor.to_string())
                .unwrap_or_else(|| "unknown".to_string());

            let end_ms = event.start_ms.saturating_add(event.duration_ms);

            GestureTimelineEventView {
                event_index: index + 1,
                gesture_id: event.gesture_id.clone(),
                gesture_name: gesture_name.clone(),
                operator: event.operator.clone(),
                field_region: field_region.clone(),
                anchor,
                start_ms: event.start_ms,
                duration_ms: event.duration_ms,
                end_ms,
                start_seconds: round3(event.start_ms as f64 / 1000.0),
                duration_seconds: round3(event.duration_ms as f64 / 1000.0),
                intensity: event.intensity,
                cue_text: timeline_cue_text(
                    &event.gesture_id,
                    &gesture_name,
                    event.operator.as_deref(),
                    &field_region,
                ),
            }
        })
        .collect::<Vec<_>>();

    let total_duration_ms = events.iter().map(|event| event.end_ms).max().unwrap_or(0);

    GestureTimelineReport {
        track_id: score.conductor.primary_hand_track.track_id.clone(),
        event_count: events.len(),
        total_duration_ms,
        total_duration_seconds: round3(total_duration_ms as f64 / 1000.0),
        events,
    }
}

fn timeline_cue_text(
    gesture_id: &str,
    gesture_name: &str,
    operator: Option<&str>,
    field_region: &str,
) -> String {
    let operator_text = operator.unwrap_or("gesture");

    match gesture_id {
        "g1" => format!("{operator_text}: {gesture_name}; settle at center/root presence."),
        "g2" => format!("{operator_text}: {gesture_name}; prepare and open from center."),
        "g3" => format!("{operator_text}: {gesture_name}; emerge outward from center."),
        "g4" => format!("{operator_text}: {gesture_name}; descend into lower constraint."),
        "g5" => format!("{operator_text}: {gesture_name}; hold lower depth and transformation."),
        "g6" => format!("{operator_text}: {gesture_name}; release from lower depth."),
        "g7" => format!("{operator_text}: {gesture_name}; gather expression upward."),
        "g9" => format!("{operator_text}: {gesture_name}; hold formed upper expression."),
        "g8" => format!("{operator_text}: {gesture_name}; emit outward from upper expression."),
        _ => format!("{operator_text}: {gesture_name}; conduct through {field_region}."),
    }
}

fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

#[cfg(test)]
mod timeline_tests {
    use super::*;
    use hfield_domain::{FieldScore, GestureEvent};

    #[test]
    fn creates_timeline_report_from_default_score() {
        let score = FieldScore::default_hcs();
        let report = create_gesture_timeline_report(&score);

        assert_eq!(report.track_id, "primary_hand");
        assert_eq!(report.event_count, 3);
        assert_eq!(report.events[0].gesture_id, "g2");
        assert_eq!(report.events[1].gesture_id, "g1");
        assert!(report.total_duration_ms > 0);
    }

    #[test]
    fn timeline_report_handles_appended_gesture() {
        let mut score = FieldScore::default_hcs();

        score
            .conductor
            .primary_hand_track
            .events
            .push(GestureEvent {
                gesture_id: "g9".to_string(),
                start_ms: 620,
                duration_ms: 500,
                intensity: 0.7,
                operator: Some("formed_hold".to_string()),
            });

        let report = create_gesture_timeline_report(&score);

        assert_eq!(report.event_count, 4);
        assert_eq!(report.events[3].gesture_name, "Formed Expression Hold");
        assert_eq!(report.total_duration_ms, 1120);
    }
}
