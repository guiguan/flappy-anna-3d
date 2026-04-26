import * as THREE from 'three';
import { createTree, createMountain, createBush, seededRandom } from '../utils/ProceduralGeo';
import { getTerrainHeight } from '../utils/ProceduralGeo';

interface EnvObject {
  mesh: THREE.Object3D;
  nativeX: number;
  z: number;
  yBase: number;
}

const CHUNK_SIZE = 30;
const VIEW_AHEAD = 200;
const VIEW_BEHIND = 160;

const MOUNTAIN_COLORS_NEAR = [0x3d5e3d, 0x3a5a3a, 0x4a6e4a, 0x2e4e2e];
const MOUNTAIN_COLORS_FAR = [0x8fbc8f, 0x7eae7e, 0xa0c8a0, 0x6e9e6e];

export class EnvironmentSpawner {
  private objects: EnvObject[] = [];
  private spawnedUpTo = 0;
  private grassGeo = new THREE.ConeGeometry(0.12, 0.4, 4, 2);
  private scene: THREE.Scene;
  private toonMat: (c: number) => THREE.MeshToonMaterial;

  constructor(scene: THREE.Scene, toonMat: (c: number) => THREE.MeshToonMaterial) {
    this.scene = scene;
    this.toonMat = toonMat;
  }

  private generateChunk(startX: number) {
    const seed = startX * 137;

    let s = seed;

    // Mountains (far background, z = -7 to -10, cover the horizon)
    // Fewer mountains with atmospheric perspective: near=darker, far=lighter
    const mountainCount = 2 + Math.floor(seededRandom(s++) * 3);
    for (let i = 0; i < mountainCount; i++) {
      const mx = startX + seededRandom(s++) * CHUNK_SIZE;
      const mz = -7 - seededRandom(s++) * 3;
      const h = 4 + seededRandom(s++) * 10;
      const w = 1.5 + seededRandom(s++) * 4;
      const depthT = (mz + 7) / -3; // 0 at z=-7 (near), 1 at z=-10 (far)
      const nearColor = MOUNTAIN_COLORS_NEAR[Math.floor(seededRandom(s++) * MOUNTAIN_COLORS_NEAR.length)];
      const farColor = MOUNTAIN_COLORS_FAR[Math.floor(seededRandom(s++) * MOUNTAIN_COLORS_FAR.length)];
      const nearC = new THREE.Color(nearColor);
      const farC = new THREE.Color(farColor);
      nearC.lerp(farC, depthT);
      const color = nearC.getHex();
      const mountain = createMountain(h, w, color) as THREE.Mesh;
      const mat = this.toonMat(color) as THREE.MeshToonMaterial;
      mat.color.set(color);
      mountain.material = mat;
      const terrainY = -0.5 + getTerrainHeight(mx, mz);
      const yBase = h / 2;
      mountain.position.set(0, terrainY + yBase, mz);
      this.scene.add(mountain);
      this.objects.push({ mesh: mountain, nativeX: mx, z: mz, yBase });
    }

    // Trees (mid background, z = -4)
    const treeCount = 3 + Math.floor(seededRandom(s++) * 3);
    for (let i = 0; i < treeCount; i++) {
      const tx = startX + seededRandom(s++) * CHUNK_SIZE;
      const tz = -3 - seededRandom(s++) * 3;
      const treeScale = 0.5 + seededRandom(s++) * 1.2;
      const tree = createTree(treeScale);
      const treeTerrainY = -0.5 + getTerrainHeight(tx, tz);
      tree.position.set(0, treeTerrainY, tz);
      tree.rotation.y = seededRandom(s++) * Math.PI * 2;
      this.scene.add(tree);
      this.objects.push({ mesh: tree, nativeX: tx, z: tz, yBase: 0 });
    }

    // Bushes (near background, z = -1.5)
    const bushCount = 1 + Math.floor(seededRandom(s++) * 3);
    for (let i = 0; i < bushCount; i++) {
      const bx = startX + seededRandom(s++) * CHUNK_SIZE;
      const bz = -1.5 - seededRandom(s++) * 1.5;
      const bush = createBush(0.6 + seededRandom(s++) * 1.0);
      const bushTerrainY = -0.5 + getTerrainHeight(bx, bz);
      bush.position.set(0, bushTerrainY, bz);
      this.scene.add(bush);
      this.objects.push({ mesh: bush, nativeX: bx, z: bz, yBase: 0 });
    }

    // Grass tufts (foreground, z = 1.5 to 3)
    const grassCount = 5 + Math.floor(seededRandom(s++) * 6);
    for (let i = 0; i < grassCount; i++) {
      const gx = startX + seededRandom(s++) * CHUNK_SIZE;
      const gz = 1.5 + seededRandom(s++) * 2;
      const grass = new THREE.Mesh(this.grassGeo, this.toonMat(0x5daa3e));
      const grassTerrainY = -0.5 + getTerrainHeight(gx, gz);
      grass.position.set(0, grassTerrainY + 0.2, gz);
      grass.rotation.z = (seededRandom(s++) - 0.5) * 0.3;
      grass.rotation.x = (seededRandom(s++) - 0.5) * 0.3;
      this.scene.add(grass);
      this.objects.push({ mesh: grass, nativeX: gx, z: gz, yBase: 0.2 });
    }
  }

  update(worldOffset: number) {
    while (this.spawnedUpTo < worldOffset + VIEW_AHEAD) {
      this.generateChunk(this.spawnedUpTo);
      this.spawnedUpTo += CHUNK_SIZE;
    }

    // Place objects at world positions with terrain-aware Y
    for (const obj of this.objects) {
      obj.mesh.position.x = obj.nativeX;
      obj.mesh.position.y = -0.5 + getTerrainHeight(obj.nativeX, obj.z) + obj.yBase;
      obj.mesh.position.z = obj.z;
    }

    // Recycle objects far behind camera — jump nativeX ahead
    const cameraX = worldOffset;
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      if (obj.nativeX < cameraX - VIEW_BEHIND) {
        obj.nativeX = this.spawnedUpTo + Math.random() * CHUNK_SIZE;
      }
    }
  }

  reset() {
    for (const obj of this.objects) {
      obj.mesh.removeFromParent();
    }
    this.objects = [];
    this.spawnedUpTo = 0;
  }
}
