// VOID RACER — 3D Endless Racing Game with HD Textures
// Babylon.js scene: cyberpunk night racing, procedural obstacles, dynamic camera

import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Color4, Vector2 } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Engine } from "@babylonjs/core/Engines/engine";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { assets } from "./assets";

export type GameHandle = {
  scene: Scene;
  dispose: () => void;
};

// Game state
type GameState = "menu" | "playing" | "gameover";
let _state: GameState = "menu";
let _score = 0;
let _highScore = parseInt(localStorage.getItem("voidracer_highscore") || "0");
let _speed = 30;
let _lane: number = 0; // -1, 0, 1
let _targetX: number = 0;
let _playerMesh: Mesh | null = null;
let _obstacles: Mesh[] = [];
let _roadSegments: Mesh[] = [];
let _buildings: Mesh[] = [];
let _particles: { mesh: Mesh; life: number }[] = [];
let _uiDiv: HTMLDivElement | null = null;
let _onKeyDown: ((ev: KeyboardEvent) => void) | null = null;
let _onPointerDown: ((ev: PointerEvent) => void) | null = null;
let _touchStartX: number = 0;
let _engineRef: Engine | null = null;

export function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  return new Promise((resolve) => {
    _engineRef = engine;
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.02, 0.02, 0.05, 1);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.008;
    scene.fogColor = new Color3(0.02, 0.02, 0.08);

    // === CAMERA ===
    const camera = new UniversalCamera("camera", new Vector3(0, 3.5, -6), scene);
    camera.fov = 1.1;
    camera.minZ = 0.1;
    camera.maxZ = 200;

    // === GLOW LAYER ===
    const glow = new GlowLayer("glow", scene);
    glow.intensity = 1.2;

    // === LIGHTS ===
    const hemiLight = new DirectionalLight("hemi", new Vector3(0, -1, 0.5), scene);
    hemiLight.intensity = 0.3;
    hemiLight.diffuse = new Color3(0.4, 0.3, 0.8);

    // Player headlight
    const headlight = new PointLight("headlight", new Vector3(0, 1, -5), scene);
    headlight.intensity = 2;
    headlight.diffuse = new Color3(1, 0.95, 0.9);
    headlight.range = 25;

    // === SKYBOX ===
    createSkybox(scene);

    // === ROAD ===
    createRoad(scene);

    // === BUILDINGS ===
    createBuildings(scene);

    // === PLAYER CAR ===
    _playerMesh = createCar(scene);
    _playerMesh.position = new Vector3(0, 0.3, -3);

    // === UI ===
    _uiDiv = createUI();

    // === INPUT ===
    setupInput(canvas);

    // === GAME LOOP ===
    let roadOffset = 0;
    let obstacleTimer = 0;

    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000;

      if (_state === "playing") {
        // Increase speed over time
        _speed += dt * 0.3;
        _speed = Math.min(_speed, 80);

        // Move road texture
        roadOffset += _speed * dt;
        updateRoad(roadOffset);

        // Player movement (smooth lane change)
        _targetX = _lane * 3.5;
        const currentX = _playerMesh!.position.x;
        _playerMesh!.position.x += (_targetX - currentX) * 8 * dt;

        // Camera follows player slightly
        camera.position.x += (_playerMesh!.position.x * 0.3 - camera.position.x) * 3 * dt;
        camera.position.z = _playerMesh!.position.z - 6;
        camera.position.y = 3.5;
        headlight.position.copyFrom(_playerMesh!.position);
        headlight.position.y += 0.5;

        // Score
        _score += Math.floor(_speed * dt * 10);
        updateScoreUI();

        // Spawn obstacles
        obstacleTimer += dt;
        const spawnRate = Math.max(0.4, 1.5 - _speed * 0.01);
        if (obstacleTimer >= spawnRate) {
          obstacleTimer = 0;
          spawnObstacle(scene);
        }

        // Move obstacles toward player
        updateObstacles(dt);

        // Check collisions
        checkCollisions();

        // Particles (exhaust)
        if (Math.random() < 0.3) {
          spawnExhaust(scene, _playerMesh!.position);
        }
        updateParticles(dt);
      }
    });

    // Show menu
    showMenuUI();

    resolve({
      scene,
      dispose: () => {
        if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
        if (_onPointerDown) canvas.removeEventListener("pointerdown", _onPointerDown);
        scene.dispose();
      },
    });
  });
}

