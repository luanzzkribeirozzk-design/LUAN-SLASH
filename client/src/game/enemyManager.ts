import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3 } from "@babylonjs/core/Maths/math";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Player } from "./player";
import type { ParticleManager } from "./particles";
import { addScore, setWave, getGameState, setGameState, getScene } from "./scene";

interface Enemy {
  mesh: Mesh;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  type: "soldier" | "archer" | "mage" | "boss";
  attackCooldown: number;
  attackRate: number;
  xpValue: number;
  alive: boolean;
  healthBar: Mesh | null;
}

export class EnemyManager {
  private enemies: Enemy[] = [];
  private scene: Scene;
  private player: Player;
  private particleManager: ParticleManager;
  private spawnTimer: number = 0;
  private spawnInterval: number = 2;
  private arenaSize: number = 35;
  private bossSpawned: boolean = false;

  constructor(scene: Scene, player: Player, particleManager: ParticleManager) {
    this.scene = scene;
    this.player = player;
    this.particleManager = particleManager;
  }

  public update(dt: number, playerPos: Vector3, wave: number): void {
    // Spawn enemies
    this.spawnTimer += dt;
    const maxEnemies = Math.min(5 + wave * 2, 30);

    if (this.spawnTimer >= this.spawnInterval && this.enemies.length < maxEnemies) {
      this.spawnTimer = 0;
      this.spawnEnemy(wave);
    }

    // Boss spawn every 5 waves
    if (wave % 5 === 0 && !this.bossSpawned && this.enemies.length < 3) {
      this.spawnBoss(wave);
      this.bossSpawned = true;
    }
    if (wave % 5 !== 0) {
      this.bossSpawned = false;
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.alive) continue;

      // Move toward player
      const dir = playerPos.subtract(enemy.mesh.position).normalize();
      const speed = enemy.type === "boss" ? enemy.speed * 0.6 : enemy.speed;
      enemy.mesh.position.addInPlace(dir.scale(speed * dt));

      // Face player
      const angle = Math.atan2(dir.x, dir.z);
      enemy.mesh.rotation.y = angle;

      // Attack cooldown
      enemy.attackCooldown -= dt;

      // Check collision with player
      const dist = Vector3.Distance(enemy.mesh.position, playerPos);
      const hitDist = enemy.type === "boss" ? 2.5 : 1.5;

      if (dist < hitDist && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = enemy.attackRate;
        this.player.takeDamage(enemy.damage);
      }

      // Update health bar
      if (enemy.healthBar && enemy.maxHealth > 0) {
        const hpRatio = enemy.health / enemy.maxHealth;
        enemy.healthBar.scaling.x = Math.max(0.01, hpRatio);
        const mat = enemy.healthBar.material as StandardMaterial;
        if (hpRatio > 0.5) {
          mat.diffuseColor = new Color3(0.2, 0.8, 0.2);
        } else if (hpRatio > 0.25) {
          mat.diffuseColor = new Color3(0.9, 0.8, 0.1);
        } else {
          mat.diffuseColor = new Color3(0.9, 0.1, 0.1);
        }
      }

      // Check if dead
      if (enemy.health <= 0) {
        enemy.alive = false;
        this.particleManager.spawnDeath(enemy.mesh.position.clone(), this.getEnemyColor(enemy.type));
        this.particleManager.spawnSoulOrb(enemy.mesh.position.clone());
        addScore(enemy.type === "boss" ? 500 : enemy.type === "mage" ? 30 : enemy.type === "archer" ? 20 : 10);
        this.player.addXP(enemy.xpValue);
        enemy.mesh.dispose();
        if (enemy.healthBar) enemy.healthBar.dispose();
        this.enemies.splice(i, 1);

        // Check level up
        if (this.player.shouldLevelUp()) {
          setGameState("levelup");
          const scene = getScene();
          if (scene) {
            const ui = (scene as any).__uiOverlay;
            if (ui) ui.showLevelUp();
          }
        }
      }
    }
  }

  private spawnEnemy(wave: number): void {
    const rand = Math.random();
    let type: "soldier" | "archer" | "mage";

    if (wave < 3) {
      type = "soldier";
    } else if (rand < 0.5) {
      type = "soldier";
    } else if (rand < 0.8) {
      type = "archer";
    } else {
      type = "mage";
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = this.arenaSize + Math.random() * 5;
    const pos = new Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

    const waveScale = 1 + (wave - 1) * 0.1;
    let health: number, damage: number, speed: number, xpValue: number;

    switch (type) {
      case "soldier":
        health = 30 * waveScale;
        damage = 8 + wave;
        speed = 3 + wave * 0.1;
        xpValue = 15;
        break;
      case "archer":
        health = 20 * waveScale;
        damage = 12 + wave;
        speed = 2.5 + wave * 0.1;
        xpValue = 20;
        break;
      case "mage":
        health = 40 * waveScale;
        damage = 15 + wave * 2;
        speed = 2 + wave * 0.05;
        xpValue = 30;
        break;
    }

    const mesh = this.createEnemyMesh(type, pos, waveScale);
    const healthBar = this.createHealthBar(mesh.position.clone());

    this.enemies.push({
      mesh,
      health,
      maxHealth: health,
      damage,
      speed,
      type,
      attackCooldown: 0,
      attackRate: type === "soldier" ? 0.8 : 1.2,
      xpValue,
      alive: true,
      healthBar,
    });
  }

  private spawnBoss(wave: number): void {
    const angle = Math.random() * Math.PI * 2;
    const pos = new Vector3(Math.cos(angle) * (this.arenaSize + 3), 0, Math.sin(angle) * (this.arenaSize + 3));
    const waveScale = 1 + (wave - 1) * 0.15;

    const health = 200 * waveScale;
    const damage = 20 + wave * 3;
    const speed = 1.8 + wave * 0.05;

    const mesh = this.createEnemyMesh("boss", pos, waveScale);
    const healthBar = this.createHealthBar(mesh.position.clone());
    healthBar.scaling.x = 2;

    this.enemies.push({
      mesh,
      health,
      maxHealth: health,
      damage,
      speed,
      type: "boss",
      attackCooldown: 0,
      attackRate: 1.5,
      xpValue: 100,
      alive: true,
      healthBar,
    });

    // Boss announcement
    setWave(Math.floor(wave / 5) * 5);
  }

  private createEnemyMesh(type: "soldier" | "archer" | "mage" | "boss", position: Vector3, scale: number): Mesh {
    const color = this.getEnemyColor(type);
    const mat = new StandardMaterial(`enemyMat_${type}_${Date.now()}`, this.scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(0.3);

    let mesh: Mesh;
    const size = type === "boss" ? 2 * scale : type === "mage" ? 1.3 * scale : 1.1 * scale;

    switch (type) {
      case "boss":
        mesh = MeshBuilder.CreateCylinder(`enemy_${type}_${Date.now()}`, {
          diameter: size,
          height: 1.5,
          tessellation: 6,
        }, this.scene);
        mesh.position = position;
        mesh.position.y = 0.75;
        break;
      case "mage":
        mesh = MeshBuilder.CreateCylinder(`enemy_${type}_${Date.now()}`, {
          diameter: size * 0.8,
          height: 1.2,
          tessellation: 6,
        }, this.scene);
        mesh.position = position;
        mesh.position.y = 0.6;
        break;
      case "archer":
        mesh = MeshBuilder.CreateBox(`enemy_${type}_${Date.now()}`, {
          width: size * 0.7,
          height: 1,
          depth: size * 0.7,
        }, this.scene);
        mesh.position = position;
        mesh.position.y = 0.5;
        break;
      default:
        mesh = MeshBuilder.CreateBox(`enemy_${type}_${Date.now()}`, {
          width: size * 0.8,
          height: 1,
          depth: size * 0.8,
        }, this.scene);
        mesh.position = position;
        mesh.position.y = 0.5;
    }

    mesh.material = mat;
    return mesh;
  }

  private createHealthBar(position: Vector3): Mesh {
    const bar = MeshBuilder.CreatePlane(`hpbar_${Date.now()}`, {
      width: 1.5,
      height: 0.15,
    }, this.scene);
    bar.position = new Vector3(position.x, 1.5, position.z);

    const mat = new StandardMaterial(`hpbarMat_${Date.now()}`, this.scene);
    mat.diffuseColor = new Color3(0.2, 0.8, 0.2);
    mat.emissiveColor = new Color3(0.1, 0.4, 0.1);
    bar.material = mat;

    return bar;
  }

  private getEnemyColor(type: string): Color3 {
    switch (type) {
      case "soldier": return new Color3(0.6, 0.1, 0.1);
      case "archer": return new Color3(0.5, 0.3, 0.1);
      case "mage": return new Color3(0.4, 0.1, 0.6);
      case "boss": return new Color3(0.8, 0.1, 0.2);
      default: return new Color3(0.5, 0.1, 0.1);
    }
  }

  public clear(): void {
    this.enemies.forEach(e => {
      e.mesh.dispose();
      if (e.healthBar) e.healthBar.dispose();
    });
    this.enemies = [];
    this.spawnTimer = 0;
    this.bossSpawned = false;
  }

  public damageEnemy(index: number, amount: number): void {
    if (index >= 0 && index < this.enemies.length && this.enemies[index].alive) {
      this.enemies[index].health -= amount;
    }
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  public checkHit(position: Vector3, radius: number): Enemy[] {
    const hit: Enemy[] = [];
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      const dist = Vector3.Distance(enemy.mesh.position, position);
      if (dist < radius) {
        hit.push(enemy);
      }
    });
    return hit;
  }
}
