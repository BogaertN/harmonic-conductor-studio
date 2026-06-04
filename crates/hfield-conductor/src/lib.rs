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
