export type Motion = {
  name: string;
  apply: (home: number[]) => number[];
};

// Joint arrays are ordered spatially from the base toward the end effector
// (per the SDK's JointPositions contract). Offsets are applied relative to a
// captured home pose and clamped to whatever DOF count the connected arm has.
function offset(home: number[], jointFromEnd: number, deltaDeg: number): number[] {
  const index = home.length - 1 - jointFromEnd;
  const target = [...home];
  if (index >= 0) {
    target[index] += deltaDeg;
  }
  return target;
}

export const MOTIONS: Motion[] = [
  // Wrist dips down and back up — reads as a head nod.
  { name: 'nod', apply: (home) => offset(home, 0, 15) },
  // Base rotates off-center — reads as a side-to-side sway.
  { name: 'sway', apply: (home) => offset(home, home.length - 1, 20) },
  // Second-to-last joint twists — reads as a tilt/head-cock.
  { name: 'tilt', apply: (home) => offset(home, 1, -15) },
];
