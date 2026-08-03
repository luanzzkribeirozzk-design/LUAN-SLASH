import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { ProjectileManager } from "./projectiles";
import type { ParticleManager } from "./particles";

export class Player {
  public position: Vector3 = Vector3.Zero();
  public health: number = 100;
  public maxHealth: number = 100;
  public level: number = 1;
  public xp: number = 0;
  public xpToNext: number = 100;
  public damage: number = 25;
  public speed: number = 6;
  public attackCooldown: number = 0;
  public attackRate: number = 0.35;
  public dashCooldown: number = 0;
  public dashRate: number = 1.5;
  public isDashing: boolean = false;
  public invulnerable: number = 0;
  public slashRange: number = 3;
  public alive: boolean = true;

  private meshes: Mesh[] = [];
  private scene: Scene;
  private bodyMesh: Mesh;
  private swordMesh: Mesh;
  private glowMaterial: StandardMaterial;
  private trail: Vector3[] = [];
  private trailTimer: number = 0;

  constructor(scene: Scene) {
    this.scene = scene;

    // Player body
    this.bodyMesh = MeshBuilder.CreateCylinder("playerBody", {
      diameter: 1.2,
      height: 0.8,
      tessellation: 8,
    }, scene);
    this.bodyMesh.position = this.position.clone();
    this.bodyMesh.position.y = 0.4;

    this.glowMaterial = new StandardMaterial("playerGlow", scene);
    this.glowMaterial.diffuseColor = new Color3(0.2, 0.6, 1);
    this.glowMaterial.emissiveColor = new Color3(0.1, 0.4, 0.8);
    this.glowMaterial.specularColor = new Color3(0.3, 0.7, 1);
    this.bodyMesh.material = this.glowMaterial;

    // Sword
    this.swordMesh = MeshBuilder.CreateBox("sword", {
      width: 0.15,
      height: 0.1,
      depth: 2.5,
    }, scene);
    this.swordMesh.position = new Vector3(0.8, 0.6, 0);

    const swordMat = new StandardMaterial("swordMat", scene);
    swordMat.diffuseColor = new Color3(0.8, 0.8, 0.9);
    swordMat.emissiveColor = new Color3(0.3, 0.6, 1);
    this.swordMesh.material = swordMat;

    this.meshes.push(this.bodyMesh, this.swordMesh);
  }

  public update(moveDir: Vector3, dt: number): void {
    if (!this.alive) return;

    // Cooldowns
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);

    // Movement
    const speed = this.isDashing ? this.speed * 2.5 : this.speed;
    const newPos = this.position.add(moveDir.scale(speed * dt));

    // Arena bounds
    const arenaLimit = 37;
    newPos.x = Math.max(-arenaLimit, Math.min(arenaLimit, newPos.x));
    newPos.z = Math.max(-arenaLimit, Math.min(arenaLimit, newPos.z));

    this.position.copyFrom(newPos);
    this.bodyMesh.position.copyFrom(this.position);
    this.bodyMesh.position.y = 0.4;
    this.swordMesh.position.copyFrom(this.position);
    this.swordMesh.position.y = 0.6;

    // Trail effect
    this.trailTimer += dt;
    if (this.trailTimer > 0.05 && moveDir.length() > 0.1) {
      this.trail.push(this.position.clone());
      if (this.trail.length > 15) this.trail.shift();
      this.trailTimer = 0;
    }

    // Idle animation
    const time = this.scene.getEngine().frameId * 0.016;
    this.bodyMesh.scaling.y = 1 + Math.sin(time * 3) * 0.02;
  }

  public attack(targetPos: Vector3, scene: Scene, projectileManager: ProjectileManager, particleManager: ParticleManager): void {
    if (this.attackCooldown > 0 || !this.alive) return;
    this.attackCooldown = this.attackRate;

    const direction = targetPos.subtract(this.position).normalize();

    // Sword swing animation
    this.animateSword(direction);

    // Launch projectile (slash wave)
    projectileManager.fireSlash(this.position.clone(), direction, this.damage, this.slashRange);

    // Particle effect
    const slashPos = this.position.add(direction.scale(1.5));
    particleManager.spawnSlash(slashPos, direction, new Color3(0.3, 0.7, 1));

    // Screen shake via camera
    const cam = scene.cameras[0];
    if (cam) {
      cam.position.addInPlace(new Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.3
      ));
    }
  }

  private animateSword(direction: Vector3): void {
    const angle = Math.atan2(direction.x, direction.z);
    this.swordMesh.rotation.y = angle;

    // Quick swing animation
    const startTime = Date.now();
    const duration = 200;
    const updateAnim = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        this.swordMesh.rotation.y = angle + Math.sin(progress * Math.PI) * 0.5;
        requestAnimationFrame(updateAnim);
      } else {
        this.swordMesh.rotation.y = angle;
      }
    };
    updateAnim();
  }

  public dash(direction: Vector3): void {
    if (this.dashCooldown > 0 || !this.alive) return;
    this.dashCooldown = this.dashRate;
    this.isDashing = true;
    this.invulnerable = 0.3;

    setTimeout(() => {
      this.isDashing = false;
    }, 300);
  }

  public takeDamage(amount: number): void {
    if (this.invulnerable > 0 || !this.alive || this.isDashing) return;
    this.health -= amount;
    this.invulnerable = 0.5;

    // Flash red
    this.glowMaterial.emissiveColor = new Color3(0.8, 0.1, 0.1);
    setTimeout(() => {
      this.glowMaterial.emissiveColor = new Color3(0.1, 0.4, 0.8);
    }, 200);

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.bodyMesh.material = new StandardMaterial("dead", this.scene);
      (this.bodyMesh.material as StandardMaterial).diffuseColor = new Color3(0.3, 0.05, 0.05);
    }
  }

  public addXP(amount: number): void {
    this.xp += amount;
  }

  public shouldLevelUp(): boolean {
    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.xpToNext = Math.floor(this.xpToNext * 1.5);
      this.level++;
      this.health = Math.min(this.health + 20, this.maxHealth);
      return true;
    }
    return false;
  }

  public applyUpgrade(type: string): void {
    switch (type) {
      case "damage":
        this.damage += 10;
        break;
      case "speed":
        this.speed += 0.8;
        break;
      case "health":
        this.maxHealth += 25;
        this.health += 25;
        break;
      case "attackSpeed":
        this.attackRate *= 0.85;
        break;
      case "range":
        this.slashRange += 0.8;
        break;
      case "dashSpeed":
        this.dashRate *= 0.85;
        break;
    }
  }

  public isDead(): boolean {
    return !this.alive;
  }

  public reset(): void {
    this.position = Vector3.Zero();
    this.health = 100;
    this.maxHealth = 100;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;
    this.damage = 25;
    this.speed = 6;
    this.attackCooldown = 0;
    this.attackRate = 0.35;
    this.dashCooldown = 0;
    this.dashRate = 1.5;
    this.isDashing = false;
    this.invulnerable = 0;
    this.slashRange = 3;
    this.alive = true;

    this.bodyMesh.material = this.glowMaterial;
    this.bodyMesh.position = Vector3.Zero();
    this.bodyMesh.position.y = 0.4;
    this.swordMesh.position = new Vector3(0.8, 0.6, 0);
    this.trail = [];
  }

  public getTrail(): Vector3[] {
    return [...this.trail];
  }
}
