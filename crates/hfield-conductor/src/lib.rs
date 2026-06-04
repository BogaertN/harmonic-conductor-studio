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
