I would **not** treat the trade-off screen as a separate page/modal. The consultation screen should remain the primary environment, and the decision should feel like the agent has **paused its work and surfaced a specific consultation point**.

The key aesthetic principle is:

> **The consultation is still happening. The user has simply been pulled into a moment where their judgment is required.**

That fits the "Voyager Consultation" concept much better than navigating to another screen.

## 1. The normal consultation state

Keep your existing screen almost exactly as it is:

* Dark navy/charcoal background
* Large empty canvas
* Small glowing amber orb in the center
* Subtle status text below it
* Progress rail on the right
* Current stage highlighted
* Everything feels quiet and computational

For example:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ VOYAGER CONSULTATION                                      CONSULTATION       │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
│                            ◉                                                 │
│                                                                              │
│                   Refining the journey so time feels well spent.             │
│                                                                              │
│                                                               PROGRESS       │
│                                                               ─────────      │
│                                                               ● Discovery    │
│                                                                 COMPLETED    │
│                                                               ─────────      │
│                                                               ● Constraint   │
│                                                                 IN PROGRESS  │
│                                                               ─────────      │
│                                                               ○ Experience  │
│                                                               ○ Mobility    │
│                                                               ○ Cost        │
│                                                               ...            │
└──────────────────────────────────────────────────────────────────────────────┘
```

The important thing is that the user isn't constantly being bombarded with UI. The emptiness is part of the product's character.

---

# 2. When a decision is required

This is where I would make a **state transition inside the same canvas**.

Do **not**:

* open a conventional modal
* navigate to the cream trade-off page
* put the question into the right rail
* replace the entire screen with the questionnaire
* create a giant white card in the middle of the dark interface

All of those make the consultation feel like a conventional form.

Instead, the central area should **transform into a focused consultation prompt**.

### The orb should remain

This is important.

The orb is effectively your visual representation of the agent. When it needs the user's input, the orb should change subtly:

**Normal:**

```text
       soft ambient glow

             ●

       Refining the journey...
```

**Decision required:**

```text
       slightly stronger glow

             ●
          ◌     ◌

       A decision is needed
```

Not a huge animation. Just enough to communicate:

> Voyager has stopped thinking and is waiting for you.

---

# 3. The central decision surface

I'd take the cream trade-off screen and **compress it substantially**.

The current first screenshot has too much vertical space for this context. It works as a dedicated questionnaire, but inside the consultation screen it would feel like you've accidentally embedded an entirely different product.

Instead, make a **single centered decision panel**.

Something approximately like:

```text
                 ┌──────────────────────────────────────┐
                 │                                      │
                 │        01  ·  TRADE-OFF              │
                 │                                      │
                 │   How much would you like to see?    │
                 │                                      │
                 │   Would you rather keep the pace     │
                 │   gentle or see a little more,       │
                 │   even if it means more walking?     │
                 │                                      │
                 │  ┌────────────────────────────────┐  │
                 │  │  01                            │  │
                 │  │                                │  │
                 │  │  Prioritize comfort       ○    │  │
                 │  │                                │  │
                 │  │  Fewer attraction visits and   │  │
                 │  │  less movement.                │  │
                 │  └────────────────────────────────┘  │
                 │                                      │
                 │  ┌────────────────────────────────┐  │
                 │  │  02                            │  │
                 │  │                                │  │
                 │  │  Prioritize coverage       ○   │  │
                 │  │                                │  │
                 │  │  More attraction visits and    │  │
                 │  │  a higher movement burden.     │  │
                 │  └────────────────────────────────┘  │
                 │                                      │
                 │              Continue →              │
                 │                                      │
                 └──────────────────────────────────────┘
```

But aesthetically, it should **not literally be a cream card floating over the dark background**.

---

# 4. Invert the visual language

This is probably the biggest design decision I'd make.

Your trade-off screen has this beautiful warm ivory aesthetic.

Your consultation screen has the dark observatory-like aesthetic.

Don't choose one and discard the other.

Instead, make the decision surface feel like a **warm light emerging from the dark consultation environment**.

### Background

Keep:

`#18232A`-ish dark background.

### Decision surface

