# Arrival — Intent Capture

> **Workflow state:** Pre-Discovery (before Discovery) · **Reads:** `docs/WEBSOCKET_CONTRACT.md` (session start/readiness), `docs/TRAVELER_PROFILE_SCHEMA.md` (destination request)

## Purpose

Arrival is the front door of the consultancy. It corrects the early assumption that travelers never name a destination up front, and instead offers a single, generous place to say what they want — in a word or a story, however short or long. A concise note and a long, meandering paragraph must feel equally at home here. Everything downstream (the adaptive interview, then the profile) is shaped by what is written on this screen; the arrival text becomes the seed for the destination request and the first set of unknowns and assumptions.

The screen is not a form. It is an invitation, paced like a quiet hotel desk where the concierge first listens before asking anything.

## Aesthetic Intent — Quiet Luxury

This is the most atmospheric screen in the product. It should feel like stepping into a softly lit lobby at dusk: calm, warm, private, and unhurried. The luxury is not in ornament but in restraint — generous negative space, a single perfectly placed interaction, and materials that feel tactile even though they are digital.

* **Warm & grounded, not clinical:** The bone surface of the intent card should read as thick, matte paper or linen card stock, not as a cold software field. The brass action should read as a small, solid metal detail, not a flat web button.
* **Atmosphere over interface:** The background photograph is atmosphere, not content. It should be present enough to give depth and memory, restrained enough that the eye settles immediately on the centered column and its single field.
* **Unhurried:** No urgency cues, no counters that feel like limits, no pulsing calls to action. The field's growth, the button's enable, and the eventual exit all move with the pour/settle language, never snapping.

## Scene & Layout — Descriptive

**Full-viewport hero canvas, centered focus column (ideally ~640px, never wider, with ample breathing room on larger viewports):**

* **Background photograph** filling the viewport, with an almost imperceptible slow zoom across many seconds — a living still, not a slideshow. A soft, translucent dark veil sits over the image at low opacity, just enough to make light headline text comfortably legible. The veil is never harsh or fully opaque; image texture must remain visible throughout.

* **Headline** centered at the top of the column, large elegant serif in light bone/cream, generous letter spacing, plenty of white space above and below: "Where shall we begin?" The size and weight should feel like engraved signage — confident yet quiet.

* **Subline** directly below, small body, slightly transparent light text (about 85–90% opacity), centered, max ~55 characters per line: a reassuring hint that a brief or detailed answer both work and that the questions that follow will adapt. The subline should feel like a whispered reassurance, not a manual.

* **Intent card — the hero interaction** — a warm, softly rounded rectangular card resting on the veiled background with a gentle, low lift (a soft, diffuse shadow, not a hard drop). The card's corners are generously rounded, its internal padding generous, its proportion calm:
  * **Text area inside:** Warm, slightly deeper bone fill, also softly rounded, with generous internal padding (comfortable for thumbs and cursors alike) and dark ink body text at a reading size. Placeholder text shows two contrasting examples (e.g., a short "Kyoto in autumn, slow, sunrise photography" and a longer "ten days, two friends, avoid crowds, street food over museums") in muted, warm-muted placeholder tone. The area begins at roughly three lines tall and grows smoothly to about five lines; beyond that it scrolls internally without layout shift or jank. Line height is generous, with breathing room above the first line and below the last.
  * **Helper row beneath the field within the card:** On the left, a tiny muted caption in soft ink: "However short or long — we'll ask only what's missing." On the right, a polite live caption for character count (e.g., "42 / 2000") in the same muted tone, never alarming. The row has comfortable micro-spacing above the field and feels secondary by design.

* **Primary action** beneath the card, centered, with clear separation from the card (not glued to it). It is brass-filled with dark text, comfortably large with generous horizontal padding, soft corners, and a calm label "Begin the Interview →" with a restrained arrow that does not animate aggressively. When disabled it is visually quiet — reduced opacity and non-interactive — never a grey that feels like an error. When enabled, hover tints gently to pale brass with the micro ease.

* **Reassurance line** below the action, tiny, translucent light caption: "You can change anything later — nothing is booked until you confirm the profile." It should read as a footnote, not a feature.

The entire composition is vertically centered, airy, and symmetrically balanced. On very large viewports, the column remains centered and does not stretch; the photograph simply shows more context. On slightly narrower viewports approaching the desktop minimum, spacing compresses gracefully but the column remains centered and readable without lateral scrolling.

## Material, Light & Detail — Luxury Cues

* **Card stock:** The intent card's warm surface should suggest a thick, slightly textured paper or linen card laid on a darker table — the edge subtly lifted, the shadow soft and double-layered (a faint, tighter shadow plus a broader, more diffuse one) so the card does not look like a flat rectangle. Avoid neumorphism or hard bevels.
* **Ink & brass:** Typed text is deep ink on warm fill — high contrast but not stark black-on-white; placeholder is warm-muted, clearly secondary. Brass is always used sparingly and precisely. Its hover tint is a warmer, paler brass, not a brightness boost.
* **Focus state:** Never the default system blue ring. Focus shows a subtle, crisp brass ring pulled slightly outside the input edge, with comfortable offset, so the field feels selected rather than outlined.
* **Photograph treatment:** The image is never bordered, never placed in a card, never cropped into a shape. It is simply the world behind the desk. Its veil is a translucent deep ink, not black, so the palette stays cohesive (bone and ink, with brass as the single accent).

