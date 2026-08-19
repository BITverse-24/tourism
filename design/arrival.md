# Arrival — Intent Capture

> **Workflow state:** Pre-Discovery (before the workflow enters Discovery) · **Reads:** `docs/WEBSOCKET_CONTRACT.md` (session start/readiness) and `docs/TRAVELER_PROFILE_SCHEMA.md` (destination request)

## Purpose

Arrival corrects the earlier assumption that travelers never name a destination up front. It gives travelers a single, beautiful place to say what they want — in a word or a story — however short or long. Everything that follows (the adaptive questions, then the profile) is tailored using what the traveler writes here. The screen does not try to collect a full form; it captures intent and lets the interview fill only the gaps.

## Scene & Layout

Imagine a full-viewport hero: a large, slow-moving photograph filling the screen with a subtle, almost imperceptible zoom over many seconds. A soft dark veil sits over the image just enough to make light text legible — never a harsh overlay.

Centered on this canvas, a focused column:

* **Headline** at the top, large elegant serif, light text: "Where shall we begin?"
* **Subline** just below, small body, slightly transparent light text: a reassuring hint that a brief or detailed answer both work and that questions will adapt to whatever is shared.
* **Intent card** — the hero interaction — a warm, softly rounded card sitting on the light surface with a gentle lift. Inside it:
  * A multi-line text area, warm-filled, softly rounded, with generous internal padding and comfortable body text. Placeholder text gives two contrasting examples (for instance, a short "Kyoto in autumn, slow, sunrise photography" and a longer "ten days, two friends, avoid crowds, street food over museums"). The area starts at about three lines tall and grows smoothly to about five lines; beyond that it scrolls internally.
  * A small helper row beneath: on the left, a muted caption "However short or long — we'll ask only what's missing."; on the right, a polite live caption showing character count (e.g., "42 / 2000"). The maximum is around two thousand characters.
* **Primary action** beneath the card, centered, brass-filled: "Begin the Interview →". Visually quiet when disabled — reduced opacity and non-interactive.
* **Reassurance line** below the button, tiny and transparent: "You can change anything later — nothing is booked until you confirm the profile."

The overall composition is centered, airy, and at most about 640px wide, with generous breathing room. On larger viewports, no element stretches beyond the centered canvas.

## Visual Treatment

* Background photograph is treated as atmosphere, not content — no hard border, no card around it. The warm intent card and brass action are the only lifted elements on the scrimmed image.
* Placeholder text is muted; typed text is dark ink on the warm input fill. When focused, the input shows a subtle brass ring — never a default blue outline.
* The character count is never alarming; it is simply informative.

## States

* **Empty / too short:** Button disabled. Helper text remains. No error.
* **Ready (trimmed input ≥ ~2 characters, not busy):** Button enabled, hover tints to pale brass, selection animates with the micro motion.
* **Busy (awaiting server acknowledgement):** Text area and button dim and become non-interactive until the server confirms. Do not optimistically advance.
* **Focused:** Input shows the brass ring; label/caption contrast remains accessible.

## Behavior & Interaction

* Typing auto-grows the field smoothly from three to five lines. The character count updates live.
* The primary action can be triggered by clicking the button or by the keyboard shortcut Meta/Ctrl + Enter while the field is focused.
* Upon triggering, the client enters a busy state, ensures a WebSocket is open, and initiates a session start. Conceptually, the client asks the server to begin a session (providing an existing session identifier only if resuming) and waits for a readiness signal that includes the workflow state, recovery flag, and whether a profile has already been confirmed. Following that, the server will emit the first adaptive question, normalized from the intent text into the profile's destination request and related unknowns/assumptions. The intent text itself should be retained locally and surfaced in the forming-profile rail as a stated destination request until the first profile snapshot arrives.
* **Exit:** When the workflow moves to Discovery, the hero image gently blurs and the centered content fades out with the page-pour motion. Do not advance optimistically — wait for the workflow state to be observed as Discovery.
* **Success criteria:** The traveler has described intent in their own words, however brief or detailed, and the interview that follows reflects that intent.

## Data & Contract Binding

* The intent text seeds `traveler profile → trip context → destination request`. Later discovery questions are tailored using this intent plus any recovery state; subsequent profile snapshots will echo it back as a stated value.
* Transport is via a session-start command and a session-ready event. The client should persist the session/run correlation identifiers for resume and treat duplicate submissions idempotently.

## Edge Cases & Errors

* **Resume with existing session:** Starting with a known session creates a new run from recovery state without replaying history. Restore the prior intent text if the server provides recovery.
* **Backend restart:** The session may expire with a backend-restart reason. Show a calm inline notice offering to start again and return the field to an enabled, ready state. No auto-retry.
* **Another tab took over:** If the server signals that the session was superseded by a newer connection, close the old connection and show a gentle "Continued in another tab" notice.
* **Rejected command:** Surface the server's human-readable message in a polite live region beneath the button — never a raw error code.

## Accessibility

* The field has a clear label (the headline serves as its purpose) and the placeholder is not a substitute for it. The button has an accessible name. Live regions for character count and for submission errors are polite, not assertive. Focus order is logical: field → action → reassurance.
