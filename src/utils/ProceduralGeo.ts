import * as THREE from 'three';

// Low-poly tree: cone leaves + cylinder trunk
export function createTree(scale = 1.0): THREE.Group {
  const group = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.5, 6);
  const trunkMat = new THREE.MeshToonMaterial({ color: 0x6b4226 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.75;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const leafMat = new THREE.MeshToonMaterial({ color: 0x5baa3e });
  for (let i = 0; i < 3; i++) {
    const leafGeo = new THREE.ConeGeometry(0.7 - i * 0.15, 0.8, 8, 3);
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.y = 1.8 + i * 0.5;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    group.add(leaves);
  }

  group.scale.setScalar(scale);
  return group;
}

// Low-poly mountain: clean cone (no vertex jitter for proper alignment)
export function createMountain(height: number, width: number, color = 0x6b8e6b): THREE.Mesh {
  const geo = new THREE.ConeGeometry(width, height, 6, 2);
  const mat = new THREE.MeshToonMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Bush: cluster of small spheres
export function createBush(scale = 1.0): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: 0x5a8f3c });

  for (let i = 0; i < 4; i++) {
    const r = 0.25 + Math.random() * 0.3;
    const s = new THREE.SphereGeometry(r, 6, 5);
    const m = new THREE.Mesh(s, mat);
    m.position.set((Math.random() - 0.5) * 0.6, r * 0.6, (Math.random() - 0.5) * 0.6);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  group.scale.setScalar(scale);
  return group;
}

export function seededRandom(s: number): number {
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ── Procedural Ground Terrain ────────────────────────────────────

interface TerrainParams {
  amp1: number;
  amp2: number;
  amp3: number;
  amp4: number;
  phase1: number;
  phase2: number;
  flatness: number;
}

const terrainCache = new Map<number, TerrainParams>();

function hashSeed(seed: number): TerrainParams {
  const cached = terrainCache.get(seed);
  if (cached) return cached;

  let s = seed * 137;
  function hash(): number {
    return seededRandom(s += 1);
  }

  const params: TerrainParams = {
    amp1: 0.08 + hash() * 0.18,
    amp2: 0.05 + hash() * 0.12,
    amp3: 0.03 + hash() * 0.08,
    amp4: 0.02 + hash() * 0.05,
    phase1: hash() * Math.PI * 2,
    phase2: hash() * Math.PI * 2,
    flatness: hash(),
  };
  terrainCache.set(seed, params);
  return params;
}

export function getTerrainHeight(worldX: number, worldZ: number): number {
  const chunk = Math.floor(worldX / 30);
  const p = hashSeed(chunk);

  let h = Math.sin(worldX * 0.04 + p.phase1) * p.amp1
        + Math.sin(worldX * 0.10 + p.phase2) * p.amp2
        + Math.cos(worldX * 0.18) * p.amp3
        + Math.sin(worldX * 0.30) * p.amp4;

  if (p.flatness > 0.78) h *= 0.1;
  else if (p.flatness > 0.58) h *= 0.35;

  // Coastal slope: far Z ramps down toward water
  let coastalOffset = 0;
  if (worldZ < -5) {
    const t = Math.min((worldZ + 5) / -15, 1.0);
    coastalOffset = t * -2.5;
  }

  h += coastalOffset;

  // Fade undulation (not coastal slope) at Z extremes
  const zFade = 1.0 - Math.abs(worldZ) / 45;
  h = coastalOffset + (h - coastalOffset) * Math.max(0, zFade);

  return Math.max(-3, Math.min(5, h));
}

// Rock: randomized dodecahedron
export function createRock(scale = 1.0): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(0.4, 0);
  const positions = geo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const s = 0.7 + Math.random() * 0.6;
    positions.setX(i, positions.getX(i) * s);
    positions.setY(i, positions.getY(i) * s * 0.6);
    positions.setZ(i, positions.getZ(i) * s);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshToonMaterial({ color: 0x8b8682 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Ancient stone pillar for obstacles
export function createPillarPair(gapCenterY: number): THREE.Group {
  const group = new THREE.Group();
  const pillarGeo = new THREE.CylinderGeometry(0.6, 0.7, 5, 8);
  const pillarMat = new THREE.MeshToonMaterial({ color: 0x8b8682 });
  const capGeo = new THREE.BoxGeometry(1.4, 0.35, 1.4);
  const mossMat = new THREE.MeshToonMaterial({ color: 0x5a8f3c });

  function addMossPatch(parent: THREE.Group, y: number, angle: number) {
    const mossGeo = new THREE.SphereGeometry(0.18, 5, 4);
    const moss = new THREE.Mesh(mossGeo, mossMat);
    moss.position.set(Math.cos(angle) * 0.65, y, Math.sin(angle) * 0.65);
    moss.scale.set(0.8, 0.3, 0.5);
    parent.add(moss);
  }

  // Top pillar
  const topPillar = new THREE.Mesh(pillarGeo, pillarMat);
  topPillar.position.y = gapCenterY + 2.5;
  topPillar.castShadow = true;
  topPillar.receiveShadow = true;
  group.add(topPillar);
  const topGroup = new THREE.Group();
  topGroup.position.y = gapCenterY + 2.5;
  for (let i = 0; i < 3; i++) {
    addMossPatch(topGroup, (i - 1) * 1.5, i * 2.1);
  }
  group.add(topGroup);

  const topCap = new THREE.Mesh(capGeo, pillarMat);
  topCap.position.y = gapCenterY + 5.175;
  topCap.castShadow = true;
  topCap.receiveShadow = true;
  group.add(topCap);

  // Bottom pillar
  const bottomPillar = new THREE.Mesh(pillarGeo, pillarMat);
  bottomPillar.position.y = gapCenterY - 2.5;
  bottomPillar.castShadow = true;
  bottomPillar.receiveShadow = true;
  group.add(bottomPillar);
  const bottomGroup = new THREE.Group();
  bottomGroup.position.y = gapCenterY - 2.5;
  for (let i = 0; i < 3; i++) {
    addMossPatch(bottomGroup, (i - 1) * 1.5, i * 2.1 + 1);
  }
  group.add(bottomGroup);

  const bottomCap = new THREE.Mesh(capGeo, pillarMat);
  bottomCap.position.y = gapCenterY - 5.175;
  bottomCap.castShadow = true;
  bottomCap.receiveShadow = true;
  group.add(bottomCap);

  return group;
}
