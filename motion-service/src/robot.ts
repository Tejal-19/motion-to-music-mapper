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

let armClient: ArmLike | null = null;

export async function connectArm(): Promise<ArmLike> {
  if (armClient) return armClient;

  if (process.env.MOCK === 'true') {
    const { mockArm } = await import('./mockArm');
    console.log('[robot] MOCK=true — using mock arm, no hardware connection');
    armClient = mockArm;
    return armClient;
  }

  const { HOST, API_KEY_ID, API_KEY, ARM_NAME } = process.env;
  if (!HOST || !API_KEY_ID || !API_KEY) {
    throw new Error('Missing HOST, API_KEY_ID, or API_KEY env vars — see .env.example');
  }

  const machine = await VIAM.createRobotClient({
    host: HOST,
    credentials: { type: 'api-key', authEntity: API_KEY_ID, payload: API_KEY },
    signalingAddress: 'https://app.viam.com:443',
    iceServers: [{ urls: 'stun:global.stun.twilio.com:3478' }],
  });

  armClient = new VIAM.ArmClient(machine, ARM_NAME || 'arm');
  return armClient;
}
