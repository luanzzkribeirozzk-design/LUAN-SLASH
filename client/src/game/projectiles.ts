import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Player } from "./player";
import type { ParticleManager } from "./particles";

interface Projectile {
  mesh: Mesh;
  velocity: Vector3;
  damage: number;
  range: number;
  distanceTraveled: number;
  alive: boolean;
}

export class ProjectileManager {
  private projectiles: Projectile[] = [];
  private scene: Scene;
  private player: Player;
  private particleManager: ParticleManager;
  private maxProjectiles: number = 50;

  constructor(scene: Scene, player: Player, particleManager: ParticleManager) {
    this.scene = scene;
    this.player = player;
    this.particleManager = particleManager;
  }

  public fireSlash(position: Vector3, direction: Vector3, damage: number, range: number): void {
    // Create slash wave projectile
    const mesh = MeshBuilder.CreateBox(`slash_${Date.now()}`, {
      width: 0.3,
      height: 0.15,
      depth: 1.2,
    }, this.scene);

    mesh.position = position.clone();
    mesh.position.y = 0.4;

    const mat = new StandardMaterial(`slashMat_${Date.now()}`, this.scene);
    mat.diffuseColor = new Color3(0.3, 0.7, 1);
    mat.emissiveColor = new Color3(0.2, 0.5, 0.9);
    mat.alpha = 0.8;
    mesh.material = mat;

    const speed = 15;
    const velocity = direction.scale(speed);

    this.projectiles.push({
      mesh,
      velocity,
      damage,
      range,
      distanceTraveled: 0,
      alive: true,
    });

    // Also create a wide slash effect
    this.createWideSlash(position, direction, range);
  }

  private createWideSlash(position: Vector3, direction: Vector3, range: number): void {
    const arcMesh = MeshBuilder.CreateTorus(`arc_${Date.now()}`, {
      diameter: range * 2,
      thickness: 0.15,
      tessellation: 16,
    }, this.scene);

    arcMesh.position = position.clone();
    arcMesh.position.y = 0.3;

    const angle = Math.atan2(direction.x, direction.z);
    arcMesh.rotation.y = angle - Math.PI / 6;

    const mat = new StandardMaterial(`arcMat_${Date.now()}`, this.scene);
    mat.diffuseColor = new Color3(0.3, 0.6, 1);
    mat.emissiveColor = new Color3(0.2, 0.4, 0.8);
    mat.alpha = 0.5;
    arcMesh.material = mat;

    // Auto-dispose after animation
    setTimeout(() => {
      arcMesh.dispose();
    }, 200);
  }

  public update(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.alive) continue;

      // Move
      const move = proj.velocity.scale(dt);
      proj.mesh.position.addInPlace(move);
      proj.distanceTraveled += move.length();

      // Rotate to face direction
      const dir = proj.velocity.normalize();
      proj.mesh.rotation.y = Math.atan2(dir.x, dir.z);

      // Check if out of range
      if (proj.distanceTraveled > proj.range) {
        proj.alive = false;
        proj.mesh.dispose();
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      this.checkEnemyCollision(proj, i);
    }

    // Limit projectiles
    if (this.projectiles.length > this.maxProjectiles) {
      const excess = this.projectiles.splice(0, this.projectiles.length - this.maxProjectiles);
      excess.forEach(p => {
        if (p.mesh) p.mesh.dispose();
      });
    }
  }

  private checkEnemyCollision(proj: Projectile, projIndex: number): void {
    // Simple distance-based collision
    const enemies = (this as any).__enemyManager?.getEnemies() || [];
    enemies.forEach((enemy: any) => {
      if (!enemy.alive || !proj.alive) return;

      const dist = Vector3.Distance(proj.mesh.position, enemy.mesh.position);
      const hitRadius = enemy.type === "boss" ? 2 : 1;

      if (dist < hitRadius) {
        enemy.health -= proj.damage;
        proj.alive = false;

        // Hit particles
        this.particleManager.spawnSlash(
          enemy.mesh.position.clone(),
          Vector3.Zero(),
          new Color3(0.3, 0.7, 1)
        );

        proj.mesh.dispose();
        this.projectiles.splice(projIndex, 1);
      }
    });
  }

  public clear(): void {
    this.projectiles.forEach(p => p.mesh.dispose());
    this.projectiles = [];
  }
}
