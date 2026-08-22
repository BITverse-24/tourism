import { DiscoveryAnsSelectionModes, DiscoveryFreeTextModes } from "../structures/enums";
import type { DiscoveryQuestion } from "../../../ai/discovery";

export function createFallbackDiscoveryQuestion({
    command_id,
    topics,
    free_text,
}: {
    command_id: string;
    topics: string[];
    free_text?: string | null;
}): DiscoveryQuestion {
    const question_id = `q_change_${command_id}`;

    let prompt: string;
    if (!topics || topics.length === 0) {
        prompt = "Tell us what to change in the profile.";
    } else if (topics.length === 1) {
        prompt = `What should we change about ${topics[0]}?`;
    } else {
        let list: string;
        if (topics.length === 2) {
            list = `${topics[0]} and ${topics[1]}`;
        } else {
            list = `${topics.slice(0, -1).join(", ")}, and ${topics[topics.length - 1]}`;
        }
        prompt = `You asked us to revisit ${list}. What should we correct?`;
    }

    return {
        question_id,
        prompt,
        selection_mode: DiscoveryAnsSelectionModes.SINGLE,
        required: true,
        options: [],
        free_text_mode: DiscoveryFreeTextModes.REQUIRED,
        free_text_placeholder: "Add the correction in your own words",
    };
}
