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

// Round-canopy tree (oak-like): single large sphere + trunk
export function createTreeRound(scale = 1.0): THREE.Group {
  const group = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.5, 6);
  const trunkMat = new THREE.MeshToonMaterial({ color: 0x5c3a1e });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.75;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const canopyGeo = new THREE.SphereGeometry(0.8, 8, 6);
  const canopyMat = new THREE.MeshToonMaterial({ color: 0x3d7a2e });
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = 1.8;
  canopy.scale.set(1, 0.7, 1);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  group.add(canopy);

  group.scale.setScalar(scale);
  return group;
}

// Wide low bush (hedge-like): single flattened sphere
export function createBushWide(scale = 1.0): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: 0x3d6b2e });

  const bodyGeo = new THREE.SphereGeometry(0.5, 8, 5);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.2;
  body.scale.set(1, 0.4, 0.8 + Math.random() * 0.4);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 1-2 smaller accent spheres
  const accentCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < accentCount; i++) {
    const r = 0.2 + Math.random() * 0.25;
    const s = new THREE.SphereGeometry(r, 5, 4);
    const m = new THREE.Mesh(s, mat);
    m.position.set((Math.random() - 0.5) * 0.5, 0.35 + Math.random() * 0.2, (Math.random() - 0.5) * 0.4);
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
    amp1: 0.05 + hash() * 0.12,
    amp2: 0.03 + hash() * 0.08,
    amp3: 0.02 + hash() * 0.05,
    amp4: 0.01 + hash() * 0.03,
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

  // 2D undulating terrain with Z-dependence
  let h = Math.sin(worldX * 0.04 + worldZ * 0.05 + p.phase1) * p.amp1
        + Math.sin(worldX * 0.10 - worldZ * 0.06 + p.phase2) * p.amp2
        + Math.cos(worldX * 0.18 + worldZ * 0.04) * p.amp3
        + Math.sin(worldX * 0.30 + worldZ * 0.08) * p.amp4;

  // Localized hill blobs for contour-map effect
  let hs = chunk * 137 + 1000;
  const hillCount = 2 + Math.floor(seededRandom(hs++) * 2);
  for (let i = 0; i < hillCount; i++) {
    const hx = chunk * 30 + seededRandom(hs++) * 30;
    const hz = (seededRandom(hs++) - 0.5) * 30;
    const hr = 3 + seededRandom(hs++) * 8;
    const hh = 0.3 + seededRandom(hs++) * 1.0;
    const dx = worldX - hx;
    const dz = worldZ - hz;
    const dist = Math.sqrt(dx * dx + dz * dz) / hr;
    if (dist < 1.0) {
      const bump = (1 - dist) * (1 - dist) * (1 + 2 * dist);
      h += hh * bump;
    }
  }

  if (p.flatness > 0.78) h *= 0.1;
  else if (p.flatness > 0.58) h *= 0.35;

  // Coastal slope: far Z ramps down toward water
  let coastalOffset = 0;
  if (worldZ < -5) {
    const t = Math.min((worldZ + 5) / -15, 1.0);
    coastalOffset = t * -2.5;
  }

  h += coastalOffset;

  // Fade undulation at Z extremes
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

// ── Animals & Boats ─────────────────────────────────────────────

export function createSheep(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshToonMaterial({ color: 0xf8f8f8 });
  const legMat = new THREE.MeshToonMaterial({ color: 0x222222 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), bodyMat);
  body.scale.set(1, 0.7, 1.2);
  body.position.y = 0.18;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), bodyMat);
  head.position.set(0, 0.2, 0.22);
  head.castShadow = true;
  g.add(head);

  const legs: THREE.Object3D[] = [];
  const legPositions: [number, number, number][] = [
    [-0.08, 0.05, 0.12], [0.08, 0.05, 0.12],
    [-0.08, 0.05, -0.08], [0.08, 0.05, -0.08],
  ];
  for (const [lx, ly, lz] of legPositions) {
    const pivot = new THREE.Group();
    pivot.position.set(lx, ly, lz);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 5), legMat);
    leg.position.y = -0.075; // offset down so pivot is at hip
    leg.castShadow = true;
    pivot.add(leg);
    g.add(pivot);
    legs.push(pivot);
  }
  g.userData.legs = legs;
  return g;
}

