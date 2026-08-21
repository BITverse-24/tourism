# PRESENTATION SCRIPT & JURY PREP

## 1) Two-minute point-wise script of the product

1. We built an **Agentic Travel Planner** that converts raw traveler conversation into a usable, explainable trip plan.
2. The product is designed around a strict transformation: **Discovery Answers → Traveler Profile → Final Trip Plan**.
3. The Traveler Profile is not chat history; it is a normalized planning input with priorities, constraints, unknowns, and assumptions made explicit.
4. The system never hides missing information. Unknowns stay visible, and hard constraints are never silently violated.
5. Planning is **traveler-guided**, not black-box auto-ranking: when tradeoffs are material, the system asks the traveler to choose explicitly.
6. The architecture uses three clear reasoning roles:
   - Agent 1: builds and validates profile understanding,
   - Agent 2: designs one grounded itinerary,
   - Agent 3: turns that into a clear, user-facing final plan.
7. The backend, via a Planning Controller, enforces validation, state correctness, and publication authority so agents cannot bypass safety rules.
8. Frontend/backend integration is contract-first over WebSocket with typed commands, acknowledgements, lifecycle events, and full snapshots.
9. Every destination and attraction is grounded in curated knowledge datasets with stable IDs, controlled taxonomies, and provenance.
10. The final plan is practical and transparent: route, day-wise sequence, movement, costs, fit explanation, tradeoffs, warnings, and unresolved details.
11. This makes the product trustworthy for real travelers and auditable for technical teams.
12. In short, we deliver **human-centered personalization with system-level rigor**: explainable decisions, resilient workflow, and grounded outputs.

---

## 2) 10 high-probability jury questions with answers — Product

### Q1. What is the core product value beyond a normal itinerary generator?
**Answer:** We separate understanding from recommendation: first we build a normalized Traveler Profile, then produce a Final Trip Plan with explicit fit explanations, tradeoffs, assumptions, and unresolved details. This gives transparency and trust, not just a pretty itinerary.

### Q2. How do you ensure the plan actually reflects the traveler and not model bias?
**Answer:** The system enforces profile traceability. Major plan decisions must map back to profile priorities, constraints, or explicit assumptions. Inferred preferences are labeled with confidence and never treated as hard constraints without confirmation.

### Q3. Why did you choose one traveler-guided plan instead of multiple ranked plans?
**Answer:** In MVP, we intentionally avoid fake precision from automatic ranking. Material tradeoffs are resolved by the traveler through typed decisions, so the final plan reflects user intent rather than opaque score weighting.

### Q4. What happens when user inputs are incomplete or contradictory?
**Answer:** We do not guess silently. Unknowns are categorized by impact (blocking/material/minor), contradictions remain visible, and planning cannot proceed as “final” while blocking uncertainty exists.

### Q5. Can users trust costs and feasibility shown in the final plan?
**Answer:** Yes, because scope is explicit. Cost sections state what is included/excluded, caveats are mandatory, and uncertain facts are shown as estimated or unresolved instead of being presented as confirmed.

### Q6. How is this better for user confidence during decision-heavy trips?
**Answer:** We make tradeoffs explicit at decision points—comfort vs coverage, budget vs quality, depth vs breadth—so users control what matters most. This improves ownership, satisfaction, and perceived trust.

### Q7. Does the product overpromise with booking or live availability?
**Answer:** No. The contract explicitly prevents claims like “booked” unless truly outside the current scope. Final output is planning-grade, not a fake booking confirmation.

### Q8. How do you handle personalization for different traveler types?
**Answer:** The profile captures purpose, style, tolerances, party context, constraints, and preference strengths. The plan then aligns route, pacing, and experiences against that structured traveler model.

### Q9. What makes this scalable across destinations?
**Answer:** The system is contract-driven and dataset-grounded. Stable city/attraction IDs, controlled taxonomies, and deterministic validation let us scale coverage without changing core behavior semantics.

### Q10. If you had one sentence for market positioning, what is it?
**Answer:** It is a **trust-first intelligent planner** that combines conversational personalization with auditable decision logic and grounded travel knowledge.

---

## 3) 10 high-probability jury questions with answers — Technical Process

### Q1. What are your key architectural boundaries?
**Answer:** Three reasoning agents with strict responsibilities, plus a non-reasoning Planning Controller that owns workflow state, validation, pause/resume, and all public snapshot publication.

### Q2. How do you prevent agent overreach or hidden state corruption?
**Answer:** Agents return artifacts or control-flow requests only. They do not directly mutate canonical state or emit public plan/profile snapshots. The Controller validates and publishes only compliant outputs.

### Q3. Why WebSocket for MVP flow?
**Answer:** Discovery and planning are interactive, stateful, and event-driven. WebSocket supports real-time adaptive questions, acknowledgements, lifecycle updates, and full resource snapshots over one connection.

### Q4. How do you guarantee idempotency and safe retries?
**Answer:** Every command uses `command_id`; duplicates return the original result without reapplying side effects. Conflicting reuse is rejected. This makes network retries safe and deterministic.

### Q5. How do you recover from disconnects and backend restarts?
**Answer:** After each accepted discovery answer, recovery state is atomically stored in memory. Reconnect creates a new run from that state. If backend restarts, session expires explicitly; no fabricated replay or stale reconstruction.

### Q6. How is decision checkpointing implemented technically?
**Answer:** Agent 2 calls `ask_user_decision`; backend validates request, checkpoints continuation context, transitions to `decision_required`, emits `decision.request`, and resumes only after valid `decision.respond`.

### Q7. How do you enforce data grounding and prevent hallucinated POIs?
**Answer:** City and attraction datasets are schema-controlled with stable IDs and provenance. Validation rejects unknown/out-of-scope city or attraction references before final publication.

### Q8. What validation gates exist before final plan publication?
**Answer:** Schema validation, hard-constraint checks, scope checks, profile revision consistency, structural integrity, and protected-field comparison after Agent 3 rendering. Invalid drafts do not get published as final.

### Q9. How do you keep narrative quality without losing structural correctness?
**Answer:** Agent 3 can improve language and explanation only. Protected fields—route, allocations, timing, movement, cost scope, and profile linkage—are controller-guarded against unauthorized changes.

### Q10. What technical choices de-risked MVP execution under time constraints?
**Answer:** Contract-first docs, snapshot-based messaging, deterministic guardrails, typed tool boundaries, and explicit deferred scope (no auto-optimizer, no continuous replanning, no booking stack) kept quality high while controlling complexity.
