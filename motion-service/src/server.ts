import 'dotenv/config';
import express from 'express';
import { connectArm } from './robot';
import { nextMotion } from './sequencer';
import { moveTo, moveToPose } from './animate';

const PORT = Number(process.env.PORT) || 8080;
const HOLD_MS = Number(process.env.HOLD_MS) || 400;
const app = express();
app.use(express.json());

let homePositions: number[] | null = null;

app.post('/beat', async (_req, res) => {
  try {
    const arm = await connectArm();
    if (!homePositions) {
      homePositions = (await arm.getJointPositions()).values;
    }

    const motion = nextMotion();
    const home = homePositions;

    // Fire-and-forget: respond to the webhook immediately so beat delivery
    // never blocks on arm settle time; log if the sequence itself fails.
    // Each motion runs its own sequence of moves, then we return to home to
    // reset for the next beat.
    (async () => {
      await motion.run(arm, home, HOLD_MS);
      await moveTo(arm, home, HOLD_MS);
    })().catch((err) => console.error(`[motion:${motion.name}] failed`, err));

    res.json({ ok: true, motion: motion.name });
  } catch (err) {
    console.error('Failed to handle beat', err);
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Read-only — no motion. Lets us see joint count/current values for
// designing motions against the actual connected arm.
app.get('/joints', async (_req, res) => {
  try {
    const arm = await connectArm();
    const { values } = await arm.getJointPositions();
    res.json({ count: values.length, values });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// Read-only — no motion. Full Cartesian pose (x/y/z + orientation) for
// designing Cartesian moves (moveToPosition) against the actual arm.
app.get('/pose', async (_req, res) => {
  try {
    const arm = await connectArm();
    const pose = await arm.getEndPosition();
    res.json({ ok: true, pose });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// Cartesian y-axis test move: shifts the end position by `deltaY` mm (x, z,
// and orientation held fixed) and back. For the wave motion's side-to-side
// swing, driven by Cartesian position instead of a joint-space guess.
app.post('/probe-y', async (req, res) => {
  try {
    const arm = await connectArm();
    const deltaY = Number(req.body?.deltaY);
    if (!Number.isFinite(deltaY)) {
      res.status(400).json({ ok: false, error: 'body must be { deltaY: mm }' });
      return;
    }
    const holdMs = Number(req.body?.holdMs) || HOLD_MS;

    const home = await arm.getEndPosition();
    const target = { ...home, y: home.y + deltaY };

    await moveToPose(arm, target, holdMs);
    const atTarget = await arm.getEndPosition();
    await moveToPose(arm, home, holdMs);

    res.json({ ok: true, deltaY, holdMs, yBefore: home.y, yAtTarget: atTarget.y });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// Single-joint test move: sends one joint by `delta` degrees and back to
// home. For empirically figuring out which sign moves a joint which
// direction, without risking a multi-joint collision.
app.post('/probe', async (req, res) => {
  try {
    const arm = await connectArm();
    if (!homePositions) {
      homePositions = (await arm.getJointPositions()).values;
    }

    // Accepts either a single { index, delta } or a multi-joint
    // { deltas: { [index]: delta } } for testing a combined pose.
    let deltas: Record<number, number>;
    if (req.body?.deltas && typeof req.body.deltas === 'object') {
      deltas = req.body.deltas;
    } else {
      const index = Number(req.body?.index);
      const delta = Number(req.body?.delta);
      if (!Number.isInteger(index) || index < 0 || index >= homePositions.length || !Number.isFinite(delta)) {
        res.status(400).json({
          ok: false,
          error: `body must be { index: 0-${homePositions.length - 1}, delta: degrees } or { deltas: { [index]: delta } }`,
        });
        return;
      }
      deltas = { [index]: delta };
    }

    const home = homePositions;
    const target = [...home];
    for (const [indexStr, delta] of Object.entries(deltas)) {
      const index = Number(indexStr);
      if (index >= 0 && index < target.length) {
        target[index] += Number(delta);
      }
    }
    const holdMs = Number(req.body?.holdMs) || HOLD_MS;

    // Awaited (unlike /beat) — this is a diagnostic tool, and we want exact
    // end-position z (mm, up/down) before/after instead of guessing from
    // eyeballing it.
    const before = await arm.getEndPosition();
    await moveTo(arm, target, holdMs);
    const atTarget = await arm.getEndPosition();
    await moveTo(arm, home, holdMs);

    res.json({
      ok: true,
      deltas,
      holdMs,
      zBefore: before.z,
      zAtTarget: atTarget.z,
      zDeltaMm: atTarget.z - before.z,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Beat webhook listening on :${PORT} — POST /beat on each detected beat`);
});