function createSkybox(scene: Scene): void {
  // Dark atmosphere with colored fog instead of skybox
  // The fog creates the depth effect
}

function createRoad(scene: Scene): void {
  const roadMat = new StandardMaterial("roadMat", scene);
  roadMat.diffuseColor = new Color3(0.08, 0.08, 0.12);
  roadMat.specularColor = new Color3(0.1, 0.1, 0.15);
  roadMat.emissiveColor = new Color3(0.02, 0.02, 0.04);

  // Try loading texture
  try {
    const roadTex = new Texture(assets.road, scene);
    roadTex.uScale = 1;
    roadTex.vScale = 20;
    roadTex.uAng = 0;
    roadTex.vAng = 0;
    roadMat.diffuseTexture = roadTex;
  } catch (e) {
    // Fallback to solid color
  }

  // Main road
  const road = MeshBuilder.CreateGround("road", {
    width: 12,
    height: 200,
    subdivisions: 1,
  }, scene);
  road.position = new Vector3(0, 0, 80);
  road.receiveShadows = true;
  road.material = roadMat;
  _roadSegments.push(road);

  // Side barriers with neon
  const barrierMat = new StandardMaterial("barrierMat", scene);
  barrierMat.diffuseColor = new Color3(0.15, 0.05, 0.25);
  barrierMat.emissiveColor = new Color3(0.4, 0.1, 0.6);

  // Left barrier
  const leftBarrier = MeshBuilder.CreateBox("leftBarrier", {
    width: 0.5,
    height: 1.5,
    depth: 200,
  }, scene);
  leftBarrier.position = new Vector3(-7, 0.75, 80);
  leftBarrier.material = barrierMat;

  // Right barrier
  const rightBarrier = MeshBuilder.CreateBox("rightBarrier", {
    width: 0.5,
    height: 1.5,
    depth: 200,
  }, scene);
  rightBarrier.position = new Vector3(7, 0.75, 80);
  rightBarrier.material = barrierMat;

  // Lane markings
  const laneMat = new StandardMaterial("laneMat", scene);
  laneMat.diffuseColor = new Color3(0.8, 0.8, 0.9);
  laneMat.emissiveColor = new Color3(0.3, 0.3, 0.4);
  laneMat.alpha = 0.6;

  for (let i = -40; i <= 160; i += 8) {
    // Left lane line
    const lineL = MeshBuilder.CreateBox(`laneL_${i}`, { width: 0.15, height: 0.05, depth: 4 }, scene);
    lineL.position = new Vector3(-2, 0.03, i);
    lineL.material = laneMat;

    // Right lane line
    const lineR = MeshBuilder.CreateBox(`laneR_${i}`, { width: 0.15, height: 0.05, depth: 4 }, scene);
    lineR.position = new Vector3(2, 0.03, i);
    lineR.material = laneMat;
  }

  // Center line (solid)
  const centerLine = MeshBuilder.CreateBox("centerLine", { width: 0.1, height: 0.05, depth: 200 }, scene);
  centerLine.position = new Vector3(0, 0.03, 80);
  const centerMat = new StandardMaterial("centerMat", scene);
  centerMat.diffuseColor = new Color3(0.9, 0.9, 0.1);
  centerMat.emissiveColor = new Color3(0.4, 0.4, 0.05);
  centerLine.material = centerMat;
}