export function createCow(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshToonMaterial({ color: 0xffffff });
  const spotMat = new THREE.MeshToonMaterial({ color: 0x111111 });
  const legMat = new THREE.MeshToonMaterial({ color: 0x222222 });

  // Body with per-face black spots using material groups
  const bodyGeo = new THREE.SphereGeometry(0.3, 6, 5);
  bodyGeo.clearGroups();
  const totalQuads = 6 * 5; // widthSegments * heightSegments
  const blackCount = 8 + Math.floor(Math.random() * 5); // 8-12
  const blackSet = new Set<number>();
  while (blackSet.size < blackCount) {
    blackSet.add(Math.floor(Math.random() * totalQuads));
  }
  for (let q = 0; q < totalQuads; q++) {
    bodyGeo.addGroup(q * 6, 6, blackSet.has(q) ? 1 : 0);
  }
  const body = new THREE.Mesh(bodyGeo, [bodyMat, spotMat]);
  body.scale.set(1, 0.7, 1.3);
  body.position.y = 0.25;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 5, 4), bodyMat);
  head.position.set(0, 0.28, 0.35);
  head.castShadow = true;
  g.add(head);

  const legs: THREE.Object3D[] = [];
  const cowLegPositions: [number, number, number][] = [
    [-0.1, 0.07, 0.18], [0.1, 0.07, 0.18],
    [-0.1, 0.07, -0.12], [0.1, 0.07, -0.12],
  ];
  for (const [lx, ly, lz] of cowLegPositions) {
    const pivot = new THREE.Group();
    pivot.position.set(lx, ly, lz);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 5), legMat);
    leg.position.y = -0.1;
    leg.castShadow = true;
    pivot.add(leg);
    g.add(pivot);
    legs.push(pivot);
  }
  g.userData.legs = legs;
  return g;
}

export function createBoat(): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshToonMaterial({ color: 0xf5f5f5 });
  const bottomMat = new THREE.MeshToonMaterial({ color: 0x6b2a2a });
  const deckMat = new THREE.MeshToonMaterial({ color: 0xffffff });
  const funnelMat = new THREE.MeshToonMaterial({ color: 0x3a3028 });
  const windowMat = new THREE.MeshToonMaterial({ color: 0x1a1a2e });

  // Upper hull (white)
  const hullUpper = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 3.5), hullMat);
  hullUpper.position.y = 0.39;
  hullUpper.castShadow = true;
  g.add(hullUpper);

  // Lower hull (dark red bottom)
  const hullLower = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.24, 3.5), bottomMat);
  hullLower.position.y = 0.12;
  hullLower.castShadow = true;
  g.add(hullLower);

  // Bow upper
  const bowUpper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.7), hullMat);
  bowUpper.position.set(0, 0.36, 2.0);
  bowUpper.rotation.x = -0.35;
  bowUpper.castShadow = true;
  g.add(bowUpper);

  // Bow lower
  const bowLower = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.7), bottomMat);
  bowLower.position.set(0, 0.10, 2.0);
  bowLower.rotation.x = -0.35;
  bowLower.castShadow = true;
  g.add(bowLower);

  // Stern upper
  const sternUpper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.5), hullMat);
  sternUpper.position.set(0, 0.36, -2.0);
  sternUpper.rotation.x = 0.35;
  sternUpper.castShadow = true;
  g.add(sternUpper);

  // Stern lower
  const sternLower = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.5), bottomMat);
  sternLower.position.set(0, 0.10, -2.0);
  sternLower.rotation.x = 0.35;
  sternLower.castShadow = true;
  g.add(sternLower);

  // Lower deck
  const lowerDeck = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.3, 2.8), deckMat);
  lowerDeck.position.y = 0.65;
  lowerDeck.castShadow = true;
  g.add(lowerDeck);

  // Upper deck
  const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 1.8), deckMat);
  upperDeck.position.set(0, 0.95, 0.3);
  upperDeck.castShadow = true;
  g.add(upperDeck);

  // Bridge
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.55), deckMat);
  bridge.position.set(0, 1.1, 0.9);
  bridge.castShadow = true;
  g.add(bridge);

  // Funnels
  for (const sz of [-0.2, 0.5]) {
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6), funnelMat);
    funnel.position.set(0, 1.2, sz);
    funnel.castShadow = true;
    g.add(funnel);
  }

  // Portholes
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), windowMat);
    p.position.set(0.46, 0.35, -1.2 + i * 0.5);
    g.add(p);
  }
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), windowMat);
    p.position.set(-0.46, 0.35, -1.2 + i * 0.5);
    g.add(p);
  }

  return g;
}
