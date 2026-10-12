export type RoverObjectType =
  | 'start'
  | 'finish'
  | 'crystal'
  | 'fuel'
  | 'mine'
  | 'jumpPad'
  | 'lowGZone'
  | 'boulder';

export interface RoverLevelObject {
  id: string;
  type: RoverObjectType;
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  power?: number;
  amount?: number;
  collected?: boolean;
}

export interface RoverConfig {
  enginePower: number;       // default 280
  suspensionSpring: number;  // default 200
  suspensionDamping: number; // default 16
  wheelFriction: number;     // default 1.4
  boostForce: number;        // default 450
  maxFuel: number;           // default 100
  gravity: number;           // default 340 (lunar-like)
}

export interface RoverLevel {
  id: string;
  name: string;
  description: string;
  difficulty: 'Training' | 'Standard' | 'Hazard';
  parTime: number; // seconds for 3 stars
  totalCrystals: number;
  terrain: { x: number; y: number }[];
  objects: RoverLevelObject[];
  config: RoverConfig;
}

export interface WheelState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angularVel: number;
  radius: number;
  isGrounded: boolean;
  contactPoint?: { x: number; y: number };
}

export interface RoverState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;           // in radians
  angularVel: number;      // in rad/s
  fuel: number;
  isBoosting: boolean;
  rearWheel: WheelState;
  frontWheel: WheelState;
  crashed: boolean;
  crashReason?: string;
  finished: boolean;
  finishTime?: number;
  crystalsCollected: number;
  airborneTime: number;
  health: number;
}