Use a very dark warm-neutral rather than ivory:

`#202B30`

or perhaps slightly lighter:

`#263137`

Then use the **same warm ivory typography** from your first screen.

Your existing palette becomes:

| Element        | Normal consultation | Decision state      |
| -------------- | ------------------- | ------------------- |
| Background     | Deep charcoal/navy  | Same                |
| Orb            | Amber glow          | Stronger amber glow |
| Primary text   | Warm off-white      | Warm off-white      |
| Secondary text | Muted gray          | Slightly brighter   |
| Cards          | Almost invisible    | Warm charcoal       |
| Borders        | Very subtle         | Warm gray           |
| Accent         | Amber               | Amber               |
| Progress rail  | Same                | Same                |

This makes the decision feel like it **belongs to Voyager**.

---

# 5. I would actually remove the "ADVISOR NOTE" label

This is one place where I'd change your first design.

Inside a standalone questionnaire, "ADVISOR NOTE" makes sense.

Inside the consultation environment, it creates unnecessary terminology.

Instead, the decision itself can have a tiny contextual label:

**DECISION REQUIRED**

or, even better:

**YOUR PREFERENCE**

But I'd probably use:

> **A CHOICE IS NEEDED**

It's more human and fits the agent narrative.

Something like:

```text
01  ·  TRADE-OFF

A CHOICE IS NEEDED

Would you rather keep the pace gentle
or see a little more, even if it means
more walking?
```

The typography can remain very similar to your existing screen.

---

# 6. The right rail should acknowledge the interruption

This is where your existing consultation screen gives you a major opportunity.

Currently:

```text
CONSTRAINT & PREFERENCE
IN PROGRESS

Honouring your priorities and
constraints.
```

When a decision arises, change that stage to:

```text
CONSTRAINT & PREFERENCE

DECISION REQUIRED

Your input is needed
to continue.
```

And perhaps add a very subtle amber indicator.

So the right rail becomes the persistent explanation of **why the central interface changed**.

You don't need a giant "WAITING FOR YOU" banner.

The rail quietly tells the story.

---

# 7. The central status text should disappear

When the decision panel appears, don't keep:

> Refining the journey so time feels well spent.

underneath it.

That belongs to the agent-working state.

Instead, the decision panel occupies that conceptual space.

This gives you a very clean state machine:

### WORKING

```text
             ●

      Refining the journey
      so time feels well spent.
```

### NEEDS INPUT

```text
       A CHOICE IS NEEDED

   Would you rather keep the pace
   gentle or see a little more?

   [ Prioritize comfort       ○ ]
   [ Prioritize coverage      ○ ]
```

### RESUMING

After the user selects:

```text
             ●

       Preference recorded.

       Reworking the journey...
```

Then the decision surface **dissolves away** and you return to the original consultation screen.

That transition is crucial.

---

# 8. Don't immediately disappear after selection

I would give the user a tiny amount of feedback.

Suppose they choose:

> Prioritize coverage

The selected card gets a restrained amber outline.

Then:

```text
Prioritize coverage
More attraction visits and a higher
movement burden.

                 ✓
```

for perhaps ~500 ms.

Then the entire decision surface fades/softly contracts into the background.

The orb becomes active again.

Status:

> **Preference recorded. Reworking the journey...**

Then after a short interval:

> **Refining the journey so time feels well spent.**

This creates the psychological feeling that the user's decision has actually been **consumed by the agent**.

---

# 9. The animation should be a state transition, not a modal animation

This distinction matters.

Don't do:

> page → modal pops in → modal disappears

Do:

> agent working → agent notices uncertainty → agent surfaces uncertainty → user resolves it → agent resumes

Visually, I'd use roughly:

### Entering decision state

**0 to 400 ms**

* Orb glow becomes slightly brighter
* Existing status text fades
* Central area gains a very subtle warm radial glow
* Decision heading fades in
* Cards rise/fade in sequentially

### User interaction

**100 to 200 ms**

* Card border transitions
* Radio indicator fills
* Selected card becomes slightly brighter

### Returning

**300 to 600 ms**

* Selection confirmation
* Decision surface fades
* Orb regains stronger glow
* Working status appears

