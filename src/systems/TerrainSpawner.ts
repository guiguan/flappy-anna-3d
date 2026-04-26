import * as THREE from 'three';
import { getTerrainHeight } from '../utils/ProceduralGeo';

const CHUNK_WIDTH = 30;
const CHUNK_DEPTH = 90;
const SEG_X = 30;
const SEG_Z = 36;
const VIEW_AHEAD = 200;
const VIEW_BEHIND = 80;

interface TerrainChunk {
  mesh: THREE.Mesh;
  startX: number;
}

export class TerrainSpawner {
  private chunks: TerrainChunk[] = [];
  private spawnedUpTo = 0;
  private scene: THREE.Scene;
  private groundMat: THREE.MeshToonMaterial;

  constructor(scene: THREE.Scene, groundMat: THREE.MeshToonMaterial) {
    this.scene = scene;
    this.groundMat = groundMat;
  }

  private createChunk(startX: number): TerrainChunk {
    const geo = new THREE.PlaneGeometry(CHUNK_WIDTH, CHUNK_DEPTH, SEG_X, SEG_Z);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + startX;
      const wz = pos.getZ(i);
      pos.setY(i, getTerrainHeight(wx, wz));
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.groundMat);
    mesh.position.set(startX, -0.5, 0);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    return { mesh, startX };
  }

  private recycleChunk(chunk: TerrainChunk): void {
    chunk.startX = this.spawnedUpTo;
    chunk.mesh.position.x = this.spawnedUpTo;
    this.spawnedUpTo += CHUNK_WIDTH;

    const pos = chunk.mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + chunk.startX;
      const wz = pos.getZ(i);
      pos.setY(i, getTerrainHeight(wx, wz));
    }
    chunk.mesh.geometry.computeVertexNormals();
  }

  update(worldOffset: number): void {
    while (this.spawnedUpTo < worldOffset + VIEW_AHEAD) {
      const chunk = this.createChunk(this.spawnedUpTo);
      this.chunks.push(chunk);
      this.spawnedUpTo += CHUNK_WIDTH;
    }

    for (const chunk of this.chunks) {
      if (chunk.startX + CHUNK_WIDTH < worldOffset - VIEW_BEHIND) {
        this.recycleChunk(chunk);
      }
    }
  }

  reset(): void {
    for (const chunk of this.chunks) {
      chunk.mesh.geometry.dispose();
      this.scene.remove(chunk.mesh);
    }
    this.chunks = [];
    this.spawnedUpTo = 0;
  }
}