## States — How Nothingness Is Designed

* **Empty / too short (trimmed input under ~2 characters):** Button remains quietly disabled. No inline error, no shake. The helper text remains steady. The experience is simply "not yet."
* **Ready (trimmed input at least ~2 characters, not busy):** Button becomes interactive, with the gentle hover and micro settle when pressed. The field remains comfortably editable.
* **Busy (awaiting server acknowledgement):** Both the field and button dim to about 40% opacity and become non-interactive until the server confirms. The card remains visible — do not hide or replace it with a spinner. The wait should feel like a brief, respectful pause.
* **Focused:** The brass ring appears; the card's lift may subtly deepen, but never jump. Placeholder fades cleanly; typed text remains easily editable.

## Motion — Presence Without Performance

* Field growth from three to five lines animates smoothly, not instantly. The character count updates live but without jitter.
* Enabling the button is a calm fade/tint, not a pop.
* **Exit to Discovery:** When the workflow advances, the hero photograph gently blurs and holds while the centered column fades out with the page-pour ease. The image's veil remains as it blurs — the scene recedes, it does not cut. Do not advance optimistically; hold the exit until Discovery is observed.

## Behavior & Interaction

* Typing feels immediate: the field grows with the pour ease, the count is polite. Both click/tap on the primary action and the keyboard shortcut Meta or Ctrl + Enter while focused trigger the same submission path.
* Upon triggering, the client enters a busy state, ensures a transport connection is open, and initiates a session start (supplying an existing session identifier only if resuming a prior session). It then waits for a readiness signal that carries the workflow state, a recovery flag, and whether a profile has already been confirmed. After that, the server emits the first adaptive question, normalized from the intent text into the profile's destination request and any initial unknowns and assumptions. Retain the raw intent locally and surface it in the forming-profile rail as a stated destination request until the first profile snapshot arrives.
* **Success:** The traveler has expressed intent in their own words — brief or detailed — and visibly sees the next screen reflect that intent.

## Data & Contract Binding

* The intent text is the authoritative seed for `traveler profile → trip context → destination request`. Later discovery questions and subsequent profile snapshots both echo and refine it.

## Edge Cases & Errors — Handled With Poise

* **Resume with existing session:** Starting with a known session creates a new run from recovery state without replaying history. Restore the prior intent text if the server provides recovery.
* **Backend restart / session expiry:** Show a calm, centered inline caption notice offering to start again, return the field to ready, and allow retyping. No auto-retry or harsh alert.
* **Another tab took over (superseded):** Close the older connection quietly and show a gentle "Continued in another tab" notice in the same caption area — no modal, no block.
* **Rejected command:** Surface the server's human-readable message in a polite live region beneath the button, never a raw code. Keep the entered text intact so the traveler can adjust.

## Accessibility

* The field's purpose is clear from the headline and surrounding context; placeholder is illustrative, not a label substitute. The primary action has a clear accessible name; helper and count regions are polite live updates. Focus order is intentional: field → action → reassurance. Color contrast preserves dark ink on warm brass and warm/bone surfaces, with out-of-season-friendly text.

## Implementation Contract — Exact Composition

Use a full-viewport `main.arrival` with three visual layers: `background-image`, `background-veil`, and `arrival-content`. The background is fixed to the viewport; the veil is deep ink at 62% opacity; content is relative, centered with flexbox, and has `min-height: 100svh`. The content column is `width: min(640px, calc(100vw - 48px))` with 48px vertical padding on desktop and 32px below 768px. Do not use absolute positioning for the form.

Render this DOM order: `h1` → reassurance paragraph → intent card → primary button → safety caption → inline feedback. The card is 640px maximum, uses 32px padding, and the textarea is the only visually prominent control. The helper row is a two-column grid; the count wraps below the helper copy at 320px. The primary button has 16px top margin from the card; the safety caption has 16px top margin from the button.

The textarea accepts 2–2000 characters after trim. Preserve newlines in `free_text`. Display `{length} / 2000` and count Unicode code points rather than UTF-16 code units. Do not block typing at 2000; prevent submission beyond the limit and announce the limit politely. `Ctrl/Cmd+Enter` submits only when trimmed text is valid and `busy === false`; Enter alone inserts a newline.

| State | Visual rule | Interaction |
|---|---|---|
| Empty / invalid | Primary at 40% opacity; no error copy | Field remains editable |
| Valid | Primary brass with hover tint | Click or Ctrl/Cmd+Enter sends `session.start` |
| Busy | Card controls at 40%; text and count remain visible | Ignore further submits |
| Accepted | Hold until `session.ready` and first `discovery.question` | Pour to Discovery |
| Rejected / expired | Inline server message under action | Keep text; allow retry or new session |

Use the fixed labels exactly: `Where shall we begin?`, `Begin the Interview →`, and `You can change anything later — nothing is booked until you confirm the profile.` The image is decorative unless its subject is specifically meaningful; never expose a filename or provider name.

## Acceptance Criteria

At 1024px the hero remains centered with no crop of the action. At 768px the column stays at least 16px from each edge. At 320px the helper row wraps cleanly, the textarea remains three visible lines tall, and the action remains a 44px target. A refresh or reconnect never clears a server-provided recovery intent without first offering the recovered text. The screen never shows percentage progress or a raw WebSocket error.
