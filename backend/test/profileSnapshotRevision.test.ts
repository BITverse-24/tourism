import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendProfileSnapshot,
  bumpDiscoveryEpoch,
  getDiscoveryEpoch,
  getSessionCheckpoint,
  getNewSessionId,
} from "../src/models/data";
import { ProfileSnapshotStates, WorkflowStates } from "../src/structures/enums";
import type { TravelerProfile } from "../src/structures/TravelerProfile";

const emptyProfile = {
  profile_id: "p1",
  trip_context: {
    destination_request: "Mumbai",
    resolved_destination: null,
    start_date: null,
    end_date: null,
    duration_days: null,
    date_flexibility: "unknown",
    party_size: null,
    party_notes: null,
    budget: null,
  },
  purpose_and_priorities: {
    primary_purpose: null,
    secondary_purposes: [],
    priorities: [],
    success_definition: null,
  },
  preferences: [],
  travel_style: {
    pace: "unknown",
    energy_pattern: "unknown",
    walking_tolerance: "unknown",
    crowd_tolerance: "unknown",
    comfort_preference: "unknown",
    spontaneity: "unknown",
  },
  hard_constraints: {
    must_visit: [],
    avoid: [],
    dietary_requirements: [],
    accessibility_requirements: [],
    accommodation_requirements: [],
    maximum_daily_travel: null,
    maximum_hotel_changes: null,
    budget_ceiling: null,
  },
  unknowns: [],
  assumptions: [],
} as unknown as TravelerProfile;

test("appendProfileSnapshot assigns strictly increasing revisions for draft→ready→confirmed", async () => {
  const sessionId = await getNewSessionId();
  const d = await appendProfileSnapshot(sessionId, ProfileSnapshotStates.DRAFT, emptyProfile);
  const r = await appendProfileSnapshot(
    sessionId,
    ProfileSnapshotStates.READY,
    emptyProfile,
    WorkflowStates.PROFILE_REVIEW,
  );
  const c = await appendProfileSnapshot(
    sessionId,
    ProfileSnapshotStates.CONFIRMED,
    emptyProfile,
    WorkflowStates.PLANNING,
  );

  assert.equal(d.revision, 1);
  assert.equal(d.state, ProfileSnapshotStates.DRAFT);
  assert.equal(r.revision, 2);
  assert.equal(r.state, ProfileSnapshotStates.READY);
  assert.equal(c.revision, 3);
  assert.equal(c.state, ProfileSnapshotStates.CONFIRMED);

  const cp = await getSessionCheckpoint(sessionId);
  assert.deepEqual(
    cp.profile_snapshots.map((s) => s.revision),
    [1, 2, 3],
  );
  assert.equal(cp.latest_confirmed, 3);
});

test("appendProfileSnapshot never reuses a revision under concurrent appends", async () => {
  const sessionId = await getNewSessionId();
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      appendProfileSnapshot(sessionId, ProfileSnapshotStates.DRAFT, emptyProfile),
    ),
  );
  const revisions = results.map((s) => s.revision).sort((a, b) => a - b);
  assert.deepEqual(
    revisions,
    Array.from({ length: 20 }, (_, i) => i + 1),
  );
  assert.equal(new Set(revisions).size, 20);
});

test("bumpDiscoveryEpoch advances so stale provisional work can be detected", async () => {
  const sessionId = await getNewSessionId();
  assert.equal(getDiscoveryEpoch(sessionId), 0);
  assert.equal(bumpDiscoveryEpoch(sessionId), 1);
  assert.equal(bumpDiscoveryEpoch(sessionId), 2);
  assert.equal(getDiscoveryEpoch(sessionId), 2);
});
