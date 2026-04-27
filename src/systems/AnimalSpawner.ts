import * as THREE from 'three';
import { getTerrainHeight, createSheep, createCow } from '../utils/ProceduralGeo';
import type { EnvObject } from './EnvironmentSpawner';

const CHUNK_SIZE = 40;
const VIEW_AHEAD = 120;
const VIEW_BEHIND = 160;
const WANDER_RANGE = 10;

interface Animal {
  mesh: THREE.Group;
  nativeX: number;
  z: number;
  yBase: number;
  offset: number;
  vx: number;
  vz: number;
  targetX: number;
  targetZ: number;
  targetTimer: number;
}

export class AnimalSpawner {
  private objects: Animal[] = [];
  private spawnedUpTo = 0;
  private chunkIndex = 0;
  private scene: THREE.Scene;
  private obstacles: EnvObject[] = [];

  setObstacles(obs: EnvObject[]) { this.obstacles = obs; }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(worldOffset: number, dt: number) {
    while (this.spawnedUpTo < worldOffset + VIEW_AHEAD) {
            this.generateChunk(this.spawnedUpTo);
      this.spawnedUpTo += CHUNK_SIZE;
      this.chunkIndex++;
    }

    for (const obj of this.objects) {
      // Steer toward target
      const tdx = obj.targetX - obj.nativeX;
      const tdz = obj.targetZ - obj.z;
      const tdist = Math.sqrt(tdx * tdx + tdz * tdz);
      const speed = 0.6;
      if (tdist > 0.1) {
        obj.vx = (tdx / tdist) * speed;
        obj.vz = (tdz / tdist) * speed;
        obj.nativeX += obj.vx * dt;
        obj.z += obj.vz * dt;
      }

      obj.targetTimer -= dt;
      const sx = obj.mesh.userData.spawnX as number;
      const sz = obj.mesh.userData.spawnZ as number;
      if (obj.targetTimer <= 0 || tdist < 0.3) {
        // Pick target avoiding obstacles
        let tx: number, tz: number, attempts = 0;
        do {
          tx = sx + (Math.random() - 0.5) * WANDER_RANGE * 2;
          tz = sz + (Math.random() - 0.5) * WANDER_RANGE;
          attempts++;
        } while (attempts < 10 && this.obstacles.some(o => {
          const odx = tx - o.nativeX;
          const odz = tz - o.z;
          return Math.sqrt(odx * odx + odz * odz) < 1.5;
        }));
        obj.targetX = tx;
        obj.targetZ = tz;
        obj.targetTimer = 3 + Math.random() * 6;
      }

      obj.mesh.position.x = obj.nativeX;
      obj.mesh.position.y = -0.5 + getTerrainHeight(obj.nativeX, obj.z) + obj.yBase;
      obj.mesh.position.z = obj.z;
    }

    const cameraX = worldOffset;
    for (const obj of this.objects) {
      if (obj.nativeX < cameraX - VIEW_BEHIND) {
        obj.nativeX = this.spawnedUpTo + Math.random() * CHUNK_SIZE;
        const side = Math.random() > 0.5 ? 1 : -1;
        obj.z = side > 0
          ? 2 + Math.random() * 10
          : -2 - Math.random() * 3;
        obj.mesh.userData.spawnX = obj.nativeX;
        obj.mesh.userData.spawnZ = obj.z;
        obj.targetX = obj.nativeX;
        obj.targetZ = obj.z;
      }
    }
  }

  private generateChunk(startX: number) {
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const isSheep = Math.random() > 0.4;
      const mesh = isSheep ? createSheep() : createCow();
      const x = startX + Math.random() * CHUNK_SIZE;
      const side = Math.random() > 0.5 ? 1 : -1;
      const z = side > 0
        ? 2 + Math.random() * 10
        : -2 - Math.random() * 3;
      const yBase = isSheep ? 0.08 : 0.10;
      mesh.position.set(x, -0.5 + getTerrainHeight(x, z) + yBase, z);
      mesh.userData.spawnX = x;
      mesh.userData.spawnZ = z;
      this.scene.add(mesh);
      this.objects.push({
        mesh, nativeX: x, z, yBase, offset: Math.random() * 100,
        vx: 0, vz: 0,
        targetX: x, targetZ: z,
        targetTimer: 3 + Math.random() * 4,
      });
    }
  }

  reset() {
    for (const obj of this.objects) obj.mesh.removeFromParent();
    this.objects = [];
    this.spawnedUpTo = 0;
    this.chunkIndex = 0;
  }

  getObjects(): Animal[] { return this.objects; }
}
