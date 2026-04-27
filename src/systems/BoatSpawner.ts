import * as THREE from 'three';
import { createBoat, smoothstep } from '../utils/ProceduralGeo';

const CHUNK_SIZE = 50;
const VIEW_AHEAD = 120;
const VIEW_BEHIND = 160;
const WATER_Y = -2.0;
const WANDER_RANGE = 25;

interface Boat {
  mesh: THREE.Group;
  nativeX: number;
  z: number;
  offset: number;
  vx: number;
  vz: number;
  targetX: number;
  targetZ: number;
  targetTimer: number;
}

export class BoatSpawner {
  private objects: Boat[] = [];
  private spawnedUpTo = 0;
  private chunkIndex = 0;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private waveHeight(x: number, z: number, t: number): number {
    const wave = Math.sin(x * 0.4 + t * 0.8) * 0.35
      + Math.sin(x * 0.25 + z * 0.2 + t * 1.2) * 0.25
      + Math.cos(x * 0.12 + t * 0.55) * 0.2
      + Math.sin(x * 0.06 + t * 0.3) * 0.5;
    // Match vertex shader zFade
    const zFade = smoothstep(-45, -25, z);
    return wave * zFade;
  }

  update(worldOffset: number, dt: number, time: number) {
    while (this.spawnedUpTo < worldOffset + VIEW_AHEAD) {
      if (this.chunkIndex % 4 === 0) this.generateChunk(this.spawnedUpTo);
      this.spawnedUpTo += CHUNK_SIZE;
      this.chunkIndex++;
    }

    const cameraX = worldOffset;
    for (const obj of this.objects) {
      if (Math.abs(obj.nativeX - cameraX) >= VIEW_AHEAD + 50) continue;
      const tdx = obj.targetX - obj.nativeX;
      const tdz = obj.targetZ - obj.z;
      const tdist = Math.sqrt(tdx * tdx + tdz * tdz);
      const speed = 0.4;
      const desiredVx = tdist > 0.05 ? (tdx / tdist) * speed : 0;
      const desiredVz = tdist > 0.05 ? (tdz / tdist) * speed : 0;
      const turnLerp = 1 - Math.exp(-1.5 * dt);
      obj.vx += (desiredVx - obj.vx) * turnLerp;
      obj.vz += (desiredVz - obj.vz) * turnLerp;
      obj.nativeX += obj.vx * dt;
      obj.z += obj.vz * dt;

      obj.targetTimer -= dt;
      const sx = obj.mesh.userData.spawnX as number;
      const sz = obj.mesh.userData.spawnZ as number;
      if (obj.targetTimer <= 0 || tdist < 0.5) {
        obj.targetX = sx + (Math.random() - 0.5) * WANDER_RANGE * 2;
        obj.targetZ = sz + (Math.random() - 0.5) * WANDER_RANGE * 0.8;
        obj.targetTimer = 5 + Math.random() * 10;
      }

      obj.mesh.position.x = obj.nativeX;
      obj.mesh.position.y = WATER_Y + this.waveHeight(obj.nativeX, obj.z, time * 0.001);
      obj.mesh.position.z = obj.z;
    }

    for (const obj of this.objects) {
      if (obj.nativeX < cameraX - VIEW_BEHIND) {
        obj.nativeX = this.spawnedUpTo + Math.random() * CHUNK_SIZE;
        obj.z = -30 - Math.random() * 20;
        obj.mesh.userData.spawnX = obj.nativeX;
        obj.mesh.userData.spawnZ = obj.z;
        obj.targetX = obj.nativeX;
        obj.targetZ = obj.z;
      }
    }
  }

  private generateChunk(startX: number) {
    const count = 1;
    for (let i = 0; i < count; i++) {
      const mesh = createBoat();
      const x = startX + Math.random() * CHUNK_SIZE;
      const z = -30 - Math.random() * 20;
      mesh.position.set(x, WATER_Y, z);
      mesh.userData.spawnX = x;
      mesh.userData.spawnZ = z;
      this.scene.add(mesh);
      this.objects.push({
        mesh, nativeX: x, z, offset: Math.random() * 100,
        vx: 0, vz: 0,
        targetX: x, targetZ: z,
        targetTimer: 5 + Math.random() * 8,
      });
    }
  }

  reset() {
    for (const obj of this.objects) obj.mesh.removeFromParent();
    this.objects = [];
    this.spawnedUpTo = 0;
    this.chunkIndex = 0;
  }

  getObjects(): Boat[] { return this.objects; }
}
