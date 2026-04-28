import * as THREE from 'three';

const PILLAR_HALF_HEIGHT = 2.5;
const GAP = 5.0;

export class ObstacleSpawner {
  private pool: THREE.Group[] = [];
  private active: THREE.Group[] = [];
  private spawnCounter = 0;

  constructor(scene: THREE.Scene, poolSize = 22) {
    for (let i = 0; i < poolSize; i++) {
      const pillar = this.buildPillar();
      pillar.visible = false;
      scene.add(pillar);
      this.pool.push(pillar);
    }
  }

  private buildPillar(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshToonMaterial({ color: 0xc8b896 });
    const bandMat = new THREE.MeshToonMaterial({ color: 0xa89878 });
    const capMat = new THREE.MeshToonMaterial({ color: 0xd4c8a8 });

    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.62, PILLAR_HALF_HEIGHT * 2, 8);
    const ringGeo = new THREE.TorusGeometry(0.58, 0.08, 6, 8);
    const capGeo1 = new THREE.BoxGeometry(1.5, 0.3, 1.5);
    const capGeo2 = new THREE.BoxGeometry(1.0, 0.25, 1.0);

    function addNamed(name: string, geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
      const m = new THREE.Mesh(geo, mat);
      m.name = name;
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
      return m;
    }

    addNamed('topBody', bodyGeo, bodyMat);
    addNamed('topRing1', ringGeo, bandMat).rotation.x = Math.PI / 2;
    addNamed('topRing2', ringGeo, bandMat).rotation.x = Math.PI / 2;
    addNamed('topCap1', capGeo1, capMat);
    addNamed('topCap2', capGeo2, capMat);

    addNamed('bottomBody', bodyGeo, bodyMat);
    addNamed('bottomRing1', ringGeo, bandMat).rotation.x = Math.PI / 2;
    addNamed('bottomRing2', ringGeo, bandMat).rotation.x = Math.PI / 2;
    addNamed('bottomCap1', capGeo1, capMat);
    addNamed('bottomCap2', capGeo2, capMat);

    return group;
  }

  private positionPillar(group: THREE.Group, x: number, gapCenterY: number) {
    group.position.set(x, 0, 0);
    group.userData.gapCenterY = gapCenterY;

    const halfGap = GAP / 2;
    const halfH = PILLAR_HALF_HEIGHT;
    const topY = gapCenterY + halfGap + halfH;
    const bottomY = gapCenterY - halfGap - halfH;

    const setY = (name: string, y: number) => {
      group.getObjectByName(name)!.position.set(0, y, 0);
    };

    // Top half
    setY('topBody', topY);
    setY('topRing1', topY + halfH * 0.6);
    setY('topRing2', topY + halfH * 0.2);
    setY('topCap1', topY + halfH + 0.15);
    setY('topCap2', topY + halfH + 0.425);

    // Bottom half
    setY('bottomBody', bottomY);
    setY('bottomRing1', bottomY - halfH * 0.6);
    setY('bottomRing2', bottomY - halfH * 0.2);
    setY('bottomCap1', bottomY - halfH - 0.15);
    setY('bottomCap2', bottomY - halfH - 0.425);
  }

  update(worldOffset: number, obstacleStartX: number, obstacleInterval: number): THREE.Group[] {
    // Spawn new obstacles ahead of camera
    while (true) {
      const spawnX = obstacleStartX + this.spawnCounter * obstacleInterval;
      if (spawnX - worldOffset > 80) break; // Spawn deep in fog to avoid pop-in

      const pillar = this.pool.pop();
      if (!pillar) break;

      const gapY = 2 + Math.random() * 6; // 2 to 8 (matching original rand.Intn(6)+2)
      this.positionPillar(pillar, spawnX, gapY);
      pillar.visible = true;
      this.active.push(pillar);
      this.spawnCounter++;
    }

    // Recycle obstacles far behind camera
    const removeThreshold = worldOffset - 80;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (p.position.x < removeThreshold) {
        p.visible = false;
        this.active.splice(i, 1);
        this.pool.push(p);
      }
    }

    return this.active;
  }

  getActiveObstacles(): THREE.Group[] {
    return this.active;
  }

  reset() {
    for (const p of this.active) {
      p.visible = false;
      this.pool.push(p);
    }
    this.active = [];
    this.spawnCounter = 0;
  }
}
