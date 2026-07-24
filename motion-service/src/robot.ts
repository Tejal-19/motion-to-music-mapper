import * as VIAM from '@viamrobotics/sdk';
import * as wrtc from 'node-datachannel/polyfill';
import * as connectNode from '@connectrpc/connect-node';

// Must run before any SDK call that opens a connection (createRobotClient).
(globalThis as any).VIAM = {
  GRPC_TRANSPORT_FACTORY: (opts: any) =>
    connectNode.createGrpcTransport({ httpVersion: '2', ...opts }),
};
for (const key in wrtc) {
  (globalThis as any)[key] = (wrtc as any)[key];
}

export type Pose = { x: number; y: number; z: number; oX: number; oY: number; oZ: number; theta: number };

export type ArmLike = {
  getJointPositions(): Promise<{ values: number[] }>;
  moveToJointPositions(target: number[]): Promise<void>;
  getEndPosition(): Promise<Pose>;
  moveToPosition(pose: Pose): Promise<void>;
};

export type GripperLike = {
  open(): Promise<void>;
  grab(): Promise<void>;
};

let machineClient: VIAM.RobotClient | null = null;

async function connectMachine(): Promise<VIAM.RobotClient> {
  if (machineClient) return machineClient;

  const { HOST, API_KEY_ID, API_KEY } = process.env;
  if (!HOST || !API_KEY_ID || !API_KEY) {
    throw new Error('Missing HOST, API_KEY_ID, or API_KEY env vars — see .env.example');
  }

  machineClient = await VIAM.createRobotClient({
    host: HOST,
    credentials: { type: 'api-key', authEntity: API_KEY_ID, payload: API_KEY },
    signalingAddress: 'https://app.viam.com:443',
    iceServers: [{ urls: 'stun:global.stun.twilio.com:3478' }],
  });

  return machineClient;
}

// Lists every component/service configured on the machine — useful for
// checking what's actually available (e.g. is there a separate gripper
// resource, and what's it named) before wiring it in blind.
export async function listResources(): Promise<string[]> {
  const machine = await connectMachine();
  const names = await machine.resourceNames();
  return names.map((n) => `${n.subtype}/${n.name}`);
}

let armClient: ArmLike | null = null;

export async function connectArm(): Promise<ArmLike> {
  if (armClient) return armClient;

  if (process.env.MOCK === 'true') {
    const { mockArm } = await import('./mockArm');
    console.log('[robot] MOCK=true — using mock arm, no hardware connection');
    armClient = mockArm;
    return armClient;
  }

  const machine = await connectMachine();
  armClient = new VIAM.ArmClient(machine, process.env.ARM_NAME || 'arm');
  return armClient;
}

let gripperClient: GripperLike | null = null;

// Returns null if GRIPPER_NAME isn't set — the gripper is optional, unlike
// the arm.
export async function connectGripper(): Promise<GripperLike | null> {
  if (gripperClient) return gripperClient;

  if (process.env.MOCK === 'true') {
    const { mockGripper } = await import('./mockArm');
    return mockGripper;
  }

  const { GRIPPER_NAME } = process.env;
  if (!GRIPPER_NAME) return null;

  const machine = await connectMachine();
  gripperClient = new VIAM.GripperClient(machine, GRIPPER_NAME);
  return gripperClient;
}
