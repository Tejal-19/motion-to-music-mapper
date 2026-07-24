import { ArmLike } from './robot';
import { moveTo, moveToPose } from './animate';

// Joint index convention for this 6-DOF arm (spatially base -> end effector,
// per the SDK's JointPositions contract):
//   0 base/waist   1 shoulder   2 elbow   3 wrist1   4 wrist2   5 wrist3 (end rotate, next to gripper)
//
// Verified on hardware: negative deltas on shoulder (1) and elbow (2) both
// lift the end effector (elbow has the bigger effect); wrist2 (4) barely
// changes height and mainly adjusts hand angle.

export type Motion = {
  name: string;
  run: (arm: ArmLike, home: number[], holdMs: number) => Promise<void>;
};

function pose(home: number[], deltasByIndex: Record<number, number>): number[] {
  const target = [...home];
  for (const [indexStr, delta] of Object.entries(deltasByIndex)) {
    const index = Number(indexStr);
    if (index >= 0 && index < target.length) {
      target[index] += delta;
    }
  }
  return target;
}

// Verified safe on hardware: +213mm lift, no self-collision.
const OPEN_DELTAS = { 1: -45, 2: -30, 4: 20 };

export const MOTIONS: Motion[] = [
  // Shoulder + elbow lift, wrist2 compensates hand angle — the arm unfolds
  // outward and up in one reach.
  {
    name: 'open',
    run: async (arm, home, holdMs) => {
      await moveTo(arm, pose(home, OPEN_DELTAS), holdMs);
    },
  },

  // Reaches the same raised "open" pose, then swings the hand side to side
  // in Cartesian y (mm) around wherever it ends up — a literal hand wave,
  // driven by position rather than a guessed wrist-joint rotation.
  {
    name: 'wave',
    run: async (arm, home, holdMs) => {
      await moveTo(arm, pose(home, OPEN_DELTAS), holdMs);
      const raised = await arm.getEndPosition();
      const right = { ...raised, y: raised.y + 60 };
      const left = { ...raised, y: raised.y - 60 };
      for (const target of [right, left, right, left, raised]) {
        await moveToPose(arm, target, 250);
      }
    },
  },

  // Base rotates into a big turn, sways a couple times around that turned
  // position, then holds — the outer return-to-home step unwinds the turn.
  {
    name: 'turn-sway',
    run: async (arm, home, holdMs) => {
      const turned = pose(home, { 0: 70 });
      const swayRight = pose(turned, { 0: 15 });
      const swayLeft = pose(turned, { 0: -15 });
      await moveTo(arm, turned, holdMs);
      for (const target of [swayRight, swayLeft, swayRight, turned]) {
        await moveTo(arm, target, 300);
      }
    },
  },
];
