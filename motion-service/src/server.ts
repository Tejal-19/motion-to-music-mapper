import 'dotenv/config';
import express from 'express';
import { connectArm } from './robot';
import { nextMotion } from './sequencer';

const PORT = Number(process.env.PORT) || 8080;
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
    const target = motion.apply(homePositions);

    // Fire-and-forget: respond to the webhook immediately so beat delivery
    // never blocks on arm settle time; log if the move itself fails.
    arm.moveToJointPositions(target).catch((err) => {
      console.error(`[motion:${motion.name}] failed`, err);
    });

    res.json({ ok: true, motion: motion.name });
  } catch (err) {
    console.error('Failed to handle beat', err);
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Beat webhook listening on :${PORT} — POST /beat on each detected beat`);
});
