import * as THREE from 'three';

export interface AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export function getAABB(object: THREE.Object3D): AABB {
  const box = new THREE.Box3().setFromObject(object);
  return {
    min: box.min.clone(),
    max: box.max.clone(),
  };
}

export function aabbIntersects(a: AABB, b: AABB): boolean {
  return (
    a.min.x < b.max.x && a.max.x > b.min.x &&
    a.min.y < b.max.y && a.max.y > b.min.y &&
    a.min.z < b.max.z && a.max.z > b.min.z
  );
}

export class CollisionSystem {
  checkPlayerCollision(
    playerGroup: THREE.Object3D,
    obstacles: THREE.Object3D[],
    playerY: number,
    ceilingY: number,
    groundY: number,
  ): boolean {
    if (playerY > ceilingY || playerY < groundY) return true;

    const playerBox = new THREE.Box3().setFromObject(playerGroup);
    playerBox.expandByScalar(-0.1);

    for (const obs of obstacles) {
      if (!obs.visible) continue;
      // Check each child mesh individually — using setFromObject on the
      // whole group would create a union AABB that spans the gap.
      for (const child of obs.children) {
        if (!(child instanceof THREE.Mesh)) continue;
        const childBox = new THREE.Box3().setFromObject(child);
        childBox.expandByScalar(-0.1);
        if (playerBox.intersectsBox(childBox)) return true;
      }
    }

    return false;
  }
}