function updateRoad(offset: number): void {
  _roadSegments.forEach(road => {
    if (road.material) {
      const mat = road.material as StandardMaterial;
      if (mat.diffuseTexture) {
        if (mat.diffuseTexture) {
          (mat.diffuseTexture as any).vOffset = (offset * 0.05) % 1;
        }
      }
    }
  });
}

function createBuildings(scene: Scene): void {
  const buildingMat = new StandardMaterial("bldgMat", scene);
  buildingMat.diffuseColor = new Color3(0.05, 0.05, 0.1);
  buildingMat.emissiveColor = new Color3(0.05, 0.02, 0.1);

  // Try texture
  try {
    const bldgTex = new Texture(assets.building, scene);
    buildingMat.diffuseTexture = bldgTex;
  } catch (e) {}

  // Left side buildings
  for (let i = -20; i <= 180; i += 12) {
    const height = 8 + Math.random() * 15;
    const width = 4 + Math.random() * 6;

    const bldg = MeshBuilder.CreateBox(`bldg_L_${i}`, {
      width,
      height,
      depth: 8 + Math.random() * 6,
    }, scene);
    bldg.position = new Vector3(-14 - Math.random() * 8, height / 2, i);
    bldg.material = buildingMat;
    _buildings.push(bldg);

    // Neon sign on some buildings
    if (Math.random() > 0.5) {
      const neonMat = new StandardMaterial(`neonMat_${i}`, scene);
      neonMat.emissiveColor = Math.random() > 0.5 ? new Color3(0.6, 0.1, 0.9) : new Color3(0.1, 0.6, 0.9);

      const neon = MeshBuilder.CreatePlane(`neon_${i}`, { width: 3, height: 1 }, scene);
      neon.position = new Vector3(bldg.position.x + width / 2 + 0.1, height * 0.7, i);
      neon.material = neonMat;
    }
  }

  // Right side buildings
  for (let i = -20; i <= 180; i += 14) {
    const height = 6 + Math.random() * 20;
    const width = 5 + Math.random() * 7;

    const bldg = MeshBuilder.CreateBox(`bldg_R_${i}`, {
      width,
      height,
      depth: 8 + Math.random() * 8,
    }, scene);
    bldg.position = new Vector3(14 + Math.random() * 10, height / 2, i);
    bldg.material = buildingMat;
    _buildings.push(bldg);

    if (Math.random() > 0.4) {
      const neonMat = new StandardMaterial(`neonMat_R_${i}`, scene);
      neonMat.emissiveColor = Math.random() > 0.5 ? new Color3(1, 0.2, 0.1) : new Color3(0, 0.8, 0.6);

      const neon = MeshBuilder.CreatePlane(`neon_R_${i}`, { width: 4, height: 1.5 }, scene);
      neon.position = new Vector3(bldg.position.x - width / 2 - 0.1, height * 0.6, i);
      neon.rotation.y = Math.PI / 2;
      neon.material = neonMat;
    }
  }
}

