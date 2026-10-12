import { RoverConfig, RoverLevelObject, RoverState, WheelState } from './types';

export function getTerrainHeight(
  terrain: { x: number; y: number }[],
  x: number
): { y: number; nx: number; ny: number; slope: number } {
  if (!terrain || terrain.length < 2) {
    return { y: 600, nx: 0, ny: -1, slope: 0 };
  }

  // Clamping
  if (x <= terrain[0].x) {
    const p1 = terrain[0];
    const p2 = terrain[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    return { y: p1.y, nx: -dy / len, ny: dx / len, slope: dy / (dx || 1) };
  }

  const last = terrain[terrain.length - 1];
  if (x >= last.x) {
    const p1 = terrain[terrain.length - 2];
    const p2 = last;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    return { y: p2.y, nx: -dy / len, ny: dx / len, slope: dy / (dx || 1) };
  }

  // Find segment
  let i = 0;
  while (i < terrain.length - 1 && terrain[i + 1].x < x) {
    i++;
  }

  const p1 = terrain[i];
  const p2 = terrain[i + 1];
  const t = (x - p1.x) / (p2.x - p1.x || 1);
  const y = p1.y + t * (p2.y - p1.y);

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  // Normal pointing UP (towards negative y in canvas)
  // Tangent is (dx, dy). Up normal is (dy/len, -dx/len)
  const nx = dy / len;
  const ny = -dx / len;

  return { y, nx, ny, slope: dy / (dx || 1) };
}

export function createInitialRoverState(startX: number, startY: number, config: RoverConfig): RoverState {
  const wheelRadius = 12;
  const rearWheel: WheelState = {
    x: startX - 26,
    y: startY + 16,
    vx: 0,
    vy: 0,
    angularVel: 0,
    radius: wheelRadius,
    isGrounded: false,
  };

  const frontWheel: WheelState = {
    x: startX + 26,
    y: startY + 16,
    vx: 0,
    vy: 0,
    angularVel: 0,
    radius: wheelRadius,
    isGrounded: false,
  };

  return {
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVel: 0,
    fuel: config.maxFuel,
    isBoosting: false,
    rearWheel,
    frontWheel,
    crashed: false,
    finished: false,
    crystalsCollected: 0,
    airborneTime: 0,
    health: 100,
  };
}

export interface RoverInputs {
  accelerate: boolean; // D / Right
  reverse: boolean;    // A / Left
  tiltLeft: boolean;   // Q or Left in air
  tiltRight: boolean;  // E or Right in air
  boost: boolean;      // W / Space / Up
}

export function updateRoverPhysics(
  state: RoverState,
  inputs: RoverInputs,
  terrain: { x: number; y: number }[],
  objects: RoverLevelObject[],
  config: RoverConfig,
  dt: number,
  onPickup?: (type: 'crystal' | 'fuel') => void,
  onSpring?: () => void,
  onMineHit?: () => void
): RoverState {
  if (state.crashed || state.finished) {
    return state;
  }

  // Substepping for ultra-stable spring & collision integration
  const SUB_STEPS = 4;
  const sdt = dt / SUB_STEPS;

  const next = { ...state };
  next.rearWheel = { ...state.rearWheel };
  next.frontWheel = { ...state.frontWheel };

  for (let step = 0; step < SUB_STEPS; step++) {
    // 1. Check Low-G zones
    let effGravity = config.gravity;
    for (const obj of objects) {
      if (obj.type === 'lowGZone' && obj.width && obj.height) {
        if (
          next.x >= obj.x &&
          next.x <= obj.x + obj.width &&
          next.y >= obj.y &&
          next.y <= obj.y + obj.height
        ) {
          effGravity *= 0.35; // Lunar super-float field
        }
      }
    }

    // 2. Chassis gravity
    next.vy += effGravity * sdt;

    // 3. In-air rotation controls (Anti-flip balance control)
    const isAnyWheelGrounded = next.rearWheel.isGrounded || next.frontWheel.isGrounded;
    if (!isAnyWheelGrounded) {
      next.airborneTime += sdt;
      // Air pitch control
      const airTorque = 4.2;
      if (inputs.tiltLeft || inputs.reverse) {
        next.angularVel -= airTorque * sdt;
      }
      if (inputs.tiltRight || inputs.accelerate) {
        next.angularVel += airTorque * sdt;
      }
      // Natural air resistance on spin
      next.angularVel *= Math.pow(0.85, sdt);
    } else {
      next.airborneTime = 0;
      // Slight ground damping on angular velocity
      next.angularVel *= Math.pow(0.5, sdt);
    }

    // 4. Boost Thrusters
    next.isBoosting = false;
    if (inputs.boost && next.fuel > 0) {
      next.isBoosting = true;
      next.fuel = Math.max(0, next.fuel - 18 * sdt);
      // Thrust vector: upward and slightly forward relative to vehicle orientation
      const thrustAngle = next.angle - Math.PI / 2;
      const thrustX = Math.cos(thrustAngle) * config.boostForce;
      const thrustY = Math.sin(thrustAngle) * config.boostForce;
      next.vx += thrustX * sdt;
      next.vy += thrustY * sdt;
    }

    // 5. Integrate Chassis position & angle
    next.x += next.vx * sdt;
    next.y += next.vy * sdt;
    next.angle += next.angularVel * sdt;

    // Air friction on chassis
    next.vx *= Math.pow(0.96, sdt);
    next.vy *= Math.pow(0.98, sdt);

    // 6. Calculate wheel mount points on chassis
    const cosA = Math.cos(next.angle);
    const sinA = Math.sin(next.angle);

    // Local wheel offsets
    const rearMountLocal = { x: -26, y: 14 };
    const frontMountLocal = { x: 26, y: 14 };

    const rearMount = {
      x: next.x + (rearMountLocal.x * cosA - rearMountLocal.y * sinA),
      y: next.y + (rearMountLocal.x * sinA + rearMountLocal.y * cosA),
    };

    const frontMount = {
      x: next.x + (frontMountLocal.x * cosA - frontMountLocal.y * sinA),
      y: next.y + (frontMountLocal.x * sinA + frontMountLocal.y * cosA),
    };

    // 7. Process Wheels (Suspension + Ground Contact + Drive Traction)
    const processWheel = (
      wheel: WheelState,
      mount: { x: number; y: number },
      isDriveWheel: boolean
    ) => {
      // Wheel gravity
      wheel.vy += effGravity * sdt;

      // Integrate wheel pos
      wheel.x += wheel.vx * sdt;
      wheel.y += wheel.vy * sdt;

      // Query terrain under wheel
      const g = getTerrainHeight(terrain, wheel.x);
      const groundY = g.y;
      const penetration = wheel.y + wheel.radius - groundY;

      if (penetration > 0) {
        wheel.isGrounded = true;
        // Push wheel out of ground along terrain normal
        wheel.x += g.nx * penetration;
        wheel.y += g.ny * penetration;

        // Normal velocity component
        const vDotN = wheel.vx * g.nx + wheel.vy * g.ny;
        if (vDotN < 0) {
          wheel.vx -= vDotN * g.nx * 1.2; // slight restitution
          wheel.vy -= vDotN * g.ny * 1.2;
        }

        // Tangent unit vector along surface (nx, ny points UP, so tangent points forward)
        const tx = -g.ny;
        const ty = g.nx;

        // Drive acceleration
        let drive = 0;
        if (inputs.accelerate) drive += config.enginePower;
        if (inputs.reverse) drive -= config.enginePower * 0.7;

        if (isDriveWheel && drive !== 0) {
          wheel.vx += tx * drive * sdt;
          wheel.vy += ty * drive * sdt;
          wheel.angularVel = drive / wheel.radius;
        }

        // Ground friction damping
        const vDotT = wheel.vx * tx + wheel.vy * ty;
        const frictionForce = vDotT * config.wheelFriction * 10 * sdt;
        wheel.vx -= tx * frictionForce;
        wheel.vy -= ty * frictionForce;
      } else {
        wheel.isGrounded = false;
        // In air wheel spins slowly down
        wheel.angularVel *= Math.pow(0.9, sdt);
      }

      // Spring connection to Chassis Mount
      const dx = wheel.x - mount.x;
      const dy = wheel.y - mount.y;
      const dist = Math.hypot(dx, dy) || 1;
      const restLen = 14;
      const delta = dist - restLen;

      // Spring force direction
      const ndx = dx / dist;
      const ndy = dy / dist;

      // Relative velocity
      const relVx = wheel.vx - next.vx;
      const relVy = wheel.vy - next.vy;
      const relV = relVx * ndx + relVy * ndy;

      const springForce = delta * config.suspensionSpring + relV * config.suspensionDamping;

      // Apply to wheel
      wheel.vx -= ndx * springForce * sdt;
      wheel.vy -= ndy * springForce * sdt;

      // Reaction on chassis (pushes/pulls chassis)
      next.vx += ndx * springForce * 0.5 * sdt;
      next.vy += ndy * springForce * 0.5 * sdt;

      // Torque on chassis: cross product of (mount - chassisCenter) and Reaction Force
      const armX = mount.x - next.x;
      const armY = mount.y - next.y;
      const reactionForceX = ndx * springForce * 0.5;
      const reactionForceY = ndy * springForce * 0.5;
      const torque = armX * reactionForceY - armY * reactionForceX;
      next.angularVel += (torque / 1200) * sdt;
    };

    processWheel(next.rearWheel, rearMount, true);
    processWheel(next.frontWheel, frontMount, true);

    // 8. CRASH / ROLL-OVER CHECK (The Core Rule: Avoid turning the vehicle over!)
    // Check Roll Cage / Cabin vertex at top of rover
    const cabinLocal = { x: 0, y: -20 };
    const cabinWorld = {
      x: next.x + (cabinLocal.x * cosA - cabinLocal.y * sinA),
      y: next.y + (cabinLocal.x * sinA + cabinLocal.y * cosA),
    };

    const cabinGround = getTerrainHeight(terrain, cabinWorld.x);
    if (cabinWorld.y >= cabinGround.y) {
      // Cabin has struck the terrain!
      next.crashed = true;
      next.crashReason = 'Vehicle turned upside down! Roll cage crushed.';
      break;
    }

    // Also check extreme tilt while both wheels are on top of rover
    const normalizedAngle = Math.atan2(Math.sin(next.angle), Math.cos(next.angle));
    if (Math.abs(normalizedAngle) > (Math.PI * 0.72)) {
      // Vehicle is over 130 degrees rotated
      const chassisGround = getTerrainHeight(terrain, next.x);
      if (next.y + 10 >= chassisGround.y) {
        next.crashed = true;
        next.crashReason = 'Vehicle flipped over on lunar crust!';
        break;
      }
    }
  }

  // 9. Process Objects Interactions (Pickups, Finish Beacon, Mines, Springboards)
  for (const obj of objects) {
    if (obj.collected) continue;

    const distToRover = Math.hypot(next.x - obj.x, next.y - obj.y);

    if (obj.type === 'finish') {
      if (distToRover < 46) {
        next.finished = true;
      }
    } else if (obj.type === 'crystal') {
      if (distToRover < 32) {
        obj.collected = true;
        next.crystalsCollected += 1;
        onPickup?.('crystal');
      }
    } else if (obj.type === 'fuel') {
      if (distToRover < 32) {
        obj.collected = true;
        next.fuel = Math.min(config.maxFuel, next.fuel + (obj.amount || 40));
        onPickup?.('fuel');
      }
    } else if (obj.type === 'mine') {
      const mineR = obj.radius || 18;
      if (distToRover < mineR + 16) {
        next.crashed = true;
        next.crashReason = 'Detonated Plasma Mine!';
        onMineHit?.();
      }
    } else if (obj.type === 'jumpPad') {
      if (distToRover < 36) {
        const padPower = obj.power || 480;
        next.vy = -padPower;
        next.vx += 120;
        next.rearWheel.vy = -padPower;
        next.frontWheel.vy = -padPower;
        onSpring?.();
      }
    }
  }

  return next;
}
