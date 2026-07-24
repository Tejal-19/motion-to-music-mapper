import { ArmLike, Pose } from './robot';

// Stand-in for a 6-DOF arm so /beat can be exercised end-to-end before real
// hardware is available. Logs every move instead of talking to a robot.
class MockArm implements ArmLike {
  private positions = [0, 0, 0, 0, 0, 0];

  async getJointPositions() {
    return { values: [...this.positions] };
  }

  async moveToJointPositions(target: number[]) {
    console.log(`[mock-arm] move -> [${target.map((v) => v.toFixed(1)).join(', ')}]`);
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.positions = [...target];
  }

  async getEndPosition() {
    return { x: 0, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0 };
  }

  async moveToPosition(pose: Pose) {
    console.log(`[mock-arm] moveToPosition -> x=${pose.x.toFixed(1)} y=${pose.y.toFixed(1)} z=${pose.z.toFixed(1)}`);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

export const mockArm = new MockArm();
