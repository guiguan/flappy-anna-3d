import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  active: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, poolSize = 100) {
    const geo = new THREE.SphereGeometry(0.08, 4, 3);
    for (let i = 0; i < poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  private getMesh(): THREE.Mesh | null {
    return this.pool.find(m => !m.visible) || null;
  }

  emit(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: number,
    lifetime: number,
    size = 0.08,
  ) {
    const mesh = this.getMesh();
    if (!mesh) return;

    mesh.position.copy(position);
    mesh.visible = true;
    mesh.scale.setScalar(size);
    (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 1;

    this.particles.push({
      mesh,
      velocity: velocity.clone(),
      lifetime,
      maxLifetime: lifetime,
      active: true,
    });
  }

  emitBurst(
    position: THREE.Vector3,
    count: number,
    color: number,
    lifetime: number,
    speed = 1.5,
    size = 0.06,
  ) {
    for (let i = 0; i < count; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed * 2,
        (Math.random() - 0.5) * speed * 2,
        (Math.random() - 0.5) * speed * 2,
      );
      this.emit(position.clone(), vel, color, lifetime * (0.5 + Math.random() * 0.5), size);
    }
  }

  emitFirefly(position: THREE.Vector3) {
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.3,
    );
    this.emit(position, vel, 0xffd700, 3 + Math.random() * 4, 0.05);
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.lifetime -= dt;
      if (p.lifetime <= 0) {
        p.mesh.visible = false;
        p.active = false;
        this.particles.splice(i, 1);
        continue;
      }

      // Fade out
      const progress = p.lifetime / p.maxLifetime;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = progress;
      p.mesh.scale.setScalar(0.08 * progress);

      // Apply velocity
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt * 60));
      p.velocity.y += 0.01 * dt * 60; // gentle upward drift
    }
  }

  clear() {
    for (const p of this.particles) {
      p.mesh.visible = false;
      p.active = false;
    }
    this.particles = [];
  }
}
