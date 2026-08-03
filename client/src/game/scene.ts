import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { HemisphericLight, DirectionalLight } from "@babylonjs/core/Lights";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Engine } from "@babylonjs/core/Engines/engine";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";

import { Player } from "./player";
import { EnemyManager } from "./enemyManager";
import { ParticleManager } from "./particles";
import { InputManager } from "./input";
import { UIOverlay } from "./ui";
import { ProjectileManager } from "./projectiles";

export type GameHandle = {
  scene: Scene;
  dispose: () => void;
};

type GameState = "menu" | "playing" | "paused" | "gameover" | "levelup";

let _gameState: GameState = "menu";
let _score = 0;
let _wave = 1;
let _highScore = parseInt(localStorage.getItem("luanslash_highscore") || "0");
let _uiOverlay: UIOverlay | null = null;
let _sceneRef: Scene | null = null;
let _gameObjects: {
  player: Player;
  enemyManager: EnemyManager;
  particleManager: ParticleManager;
  inputManager: InputManager;
  projectileManager: ProjectileManager;
} | null = null;
let _onPointerUp: ((ev: PointerEvent) => void) | null = null;
let _onKeyDown: ((ev: KeyboardEvent) => void) | null = null;
let _onKeyUp: ((ev: KeyboardEvent) => void) | null = null;

export function getGameState(): GameState { return _gameState; }
export function setGameState(state: GameState): void {
  _gameState = state;
  if (_uiOverlay) _uiOverlay.updateState(state);
}
export function getScore() { return _score; }
export function getHighScore() { return _highScore; }
export function getWave() { return _wave; }
export function getScene() { return _sceneRef; }

export function resetGame() {
  _score = 0;
  _wave = 1;
  if (_gameObjects) {
    _gameObjects.player.reset();
    _gameObjects.enemyManager.clear();
    _gameObjects.particleManager.clear();
    _gameObjects.projectileManager.clear();
  }
  if (_uiOverlay) _uiOverlay.reset();
  setGameState("playing");
}

export function addScore(points: number) {
  _score += points;
  if (_score > _highScore) {
    _highScore = _score;
    localStorage.setItem("luanslash_highscore", String(_highScore));
  }
  if (_uiOverlay) _uiOverlay.updateScore(_score, _highScore);
}

export function setWave(wave: number) {
  _wave = wave;
  if (_uiOverlay) _uiOverlay.updateWave(wave);
}