function createCar(scene: Scene): Mesh {
  const car = new Mesh("playerCar", scene);

  // Car body
  const bodyMat = new StandardMaterial("carBodyMat", scene);
  bodyMat.diffuseColor = new Color3(0.1, 0.1, 0.2);
  bodyMat.specularColor = new Color3(0.8, 0.8, 1);
  bodyMat.emissiveColor = new Color3(0.05, 0.05, 0.15);

  const body = MeshBuilder.CreateBox("carBody", {
    width: 1.8,
    height: 0.6,
    depth: 3.5,
  }, scene);
  body.material = bodyMat;
  body.parent = car;
  body.position.y = 0.3;

  // Car top/cabin
  const cabin = MeshBuilder.CreateBox("carCabin", {
    width: 1.4,
    height: 0.5,
    depth: 1.8,
  }, scene);
  cabin.material = bodyMat;
  cabin.parent = car;
  cabin.position.y = 0.7;
  cabin.position.z = 0.2;

  // Windshield (dark glass)
  const glassMat = new StandardMaterial("glassMat", scene);
  glassMat.diffuseColor = new Color3(0.1, 0.15, 0.3);
  glassMat.alpha = 0.7;
  glassMat.specularColor = new Color3(1, 1, 1);

  const windshield = MeshBuilder.CreateBox("windshield", {
    width: 1.35,
    height: 0.45,
    depth: 0.05,
  }, scene);
  windshield.material = glassMat;
  windshield.parent = car;
  windshield.position = new Vector3(0, 0.8, 1.05);

  // Headlights
  const headlightMat = new StandardMaterial("headlightMat", scene);
  headlightMat.emissiveColor = new Color3(1, 0.95, 0.8);
  headlightMat.diffuseColor = new Color3(0.3, 0.3, 0.3);

  const hlL = MeshBuilder.CreateBox("hlL", { width: 0.3, height: 0.2, depth: 0.1 }, scene);
  hlL.material = headlightMat;
  hlL.parent = car;
  hlL.position = new Vector3(-0.6, 0.35, 1.75);

  const hlR = MeshBuilder.CreateBox("hlR", { width: 0.3, height: 0.2, depth: 0.1 }, scene);
  hlR.material = headlightMat;
  hlR.parent = car;
  hlR.position = new Vector3(0.6, 0.35, 1.75);

  // Tail lights (red neon)
  const tailMat = new StandardMaterial("tailMat", scene);
  tailMat.emissiveColor = new Color3(1, 0.1, 0.1);
  tailMat.diffuseColor = new Color3(0.3, 0, 0);

  const tlL = MeshBuilder.CreateBox("tlL", { width: 0.4, height: 0.15, depth: 0.05 }, scene);
  tlL.material = tailMat;
  tlL.parent = car;
  tlL.position = new Vector3(-0.6, 0.35, -1.75);

  const tlR = MeshBuilder.CreateBox("tlR", { width: 0.4, height: 0.15, depth: 0.05 }, scene);
  tlR.material = tailMat;
  tlR.parent = car;
  tlR.position = new Vector3(0.6, 0.35, -1.75);

  // Underglow (cyan neon underneath)
  const underglowMat = new StandardMaterial("underglowMat", scene);
  underglowMat.emissiveColor = new Color3(0.2, 0.6, 1);
  underglowMat.alpha = 0.5;

  const underglow = MeshBuilder.CreatePlane("underglow", { width: 2, height: 3.5 }, scene);
  underglow.material = underglowMat;
  underglow.parent = car;
  underglow.position.y = -0.01;
  underglow.rotation.x = Math.PI / 2;

  return car;
}

function spawnObstacle(scene: Scene): void {
  const lanes = [-1, 0, 1];
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  const spawnZ = 180;

  const obstacle = MeshBuilder.CreateBox(`obs_${Date.now()}`, {
    width: 2,
    height: 1.5,
    depth: 3,
  }, scene);
  obstacle.position = new Vector3(lane * 3.5, 0.75, spawnZ);

  // Obstacle styling
  const obsMat = new StandardMaterial(`obsMat_${Date.now()}`, scene);
  const colorChoice = Math.random();
  if (colorChoice < 0.33) {
    obsMat.diffuseColor = new Color3(0.8, 0.1, 0.1);
    obsMat.emissiveColor = new Color3(0.3, 0.02, 0.02);
  } else if (colorChoice < 0.66) {
    obsMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
    obsMat.emissiveColor = new Color3(0.05, 0.05, 0.05);
  } else {
    obsMat.diffuseColor = new Color3(0.6, 0.4, 0.05);
    obsMat.emissiveColor = new Color3(0.2, 0.15, 0.01);
  }
  obstacle.material = obsMat;

  // Warning lights
  if (Math.random() > 0.5) {
    const warnMat = new StandardMaterial(`warnMat_${Date.now()}`, scene);
    warnMat.emissiveColor = new Color3(1, 0.5, 0);
    const warn = MeshBuilder.CreateBox(`warn_${Date.now()}`, { width: 0.2, height: 0.2, depth: 0.1 }, scene);
    warn.material = warnMat;
    warn.parent = obstacle;
    warn.position = new Vector3(0, 1.2, 0);
  }

  _obstacles.push(obstacle);
}