Keep it restrained. This interface is clearly trying to communicate sophistication, and excessive motion will undermine that.

---

# 10. The decision should visually "interrupt" the progress rail

I'd make one additional change.

When waiting for the user:

```text
● Constraint & Preference
  DECISION REQUIRED
```

And perhaps the following stages become slightly dimmer.

So:

```text
PROGRESS

● Discovery
  COMPLETED

● Constraint & Preference
  DECISION REQUIRED
  ─────────────────────

○ Attraction & Experience
  QUEUED

○ Mobility & Logistics
  QUEUED
```

This communicates that the agent's pipeline has effectively **paused at this node**.

That is much more elegant than displaying a generic loading state.

---

# 11. The whole thing could look like this

Conceptually, your three states become:

### State A: Agent working

```text
┌──────────────────────────────────────────────────────────────┐
│ VOYAGER CONSULTATION                         CONSULTATION    │
│                                                              │
│                                                              │
│                                                              │
│                         ╭────╮                               │
│                       ╭─╯    ╰─╮                             │
│                       │   ●    │                             │
│                       ╰─╮    ╭─╯                             │
│                         ╰────╯                               │
│                                                              │
│                Refining the journey so time                 │
│                      feels well spent.                       │
│                                                              │
│                                              PROGRESS        │
│                                              ● Discovery     │
│                                                COMPLETED     │
│                                              ● Constraint    │
│                                                IN PROGRESS   │
│                                              ○ Experience    │
│                                              ○ Mobility      │
│                                              ○ Cost         │
└──────────────────────────────────────────────────────────────┘
```

### State B: Decision required

```text
┌──────────────────────────────────────────────────────────────┐
│ VOYAGER CONSULTATION                         CONSULTATION    │
│                                                              │
│                                                              │
│                 01 · TRADE-OFF                              │
│                                                              │
│                  A CHOICE IS NEEDED                          │
│                                                              │
│             Would you rather keep the pace                   │
│             gentle or see a little more,                     │
│             even if it means more walking?                   │
│                                                              │
│              ┌────────────────────────────┐                  │
│              │ 01                         │                  │
│              │                            │                  │
│              │ Prioritize comfort      ○  │                  │
│              │                            │                  │
│              │ Fewer visits, less         │                  │
│              │ movement, more rest.       │                  │
│              └────────────────────────────┘                  │
│                                                              │
│              ┌────────────────────────────┐                  │
│              │ 02                         │                  │
│              │                            │                  │
│              │ Prioritize coverage     ○  │                  │
│              │                            │                  │
│              │ More visits, more walking. │                  │
│              └────────────────────────────┘                  │
│                                                              │
│                         Continue →                           │
│                                                              │
│                                              PROGRESS        │
│                                              ● Discovery     │
│                                                COMPLETED     │
│                                              ● Constraint    │
│                                                DECISION      │
│                                                REQUIRED      │
│                                              ○ Experience    │
│                                              ○ Mobility      │
└──────────────────────────────────────────────────────────────┘
```

### State C: Resuming

```text
┌──────────────────────────────────────────────────────────────┐
│ VOYAGER CONSULTATION                         CONSULTATION    │
│                                                              │
│                                                              │
│                         ◉                                    │
│                                                              │
│                    Preference recorded.                      │
│                                                              │
│                  Reworking the journey...                    │
│                                                              │
│                                              PROGRESS        │
│                                              ● Discovery     │
│                                                COMPLETED     │
│                                              ● Constraint    │
│                                                IN PROGRESS   │
│                                              ○ Experience    │
│                                              ○ Mobility      │
│                                              ○ Cost          │
└──────────────────────────────────────────────────────────────┘
```

Then it returns to State A.

---

# 12. One important change to the first screenshot

I'd also remove the **large "Continue" pill**.

Your original screen has:

> Continue →

in a fairly conventional rounded button.

That works, but the rest of Voyager is much more editorial and sophisticated.

I'd make it much quieter:

```text
Continue  →
```

or:

```text
Confirm preference  →
```

with no filled pill, perhaps just a thin underline or a very subtle warm button surface.

