import type { DiscoveryQuestion, TravelerProfile } from "./types.js";

/** Temporary in-memory state until the backend owns session storage. */
export const mockDiscoveryState: {
  profile: TravelerProfile | null;
  current_question: DiscoveryQuestion | null;
} = {
  profile: null,
  current_question: null,
};