export function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  return new Promise((resolve) => {
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.04, 0.04, 0.06, 1);
    _sceneRef = scene;

    // Camera - top-down view
    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 18, Vector3.Zero(), scene);
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 25;
    camera.lowerBetaLimit = Math.PI / 4;
    camera.upperBetaLimit = Math.PI / 2.2;
    camera.inertialRadiusOffset = 0;
    camera.inertialBetaOffset = 0;
    camera.inertialAlphaOffset = 0;
    camera.panningSensibility = 0;
    camera.attachControl(canvas, false);
    camera.wheelPrecision = 50;

    // Ambient light
    const hemiLight = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.4;
    hemiLight.diffuse = new Color3(0.5, 0.5, 0.7);

    // Directional light
    const dirLight = new DirectionalLight("dir", new Vector3(-0.5, -1, -0.5), scene);
    dirLight.intensity = 0.6;
    dirLight.diffuse = new Color3(0.6, 0.5, 0.4);

    // Glow layer
    const glow = new GlowLayer("glow", scene);
    glow.intensity = 0.8;

    // Arena floor
    createArena(scene);

    // UI Overlay
    _uiOverlay = new UIOverlay(scene);

    // Create game objects
    const player = new Player(scene);
    const particleManager = new ParticleManager(scene);
    const inputManager = new InputManager(canvas, camera);
    const enemyManager = new EnemyManager(scene, player, particleManager);
    const projectileManager = new ProjectileManager(scene, player, particleManager);

    _gameObjects = { player, enemyManager, particleManager, inputManager, projectileManager };

    // Store references on scene for cross-module access
    (scene as any).__uiOverlay = _uiOverlay;
    (scene as any).__gameObjects = _gameObjects;
    (scene as any).__player = player;
    (scene as any).__enemyManager = enemyManager;

    // Input handlers
    _onPointerUp = (ev: PointerEvent) => {
      if (_gameState === "menu") {
        resetGame();
        return;
      }
      if (_gameState === "gameover") {
        if (_uiOverlay) _uiOverlay.showMenu();
        return;
      }
      if (_gameState === "levelup") {
        return;
      }
      if (_gameState === "playing") {
        const rect = canvas.getBoundingClientRect();
        const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        player.attack(new Vector3(x * 20, 0, y * 20), scene, projectileManager, particleManager);
      }
    };
    canvas.addEventListener("pointerup", _onPointerUp);

    // Keyboard handlers
    _onKeyDown = (ev: KeyboardEvent) => {
      if (_gameState === "playing") {
        inputManager.handleKeyDown(ev.key.toLowerCase());
      }
      if (ev.key === " " && _gameState === "menu") {
        resetGame();
      }
      if (ev.key === " " && _gameState === "gameover") {
        if (_uiOverlay) _uiOverlay.showMenu();
      }
      if (ev.key === "Escape" && _gameState === "playing") {
        // Pause could go here
      }
    };
    _onKeyUp = (ev: KeyboardEvent) => {
      inputManager.handleKeyUp(ev.key.toLowerCase());
    };
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);

    // Wave timer
    let waveTimer = 0;

    // Game loop
    scene.registerBeforeRender(() => {
      if (_gameState === "playing") {
        const dt = engine.getDeltaTime() / 1000;
        waveTimer += engine.getDeltaTime();

        // Movement
        const moveDir = inputManager.getMovementDirection();

        // Dash
        if (inputManager.isDashing()) {
          player.dash(moveDir);
        }

        player.update(moveDir, dt);

        // Camera follows player
        camera.target = player.position.clone();

        // Enemy spawn & update
        const waveInterval = Math.max(5000, 15000 - _wave * 1000);
        enemyManager.update(dt, player.position, _wave);
        projectileManager.update(dt);
        particleManager.update(dt);

        if (waveTimer >= waveInterval) {
          waveTimer = 0;
          _wave++;
          setWave(_wave);
          // Check level up every 3 waves
          if (_wave % 3 === 0) {
            player.addXP(100);
            if (player.shouldLevelUp()) {
              setGameState("levelup");
            }
          }
        }

        // Check game over
        if (player.isDead()) {
          setGameState("gameover");
          if (_uiOverlay) _uiOverlay.showGameOver(_score, _highScore);
        }

        // Update UI
        if (_uiOverlay) {
          _uiOverlay.updateHealth(player.health, player.maxHealth);
          _uiOverlay.updateLevel(player.level);
          _uiOverlay.updateScore(_score, _highScore);
        }
      }
    });

    // Show initial menu
    _uiOverlay.showMenu();

    resolve({
      scene,
      dispose: () => {
        if (_onPointerUp) canvas.removeEventListener("pointerup", _onPointerUp);
        if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
        if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
        scene.dispose();
      },
    });
  });
}

function createArena(scene: Scene) {
  // Ground
  const ground = MeshBuilder.CreateGround("ground", {
    width: 80,
    height: 80,
    subdivisions: 10,
  }, scene);

  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new Color3(0.08, 0.08, 0.12);
  groundMat.specularColor = new Color3(0.02, 0.02, 0.05);
  ground.material = groundMat;

  // Border pillars
  const pillarMat = new StandardMaterial("pillarMat", scene);
  pillarMat.diffuseColor = new Color3(0.1, 0.05, 0.05);
  pillarMat.emissiveColor = new Color3(0.3, 0.05, 0.05);

  const wallHeight = 1;
  const arenaSize = 38;

  const pillarPositions = [
    new Vector3(-arenaSize, wallHeight, -arenaSize),
    new Vector3(arenaSize, wallHeight, -arenaSize),
    new Vector3(-arenaSize, wallHeight, arenaSize),
    new Vector3(arenaSize, wallHeight, arenaSize),
  ];

  pillarPositions.forEach((pos, i) => {
    const pillar = MeshBuilder.CreateBox(`pillar_${i}`, { width: 1, height: 3, depth: 1 }, scene);
    pillar.position = pos;
    pillar.material = pillarMat;
  });

  // Floor grid lines
  const gridMat = new StandardMaterial("gridMat", scene);
  gridMat.diffuseColor = new Color3(0.15, 0.15, 0.2);
  gridMat.alpha = 0.3;
  gridMat.emissiveColor = new Color3(0.05, 0.05, 0.1);

  for (let i = -30; i <= 30; i += 10) {
    const hLine = MeshBuilder.CreateBox(`gridH_${i}`, { width: 60, height: 0.02, depth: 0.1 }, scene);
    hLine.position = new Vector3(0, 0.01, i);
    hLine.material = gridMat;

    const vLine = MeshBuilder.CreateBox(`gridV_${i}`, { width: 0.1, height: 0.02, depth: 60 }, scene);
    vLine.position = new Vector3(i, 0.01, 0);
    vLine.material = gridMat;
  }
}