function updateObstacles(dt: number): void {
  for (let i = _obstacles.length - 1; i >= 0; i--) {
    const obs = _obstacles[i];
    obs.position.z -= _speed * dt * 2;

    if (obs.position.z < -20) {
      obs.dispose();
      _obstacles.splice(i, 1);
    }
  }
}

function checkCollisions(): void {
  if (!_playerMesh) return;

  const px = _playerMesh.position.x;
  const pz = _playerMesh.position.z;
  const hitRadius = 1.5;

  for (const obs of _obstacles) {
    const dx = Math.abs(obs.position.x - px);
    const dz = Math.abs(obs.position.z - pz);

    if (dx < hitRadius && dz < hitRadius) {
      gameOver();
      return;
    }
  }
}

function spawnExhaust(scene: Scene, pos: Vector3): void {
  const particle = MeshBuilder.CreateSphere(`exhaust_${Date.now()}`, {
    diameter: 0.15 + Math.random() * 0.1,
    segments: 4,
  }, scene);

  particle.position = pos.clone();
  particle.position.x += (Math.random() - 0.5) * 0.5;
  particle.position.y = 0.2;
  particle.position.z = -2;

  const mat = new StandardMaterial(`exhaustMat_${Date.now()}`, scene);
  mat.diffuseColor = new Color3(0.3, 0.6, 1);
  mat.emissiveColor = new Color3(0.1, 0.3, 0.6);
  mat.alpha = 0.6;
  particle.material = mat;

  _particles.push({ mesh: particle, life: 0.5 });
}

function updateParticles(dt: number): void {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.life -= dt;
    p.mesh.position.z -= _speed * dt * 0.5;
    p.mesh.position.y += dt * 0.5;
    const scale = p.life * 2;
    p.mesh.scaling.setAll(Math.max(0.01, scale));

    if (p.life <= 0) {
      p.mesh.dispose();
      _particles.splice(i, 1);
    }
  }
}

function gameOver(): void {
  _state = "gameover";
  if (_score > _highScore) {
    _highScore = _score;
    localStorage.setItem("voidracer_highscore", String(_highScore));
  }
  showGameOverUI();
}

function startGame(): void {
  _state = "playing";
  _score = 0;
  _speed = 30;
  _lane = 0;

  // Clear obstacles
  _obstacles.forEach(o => o.dispose());
  _obstacles = [];

  // Reset player
  if (_playerMesh) {
    _playerMesh.position = new Vector3(0, 0.3, -3);
  }

  if (_uiDiv) _uiDiv.style.display = "none";
}

