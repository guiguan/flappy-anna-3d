import * as THREE from 'three';
import { createTree, createTreeRound, createMountain, createBush, createBushWide, seededRandom } from '../utils/ProceduralGeo';
import { getTerrainHeight } from '../utils/ProceduralGeo';

export interface EnvObject {
  mesh: THREE.Object3D;
  nativeX: number;
  z: number;
  yBase: number;
  nearColor?: THREE.Color;
  farColor?: THREE.Color;
  childOrigColors?: number[];
}

const CHUNK_SIZE = 30;
const VIEW_AHEAD = 200;
const VIEW_BEHIND = 160;

const MOUNTAIN_COLORS_NEAR = [0x1a4a1a, 0x2d5a2d, 0x3d6e2e, 0x4e7a3a, 0x5a7e3e, 0x6e8e3a, 0x7e9e3e];
const MOUNTAIN_COLORS_FAR = [0x9ec8a8, 0x8eb898, 0xaed8b8, 0x7ea888];


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

    // Mountains — atmospheric perspective: near=dark, far=light
    const mountainCount = 2 + Math.floor(seededRandom(s++) * 3);
    for (let i = 0; i < mountainCount; i++) {
      const mx = startX + seededRandom(s++) * CHUNK_SIZE;
      const mz = -7 - seededRandom(s++) * 3;
      const h = 4 + seededRandom(s++) * 10;
      const w = 1.5 + seededRandom(s++) * 4;
      const nearColor = MOUNTAIN_COLORS_NEAR[Math.floor(seededRandom(s++) * MOUNTAIN_COLORS_NEAR.length)];
      const farColor = MOUNTAIN_COLORS_FAR[Math.floor(seededRandom(s++) * MOUNTAIN_COLORS_FAR.length)];
      const nearC = new THREE.Color(nearColor);
      const farC = new THREE.Color(farColor);
      // Initial color set to near (dark) — will be updated per-frame
      const color = nearC.getHex();
      const mountain = createMountain(h, w, color) as THREE.Mesh;
      const mat = this.toonMat(color) as THREE.MeshToonMaterial;
      mat.color.set(color);
      mountain.material = mat;
      const terrainY = -0.5 + getTerrainHeight(mx, mz);
      // Sink base below terrain so edges never float
      const yBase = h / 2 - w * 0.15;
      mountain.position.set(0, terrainY + yBase, mz);
      this.scene.add(mountain);
      this.objects.push({ mesh: mountain, nativeX: mx, z: mz, yBase, nearColor: nearC, farColor: farC });
    }

    // Trees — both sides: ocean (negative Z) and grassland (positive Z)
    const treeCount = 2 + Math.floor(seededRandom(s++) * 3);
    for (let i = 0; i < treeCount; i++) {
      const tx = startX + seededRandom(s++) * CHUNK_SIZE;
      const side = seededRandom(s++) > 0.5 ? 1 : -1;
      const tz = side > 0
        ? 1.5 + seededRandom(s++) * 10
        : -3 - seededRandom(s++) * 3;
      const treeScale = 0.5 + seededRandom(s++) * 1.2;
      const useRound = seededRandom(s++) > 0.5;
      const tree = useRound ? createTreeRound(treeScale) : createTree(treeScale);
      const treeTerrainY = -0.5 + getTerrainHeight(tx, tz);
      tree.position.set(0, treeTerrainY, tz);
      tree.rotation.y = seededRandom(s++) * Math.PI * 2;
      this.scene.add(tree);
      const treeColors: number[] = [];
      tree.traverse((c) => {
        if (c instanceof THREE.Mesh) treeColors.push((c.material as THREE.MeshToonMaterial).color.getHex());
      });
      this.objects.push({ mesh: tree, nativeX: tx, z: tz, yBase: 0, childOrigColors: treeColors });
    }

    // Bushes — both sides
    const bushCount = 2 + Math.floor(seededRandom(s++) * 3);
    for (let i = 0; i < bushCount; i++) {
      const bx = startX + seededRandom(s++) * CHUNK_SIZE;
      const side = seededRandom(s++) > 0.5 ? 1 : -1;
      const bz = side > 0
        ? 1.5 + seededRandom(s++) * 8
        : -1.5 - seededRandom(s++) * 1.5;
      const bushScale = 0.6 + seededRandom(s++) * 1.0;
      const useWide = seededRandom(s++) > 0.5;
      const bush = useWide ? createBushWide(bushScale) : createBush(bushScale);
      const bushTerrainY = -0.5 + getTerrainHeight(bx, bz);
      bush.position.set(0, bushTerrainY, bz);
      this.scene.add(bush);
      const bushColors: number[] = [];
      bush.traverse((c) => {
        if (c instanceof THREE.Mesh) bushColors.push((c.material as THREE.MeshToonMaterial).color.getHex());
      });
      this.objects.push({ mesh: bush, nativeX: bx, z: bz, yBase: -0.1, childOrigColors: bushColors });
    }

    // Grass tufts — spread widely across grassland (positive Z)
    const grassCount = 8 + Math.floor(seededRandom(s++) * 7);
    for (let i = 0; i < grassCount; i++) {
      const gx = startX + seededRandom(s++) * CHUNK_SIZE;
      const gz = (seededRandom(s++) > 0.5 ? 1 : -1) * (0.5 + seededRandom(s++) * 10);
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

    const cameraX = worldOffset;

    // Place objects at world positions with terrain-aware Y + mountain color
    for (const obj of this.objects) {
      obj.mesh.position.x = obj.nativeX;
      obj.mesh.position.y = -0.5 + getTerrainHeight(obj.nativeX, obj.z) + obj.yBase;
      obj.mesh.position.z = obj.z;

      // Per-frame atmospheric perspective — fade only behind player
      const behind = cameraX - obj.nativeX;
      const depthT = Math.min(1, Math.max(0, behind / 150));
      if (obj.nearColor && obj.farColor) {
        // Mountains (single mesh)
        const color = obj.nearColor.clone().lerp(obj.farColor, depthT);
        ((obj.mesh as THREE.Mesh).material as THREE.MeshToonMaterial).color.set(color);
      } else if (obj.childOrigColors) {
        // Trees/bushes (groups) — fade each child from its original color
        const misty = new THREE.Color(0xd0d8e0);
        let ci = 0;
        obj.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh && ci < obj.childOrigColors!.length) {
            const orig = new THREE.Color(obj.childOrigColors![ci++]);
            const far = orig.clone().lerp(misty, 0.55);
            (c.material as THREE.MeshToonMaterial).color.copy(orig.clone().lerp(far, depthT));
          }
        });
      }
    }

    // Recycle objects far behind camera — jump nativeX ahead
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      if (obj.nativeX < cameraX - VIEW_BEHIND) {
        obj.nativeX = this.spawnedUpTo + Math.random() * CHUNK_SIZE;
      }
    }
  }

  getObjects(): EnvObject[] { return this.objects; }

  reset() {
    for (const obj of this.objects) {
      obj.mesh.removeFromParent();
    }
    this.objects = [];
    this.spawnedUpTo = 0;
  }
}
