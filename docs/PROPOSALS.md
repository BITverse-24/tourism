# Proposals

## 1. Repair root README documentation links

**Target:** `../README.md`

**Issue:** The root README links the Traveler Profile and Final Trip Plan documents under `docs/md/`, but the current files are located directly under `docs/`.

**Evidence:** `docs/md/` does not exist in the working tree; the active files are `docs/TRAVELER_PROFILE_SCHEMA.md` and `docs/FINAL_TRIP_PLAN_SCHEMA.md`.

**Suggested change:** Update the root README links to `docs/TRAVELER_PROFILE_SCHEMA.md`, `docs/FINAL_TRIP_PLAN_SCHEMA.md`, and, if desired, `docs/WEBSOCKET_CONTRACT.md`.

**Reason:** Users following the project’s primary documentation links currently receive broken paths.

**Impact:** This change is outside the selected writable directory and is intentionally left for the owner of the project root.