function createUI(): HTMLDivElement {
  const div = document.createElement("div");
  div.id = "voidracer-ui";
  div.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 100;
    font-family: 'Orbitron', 'Segoe UI', sans-serif;
  `;

  // Score display
  const scoreDiv = document.createElement("div");
  scoreDiv.id = "vr-score";
  scoreDiv.style.cssText = `
    position: absolute; top: 20px; right: 20px;
    color: #00eeff; font-size: 28px; font-weight: 900;
    text-shadow: 0 0 15px rgba(0,238,255,0.6);
    letter-spacing: 3px;
  `;
  scoreDiv.textContent = "0";
  div.appendChild(scoreDiv);

  // Speed display
  const speedDiv = document.createElement("div");
  speedDiv.id = "vr-speed";
  speedDiv.style.cssText = `
    position: absolute; bottom: 30px; left: 20px;
    color: #ff0066; font-size: 18px; font-weight: 700;
    text-shadow: 0 0 10px rgba(255,0,102,0.5);
    letter-spacing: 2px;
  `;
  speedDiv.textContent = "30 KM/H";
  div.appendChild(speedDiv);

  // High score
  const hsDiv = document.createElement("div");
  hsDiv.id = "vr-highscore";
  hsDiv.style.cssText = `
    position: absolute; top: 55px; right: 20px;
    color: rgba(255,204,0,0.5); font-size: 12px;
    letter-spacing: 2px;
  `;
  hsDiv.textContent = `BEST: ${_highScore}`;
  div.appendChild(hsDiv);

  document.body.appendChild(div);
  return div;
}

function updateScoreUI(): void {
  const scoreEl = document.getElementById("vr-score");
  const speedEl = document.getElementById("vr-speed");
  if (scoreEl) scoreEl.textContent = String(_score);
  if (speedEl) speedEl.textContent = `${Math.floor(_speed * 3.6)} KM/H`;
}

function showMenuUI(): void {
  if (!_uiDiv) return;
  _uiDiv.innerHTML = "";
  _uiDiv.style.display = "block";
  _uiDiv.style.pointerEvents = "auto";

  // Dark overlay
  _uiDiv.style.background = "radial-gradient(ellipse at center, rgba(5,5,15,0.8) 0%, rgba(2,2,8,0.95) 100%)";

  // Title
  const title = document.createElement("div");
  title.style.cssText = `
    position: absolute; top: 35%; left: 50%; transform: translate(-50%, -50%);
    font-size: 56px; font-weight: 900; color: #00eeff;
    text-shadow: 0 0 30px rgba(0,238,255,0.7), 0 0 60px rgba(0,238,255,0.3);
    letter-spacing: 8px; text-align: center; white-space: nowrap;
  `;
  title.textContent = "VOID RACER";
  _uiDiv.appendChild(title);

  // Subtitle
  const sub = document.createElement("div");
  sub.style.cssText = `
    position: absolute; top: 46%; left: 50%; transform: translateX(-50%);
    color: rgba(255,0,102,0.7); font-size: 14px;
    letter-spacing: 6px;
  `;
  sub.textContent = "NEON NIGHTS";
  _uiDiv.appendChild(sub);

  // Play button
  const btn = document.createElement("div");
  btn.style.cssText = `
    position: absolute; top: 58%; left: 50%; transform: translate(-50%, -50%);
    padding: 18px 70px; border: 2px solid #00eeff;
    color: #00eeff; font-size: 20px; font-weight: 700;
    letter-spacing: 5px; cursor: pointer;
    background: rgba(0,238,255,0.05);
    transition: all 0.2s;
  `;
  btn.textContent = "▶ JOGAR";
  btn.onmouseenter = () => {
    btn.style.background = "rgba(0,238,255,0.15)";
    btn.style.boxShadow = "0 0 30px rgba(0,238,255,0.3)";
  };
  btn.onmouseleave = () => {
    btn.style.background = "rgba(0,238,255,0.05)";
    btn.style.boxShadow = "none";
  };
  btn.onclick = startGame;
  _uiDiv.appendChild(btn);

  // High score
  const hs = document.createElement("div");
  hs.style.cssText = `
    position: absolute; top: 70%; left: 50%; transform: translateX(-50%);
    color: rgba(255,204,0,0.5); font-size: 13px;
    letter-spacing: 3px;
  `;
  hs.textContent = `RECORDE: ${_highScore}`;
  _uiDiv.appendChild(hs);

  // Controls
  const controls = document.createElement("div");
  controls.style.cssText = `
    position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
    color: rgba(255,255,255,0.3); font-size: 11px;
    text-align: center; line-height: 2;
    font-family: 'Inter', sans-serif;
  `;
  controls.innerHTML = "MOBILE: Deslize ← → para trocar de pista<br>PC: Setas ← → ou A/D";
  _uiDiv.appendChild(controls);
}

function showGameOverUI(): void {
  if (!_uiDiv) return;
  _uiDiv.innerHTML = "";
  _uiDiv.style.display = "block";
  _uiDiv.style.pointerEvents = "auto";
  _uiDiv.style.background = "rgba(2,2,8,0.9)";

  const title = document.createElement("div");
  title.style.cssText = `
    position: absolute; top: 35%; left: 50%; transform: translate(-50%, -50%);
    font-size: 42px; font-weight: 900; color: #ff0066;
    text-shadow: 0 0 25px rgba(255,0,102,0.6);
    letter-spacing: 5px;
  `;
  title.textContent = "GAME OVER";
  _uiDiv.appendChild(title);

  const score = document.createElement("div");
  score.style.cssText = `
    position: absolute; top: 47%; left: 50%; transform: translate(-50%, -50%);
    font-size: 36px; color: #00eeff; font-weight: 900;
    text-shadow: 0 0 15px rgba(0,238,255,0.5);
    letter-spacing: 3px;
  `;
  score.textContent = `${_score}`;
  _uiDiv.appendChild(score);

  const label = document.createElement("div");
  label.style.cssText = `
    position: absolute; top: 53%; left: 50%; transform: translateX(-50%);
    color: rgba(255,255,255,0.4); font-size: 12px;
    letter-spacing: 4px;
  `;
  label.textContent = "PONTOS";
  _uiDiv.appendChild(label);

  const btn = document.createElement("div");
  btn.style.cssText = `
    position: absolute; top: 64%; left: 50%; transform: translate(-50%, -50%);
    padding: 16px 60px; border: 2px solid #ff0066;
    color: #ff0066; font-size: 18px; font-weight: 700;
    letter-spacing: 4px; cursor: pointer;
    background: rgba(255,0,102,0.05);
    transition: all 0.2s;
  `;
  btn.textContent = "JOGAR DE NOVO";
  btn.onclick = () => {
    _uiDiv!.style.display = "none";
    startGame();
  };
  btn.onmouseenter = () => {
    btn.style.background = "rgba(255,0,102,0.15)";
    btn.style.boxShadow = "0 0 25px rgba(255,0,102,0.3)";
  };
  btn.onmouseleave = () => {
    btn.style.background = "rgba(255,0,102,0.05)";
    btn.style.boxShadow = "none";
  };
  _uiDiv.appendChild(btn);
}

function setupInput(canvas: HTMLCanvasElement): void {
  // Keyboard
  _onKeyDown = (ev: KeyboardEvent) => {
    if (_state === "menu") {
      startGame();
      return;
    }
    if (_state === "gameover" && ev.key === " ") {
      startGame();
      return;
    }
    if (_state !== "playing") return;

    if (ev.key === "ArrowLeft" || ev.key === "a") {
      _lane = Math.max(-1, _lane - 1);
    }
    if (ev.key === "ArrowRight" || ev.key === "d") {
      _lane = Math.min(1, _lane + 1);
    }
  };
  window.addEventListener("keydown", _onKeyDown);

  // Touch / Pointer
  _onPointerDown = (ev: PointerEvent) => {
    if (_state === "menu") {
      startGame();
      return;
    }
    if (_state === "gameover") {
      startGame();
      return;
    }
    if (_state !== "playing") return;

    _touchStartX = ev.clientX;
  };
  canvas.addEventListener("pointerdown", _onPointerDown);

  canvas.addEventListener("pointermove", (ev: PointerEvent) => {
    if (_state !== "playing" || _touchStartX === 0) return;
    const dx = ev.clientX - _touchStartX;
    if (Math.abs(dx) > 30) {
      if (dx > 0 && _lane < 1) _lane = Math.min(1, _lane + 1);
      if (dx < 0 && _lane > -1) _lane = Math.max(-1, _lane - 1);
      _touchStartX = ev.clientX;
    }
  });
}
