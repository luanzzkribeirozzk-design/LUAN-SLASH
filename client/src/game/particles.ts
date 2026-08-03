import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  scaleSpeed: number;
}

export class ParticleManager {
  private particles: Particle[] = [];
  private scene: Scene;
  private maxParticles: number = 200;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public spawnSlash(position: Vector3, direction: Vector3, color: Color3): void {
    for (let i = 0; i < 8; i++) {
      const particle = MeshBuilder.CreateSphere(`particle_${Date.now()}_${i}`, {
        diameter: 0.15 + Math.random() * 0.1,
        segments: 4,
      }, this.scene);

      particle.position = position.clone();
      particle.position.y = 0.5;

      const mat = new StandardMaterial(`particleMat_${Date.now()}_${i}`, this.scene);
      mat.diffuseColor = color;
      mat.emissiveColor = color.scale(0.5);
      mat.alpha = 0.8;
      particle.material = mat;

      const spread = 0.3;
      const vel = new Vector3(
        direction.x * (2 + Math.random() * 2) + (Math.random() - 0.5) * spread,
        Math.random() * 2 + 1,
        direction.z * (2 + Math.random() * 2) + (Math.random() - 0.5) * spread
      );

      this.particles.push({
        mesh: particle,
        velocity: vel,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        gravity: 5,
        scaleSpeed: 2,
      });
    }
  }

  public spawnDeath(position: Vector3, color: Color3): void {
    for (let i = 0; i < 12; i++) {
      const particle = MeshBuilder.CreateBox(`deathParticle_${Date.now()}_${i}`, {
        width: 0.2,
        height: 0.2,
        depth: 0.2,
      }, this.scene);

      particle.position = position.clone();
      particle.position.y = 0.3;

      const mat = new StandardMaterial(`deathMat_${Date.now()}_${i}`, this.scene);
      mat.diffuseColor = color;
      mat.emissiveColor = color.scale(0.4);
      mat.alpha = 0.9;
      particle.material = mat;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const vel = new Vector3(
        Math.cos(angle) * speed,
        Math.random() * 3 + 1,
        Math.sin(angle) * speed
      );

      this.particles.push({
        mesh: particle,
        velocity: vel,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        gravity: 6,
        scaleSpeed: 3,
      });
    }
  }

  public spawnSoulOrb(position: Vector3): void {
    const orb = MeshBuilder.CreateSphere(`soulOrb_${Date.now()}`, {
      diameter: 0.3,
      segments: 6,
    }, this.scene);

    orb.position = position.clone();
    orb.position.y = 0.3;

    const mat = new StandardMaterial(`soulMat_${Date.now()}`, this.scene);
    mat.diffuseColor = new Color3(0.3, 0.5, 1);
    mat.emissiveColor = new Color3(0.2, 0.4, 0.9);
    orb.material = mat;

    this.particles.push({
      mesh: orb,
      velocity: new Vector3(0, 0, 0),
      life: 3,
      maxLife: 3,
      gravity: 0,
      scaleSpeed: 0,
    });
  }

  public spawnDash(position: Vector3): void {
    for (let i = 0; i < 5; i++) {
      const particle = MeshBuilder.CreateSphere(`dashP_${Date.now()}_${i}`, {
        diameter: 0.1,
        segments: 4,
      }, this.scene);

      particle.position = position.clone();
      particle.position.y = 0.4;

      const mat = new StandardMaterial(`dashMat_${Date.now()}_${i}`, this.scene);
      mat.diffuseColor = new Color3(0.2, 0.7, 1);
      mat.emissiveColor = new Color3(0.1, 0.5, 0.9);
      mat.alpha = 0.6;
      particle.material = mat;

      this.particles.push({
        mesh: particle,
        velocity: new Vector3((Math.random() - 0.5) * 2, Math.random() * 1, (Math.random() - 0.5) * 2),
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        gravity: 0,
        scaleSpeed: 4,
      });
    }
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        p.mesh.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.velocity.y -= p.gravity * dt;
      p.mesh.position.addInPlace(p.velocity.scale(dt));

      // Update scale (fade out)
      const lifeRatio = p.life / p.maxLife;
      const scale = Math.max(0.01, lifeRatio);
      p.mesh.scaling.setAll(scale);

      // Update alpha
      if (p.mesh.material) {
        const mat = p.mesh.material as StandardMaterial;
        mat.alpha = lifeRatio * 0.8;
      }
    }

    // Limit particles
    if (this.particles.length > this.maxParticles) {
      const excess = this.particles.splice(0, this.particles.length - this.maxParticles);
      excess.forEach(p => p.mesh.dispose());
    }
  }

  public clear(): void {
    this.particles.forEach(p => p.mesh.dispose());
    this.particles = [];
  }
}
