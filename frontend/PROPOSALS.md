# 3. Arrival → Discovery integration verification (2026-08-21)

**Target:** `backend/src/handlers/SessionHandlers.ts`, `backend/src/services/SessionServices.ts`, `backend/src/structures/NewSessionMessage.ts`, `backend/src/app/socketio.ts`

**Issue:** Frontend Arrival sends `session.start` with `initial_intent` but Discovery initially showed no sphere and appeared to not receive backend response. Investigation found backend path is correctly wired via `ConnectionHandlers.onConnect → sessionEvents(socket)` and `NewSessionMessageSchema` already allows `initial_intent`. No backend file change required for this symptom.

**Evidence:** `backend/src/handlers/ConnectionHandlers.ts:13` registers `sessionEvents`, `discoveryEvents`, etc.; `backend/src/structures/NewSessionMessage.ts:9` payload `{session_id nullable, initial_intent string max2000 optional}`; `backend/src/services/SessionServices.ts:52` seeds `initialProfile` from `initial_intent` and emits `session.ready` → `profile.snapshot` → `discovery.question` via same `emit` callback pattern; fallback question emitted even on agent 429.

**Suggested change:** None — verified correct. If backend owner wants optional cleanup, remove dead `for(let res of reses)` loop in `backend/src/handlers/DiscoveryHandlers.ts:40` (reses always `[]` because service emits via callback) and keep `backend/src/handlers/SessionHandlers.ts:51` commented loop consistent.

**Reason:** Documents that root cause was frontend mock suppression (`frontend/src/App.tsx:57` including `isWaitingForLive` in `shouldShowMock`) and `frontend/src/screens/Discovery.tsx:498` requiring `live.connected` for initial sphere.

**Impact:** Low — informational only. Frontend fixes in this sprint: `App.tsx` drops `isWaitingForLive` from `shouldShowMock`, `Discovery.tsx` widens `isInitialWaiting` to `!question && isLiveMode && live.question==null` so initial wait uses same `discovery__busyOverlay` as inter-question wait.