The **cards themselves should be the primary interaction**. The button is merely confirmation.

If selecting a card immediately registers the choice, you could actually eliminate Continue entirely:

```text
[ Prioritize comfort ]

[ Prioritize coverage ]
```

Clicking the choice itself confirms it.

That would be even more consistent with the "agent consultation" metaphor.

---

## The core design direction

I would summarize the architecture as:

**One screen. Three states.**

```text
                CONSULTATION
                     │
          ┌──────────┴──────────┐
          │                     │
       WORKING             DECISION NEEDED
          │                     │
          │                User selects
          │                     │
          └──────────┬──────────┘
                     │
                  RESUMING
                     │
                     ▼
                   WORKING
```

The **right rail never changes location**.

The **orb remains the visual anchor**.

The **dark environment never disappears**.

Only the **central content state changes**.

That is the aesthetic solution I'd use. It makes the trade-off feel like an actual moment in an intelligent consultation rather than an unrelated questionnaire being injected into the workflow.

---

# Proposals — Backend fixes discovered while fixing WS delivery (2026-08-21)

## 1. Fix `io.on('disconnect')` should be `socket.on('disconnect')`

**Target:** `backend/src/events/ConnectionEvents.ts` and `backend/src/handlers/ConnectionHandlers.ts`

**Issue:** `ConnectionEvents.ts` registers `io.on('disconnect', (socket) => handlers.onDisconnect(socket))`. `Server` never emits `disconnect`; only each `Socket` does. As a result `unregisterSocketById` is never called, sockets leak in `models/data.ts`.

**Evidence:** While tracing why frontend `session.start` never arrived, reading `backend/src/events/ConnectionEvents.ts:5-6` shows `io.on('connection',...)` correct but `io.on('disconnect',...)` incorrect. `handlers.onDisconnect` is therefore dead code. Frontend fix in `frontend/src/ws/WsProvider.tsx` (removing double `CommandRegistry.register` that caused deduplication drop) restores delivery, but backend leak remains.

**Suggested change:**
```ts
// backend/src/events/ConnectionEvents.ts
export function connectionEvents(io: Server) {
  io.on('connection', (socket: Socket) => {
    handlers.onConnect(socket);
    socket.on('disconnect', () => handlers.onDisconnect(socket));
  });
}
```
Remove the `io.on('disconnect', ...)` line.

**Reason:** Ensures `unregisterSocketById` runs on every disconnect, prevents stale socket entries, and matches socket.io idiom used for all other `socket.on(...)` handlers in `SessionEvents.ts`, `DiscoveryEvents.ts`, etc.

**Impact:** Low-risk, backend-only. Owner of `backend/` should apply and verify with a socket.io-client integration test: connect, disconnect, assert `getSocket`-style lookup no longer returns the id.

## 2. Consider single HTTP+WS server vs dual `createServer(app)` 

**Target:** `backend/src/app/Server.ts` (lines 38-50) and `backend/src/app/socketio.ts`

**Issue:** `Server.start()` does `app.listen(httpPort)` and separately `createServer(app).listen(wsPort)` where `createWebsocket` wraps the *same* Express app in a new `http.createServer`. This serves identical Express routes on two ports and is confusing when reasoning about CORS/port config (`HTTPPORT=5000`, `WSPORT=8000`).

**Evidence:** `backend/.env` uses `HTTPPORT=5000`/`WSPORT=8000` and `frontend/.env` `WS_URL=ws://localhost:8000/ws`. Connection log `socket connected` appears, so current dual-server happens to work, but future middleware (rate-limit, helmet) runs twice.

**Suggested change (optional):** Either document the dual-port intent explicitly, or attach socket.io to the single HTTP server: `const httpServer = createServer(app); const io = new Server(httpServer, {path:'/ws'}); httpServer.listen(httpPort)` and remove `wsPort` separation if only one port is desired. If two ports are intentional, pass `httpServer` explicitly instead of re-wrapping `app`.

**Reason:** Clarity and prevents duplicate route handling.

**Impact:** Requires coordinated config change (`WSPORT` vs single port) — do not change without updating `frontend/.env` and deployment docs.

