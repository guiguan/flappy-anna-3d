import * as THREE from 'three';

/**
 * Parallax system: objects at different z-depths scroll at different rates.
 * Each layer has a speed multiplier relative to the gameplay scroll speed.
 */
export class ParallaxScroller {
  private layers: Map<number, THREE.Object3D[]> = new Map();

  addToLayer(depth: number, object: THREE.Object3D) {
    if (!this.layers.has(depth)) {
      this.layers.set(depth, []);
    }
    this.layers.get(depth)!.push(object);
  }

  update(worldOffset: number, speedMultipliers: Record<number, number>) {
    for (const [depth, objects] of this.layers) {
      const speed = speedMultipliers[depth] ?? 1.0;
      for (const obj of objects) {
        // Store initial X on the object's userData
        if (obj.userData.initialX === undefined) {
          obj.userData.initialX = obj.position.x;
        }
        obj.position.x = obj.userData.initialX + worldOffset * speed;
      }
    }
  }

  clear() {
    this.layers.clear();
  }
}
