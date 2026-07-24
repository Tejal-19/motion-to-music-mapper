import { ArmLike, Pose } from './robot';

// Sends the arm directly to the target in one call — the arm's own motion
// controller produces a smoother trajectory than manual waypoint stepping
// does on this hardware — then holds briefly so the pose reads clearly
// before the next move starts.
export async function moveTo(arm: ArmLike, target: number[], holdMs: number) {
  await arm.moveToJointPositions(target);
  if (holdMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, holdMs));
  }
}

export async function moveToPose(arm: ArmLike, target: Pose, holdMs: number) {
  await arm.moveToPosition(target);
  if (holdMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, holdMs));
  }
}
