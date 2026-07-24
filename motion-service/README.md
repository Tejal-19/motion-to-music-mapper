# motion-service

Receives a "beat detected" webhook call and drives the Viam arm through one
of three dance motions (`nod`, `sway`, `tilt`), cycling through shuffled
combinations of all three so the choreography doesn't feel repetitive.

## Setup

```
cp .env.example .env   # fill in HOST, API_KEY_ID, API_KEY, ARM_NAME
npm install
npm run dev
```

Position the arm at the pose you want as "home" before sending the first
beat — home is captured lazily from the arm's current joint positions on
the first `/beat` call and every motion is an offset from it.

## API

- `POST /beat` — call this on every detected beat. Triggers the next motion
  in the current shuffle cycle and returns `{ ok: true, motion: "nod" }`.
- `GET /health` — liveness check.

## How the cycling works

Each cycle of 3 beats uses `nod`, `sway`, and `tilt` exactly once, in a
freshly shuffled order (see `src/sequencer.ts`) — so which motion lands on
beat 1 changes cycle to cycle, but no motion is skipped or repeated within
a cycle.
