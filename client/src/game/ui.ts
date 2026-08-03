import { Scene } from "@babylonjs/core/scene";
import { getGameState, setGameState, getScore, getHighScore, getWave } from "./scene";

export class UIOverlay {
  private container: HTMLDivElement;
  private healthBar: HTMLDivElement;
  private healthText: HTMLDivElement;
  private scoreText: HTMLDivElement;
  private waveText: HTMLDivElement;
  private levelText: HTMLDivElement;
  private menuScreen: HTMLDivElement;
  private gameOverScreen: HTMLDivElement;
  private levelUpScreen: HTMLDivElement;
  private joystickIndicator: HTMLDivElement;
  private scene: Scene;
  private dashIndicator: HTMLDivElement;
  private xpBar: HTMLDivElement;

  constructor(scene: Scene) {
    this.scene = scene;
    this.container = this.createContainer();
    this.healthBar = this.createHealthBar();
    this.healthText = this.createHealthText();
    this.scoreText = this.createScoreText();
    this.waveText = this.createWaveText();
    this.levelText = this.createLevelText();
    this.xpBar = this.createXPBar();
    this.dashIndicator = this.createDashIndicator();
    this.joystickIndicator = this.createJoystickIndicator();
    this.menuScreen = this.createMenuScreen();
    this.gameOverScreen = this.createGameOverScreen();
    this.levelUpScreen = this.createLevelUpScreen();

    document.body.appendChild(this.container);
    (scene as any).__uiOverlay = this;
  }

  private createContainer(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "game-ui";
    div.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 100; font-family: 'Orbitron', sans-serif;
      overflow: hidden;
    `;
    return div;
  }

  private createHealthBar(): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
      position: absolute; top: 16px; left: 16px; width: 200px;
    `;

    const bg = document.createElement("div");
    bg.style.cssText = `
      width: 100%; height: 20px; background: rgba(20,0,0,0.8);
      border: 2px solid rgba(255,50,50,0.5); border-radius: 4px;
      overflow: hidden;
    `;

    const fill = document.createElement("div");
    fill.id = "health-fill";
    fill.style.cssText = `
      width: 100%; height: 100%;
      background: linear-gradient(90deg, #ff2222, #ff4444);
      transition: width 0.2s ease;
    `;

    bg.appendChild(fill);
    container.appendChild(bg);

    const label = document.createElement("div");
    label.style.cssText = `
      color: #ff4444; font-size: 11px; margin-top: 2px;
      text-shadow: 0 0 8px rgba(255,34,34,0.5);
      letter-spacing: 1px;
    `;
    label.textContent = "HP";
    container.appendChild(label);

    this.container.appendChild(container);
    return container;
  }

  private createHealthText(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "health-text";
    div.style.cssText = `
      position: absolute; top: 18px; left: 226px;
      color: #e8e8e8; font-size: 14px;
      text-shadow: 0 0 8px rgba(255,34,34,0.5);
    `;
    div.textContent = "100/100";
    this.container.appendChild(div);
    return div;
  }

  private createScoreText(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "score-text";
    div.style.cssText = `
      position: absolute; top: 16px; right: 16px; text-align: right;
    `;

    const score = document.createElement("div");
    score.id = "score-value";
    score.style.cssText = `
      color: #ffcc00; font-size: 24px; font-weight: 900;
      text-shadow: 0 0 12px rgba(255,204,0,0.6);
      letter-spacing: 2px;
    `;
    score.textContent = "0";
    div.appendChild(score);

    const highScore = document.createElement("div");
    highScore.id = "highscore-value";
    highScore.style.cssText = `
      color: rgba(255,204,0,0.5); font-size: 11px;
      letter-spacing: 1px; margin-top: 2px;
    `;
    highScore.textContent = `BEST: 0`;
    div.appendChild(highScore);

    this.container.appendChild(div);
    return div;
  }

  private createWaveText(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "wave-text";
    div.style.cssText = `
      position: absolute; top: 50px; right: 16px;
      color: #44aaff; font-size: 13px;
      text-shadow: 0 0 8px rgba(68,170,255,0.4);
      letter-spacing: 2px;
    `;
    div.textContent = "WAVE 1";
    this.container.appendChild(div);
    return div;
  }

  private createLevelText(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "level-text";
    div.style.cssText = `
      position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
      color: #44aaff; font-size: 14px; font-weight: 700;
      text-shadow: 0 0 8px rgba(68,170,255,0.5);
      letter-spacing: 3px;
    `;
    div.textContent = "LVL 1";
    this.container.appendChild(div);
    return div;
  }

  private createXPBar(): HTMLDivElement {
    const container = document.createElement("div");
    container.style.cssText = `
      position: absolute; top: 40px; left: 50%; transform: translateX(-50%);
      width: 120px;
    `;

    const bg = document.createElement("div");
    bg.style.cssText = `
      width: 100%; height: 6px; background: rgba(30,30,50,0.8);
      border: 1px solid rgba(68,170,255,0.3); border-radius: 3px;
      overflow: hidden;
    `;

    const fill = document.createElement("div");
    fill.id = "xp-fill";
    fill.style.cssText = `
      width: 0%; height: 100%;
      background: linear-gradient(90deg, #44aaff, #66ccff);
      transition: width 0.3s ease;
    `;

    bg.appendChild(fill);
    container.appendChild(bg);
    this.container.appendChild(container);
    return container;
  }

  private createDashIndicator(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "dash-indicator";
    div.style.cssText = `
      position: absolute; bottom: 20px; right: 16px;
      color: rgba(68,170,255,0.6); font-size: 10px;
      letter-spacing: 1px;
    `;
    div.textContent = "DASH READY";
    this.container.appendChild(div);
    return div;
  }

  private createJoystickIndicator(): HTMLDivElement {
    const div = document.createElement("div");
    div.style.cssText = `
      position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,0.3); font-size: 10px;
      font-family: 'Inter', sans-serif; letter-spacing: 1px;
    `;
    div.textContent = "DRAG TO MOVE • TAP TO ATTACK";
    this.container.appendChild(div);
    return div;
  }

  private createMenuScreen(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "menu-screen";
    div.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: radial-gradient(ellipse at center, rgba(10,10,15,0.85) 0%, rgba(5,5,8,0.95) 100%);
      pointer-events: auto; z-index: 200;
    `;

    // Logo
    const logo = document.createElement("div");
    logo.style.cssText = `
      font-size: 52px; font-weight: 900; color: #ff2222;
      text-shadow: 0 0 30px rgba(255,34,34,0.6), 0 0 60px rgba(255,34,34,0.3);
      letter-spacing: 6px; margin-bottom: 8px;
    `;
    logo.textContent = "LUAN SLASH";
    div.appendChild(logo);

    // Subtitle
    const subtitle = document.createElement("div");
    subtitle.style.cssText = `
      font-size: 13px; color: rgba(255,255,255,0.4);
      letter-spacing: 4px; margin-bottom: 50px;
      font-family: 'Inter', sans-serif;
    `;
    subtitle.textContent = "ARENA COMBAT";
    div.appendChild(subtitle);

    // Play button
    const btn = document.createElement("div");
    btn.style.cssText = `
      padding: 16px 60px; border: 2px solid #ff2222;
      color: #ff2222; font-size: 18px; font-weight: 700;
      letter-spacing: 4px; cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(255,34,34,0.1);
    `;
    btn.textContent = "▶ JOGAR";
    btn.onmouseenter = () => {
      btn.style.background = "rgba(255,34,34,0.2)";
      btn.style.textShadow = "0 0 20px rgba(255,34,34,0.5)";
    };
    btn.onmouseleave = () => {
      btn.style.background = "rgba(255,34,34,0.1)";
      btn.style.textShadow = "none";
    };
    btn.onclick = () => {
      setGameState("playing");
      this.menuScreen.style.display = "none";
    };
    div.appendChild(btn);

    // High score
    const hs = document.createElement("div");
    hs.style.cssText = `
      margin-top: 30px; color: rgba(255,204,0,0.6); font-size: 13px;
      letter-spacing: 2px;
    `;
    hs.textContent = `RECORDE: ${getHighScore()}`;
    div.appendChild(hs);

    // Controls hint
    const controls = document.createElement("div");
    controls.style.cssText = `
      position: absolute; bottom: 40px; color: rgba(255,255,255,0.3);
      font-size: 11px; font-family: 'Inter', sans-serif;
      letter-spacing: 1px; text-align: center; line-height: 2;
    `;
    controls.innerHTML = `
      MOBILE: Arraste para mover • Toque para atacar<br>
      PC: WASD para mover • Clique para atacar • Shift para esquivar
    `;
    div.appendChild(controls);

    this.container.appendChild(div);
    return div;
  }

  private createGameOverScreen(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "gameover-screen";
    div.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: none; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(5,5,8,0.9);
      pointer-events: auto; z-index: 200;
    `;

    const title = document.createElement("div");
    title.style.cssText = `
      font-size: 40px; font-weight: 900; color: #ff2222;
      text-shadow: 0 0 30px rgba(255,34,34,0.6);
      letter-spacing: 4px; margin-bottom: 30px;
    `;
    title.textContent = "GAME OVER";
    div.appendChild(title);

    const finalScore = document.createElement("div");
    finalScore.id = "final-score";
    finalScore.style.cssText = `
      font-size: 28px; color: #ffcc00;
      text-shadow: 0 0 15px rgba(255,204,0,0.5);
      margin-bottom: 8px; letter-spacing: 2px;
    `;
    finalScore.textContent = "0";
    div.appendChild(finalScore);

    const finalWave = document.createElement("div");
    finalWave.id = "final-wave";
    finalWave.style.cssText = `
      font-size: 14px; color: rgba(68,170,255,0.7);
      letter-spacing: 2px; margin-bottom: 40px;
    `;
    finalWave.textContent = "WAVE 1";
    div.appendChild(finalWave);

    const retryBtn = document.createElement("div");
    retryBtn.style.cssText = `
      padding: 14px 50px; border: 2px solid #ffcc00;
      color: #ffcc00; font-size: 16px; font-weight: 700;
      letter-spacing: 3px; cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(255,204,0,0.1);
    `;
    retryBtn.textContent = "TENTAR DE NOVO";
    retryBtn.onmouseenter = () => {
      retryBtn.style.background = "rgba(255,204,0,0.2)";
    };
    retryBtn.onmouseleave = () => {
      retryBtn.style.background = "rgba(255,204,0,0.1)";
    };
    retryBtn.onclick = () => {
      div.style.display = "none";
      this.showMenu();
    };
    div.appendChild(retryBtn);

    this.container.appendChild(div);
    return div;
  }

  private createLevelUpScreen(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = "levelup-screen";
    div.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: none; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(5,5,8,0.85);
      pointer-events: auto; z-index: 200;
    `;

    const title = document.createElement("div");
    title.style.cssText = `
      font-size: 28px; font-weight: 900; color: #44aaff;
      text-shadow: 0 0 20px rgba(68,170,255,0.5);
      letter-spacing: 4px; margin-bottom: 40px;
    `;
    title.textContent = "LEVEL UP!";
    div.appendChild(title);

    const choices = document.createElement("div");
    choices.id = "levelup-choices";
    choices.style.cssText = `
      display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
      max-width: 90vw;
    `;
    div.appendChild(choices);

    this.container.appendChild(div);
    return div;
  }

  public updateState(state: string): void {
    switch (state) {
      case "playing":
        this.menuScreen.style.display = "none";
        this.gameOverScreen.style.display = "none";
        this.levelUpScreen.style.display = "none";
        break;
      case "levelup":
        this.levelUpScreen.style.display = "flex";
        break;
    }
  }

  public updateScore(score: number, highScore: number): void {
    const scoreEl = document.getElementById("score-value");
    const hsEl = document.getElementById("highscore-value");
    if (scoreEl) scoreEl.textContent = String(score);
    if (hsEl) hsEl.textContent = `BEST: ${highScore}`;
  }

  public updateHealth(health: number, maxHealth: number): void {
    const fill = document.getElementById("health-fill");
    const text = document.getElementById("health-text");
    if (fill) {
      const pct = Math.max(0, (health / maxHealth) * 100);
      fill.style.width = `${pct}%`;
    }
    if (text) text.textContent = `${Math.ceil(health)}/${maxHealth}`;
  }

  public updateWave(wave: number): void {
    const el = document.getElementById("wave-text");
    if (el) el.textContent = `WAVE ${wave}`;

    // Wave announcement animation
    if (el) {
      el.style.transform = "scale(1.5)";
      el.style.color = "#ffcc00";
      setTimeout(() => {
        el.style.transform = "scale(1)";
        el.style.color = "#44aaff";
      }, 300);
    }
  }

  public updateLevel(level: number): void {
    const el = document.getElementById("level-text");
    if (el) el.textContent = `LVL ${level}`;

    const xpFill = document.getElementById("xp-fill");
    if (xpFill) {
      const player = (this.scene as any).__player;
      if (player) {
        const pct = (player.xp / player.xpToNext) * 100;
        xpFill.style.width = `${Math.min(100, pct)}%`;
      }
    }
  }

  public reset(): void {
    this.updateScore(0, getHighScore());
    this.updateHealth(100, 100);
    this.updateWave(1);
    this.updateLevel(1);
  }

  public showMenu(): void {
    this.menuScreen.style.display = "flex";
    this.gameOverScreen.style.display = "none";
    this.levelUpScreen.style.display = "none";
    setGameState("menu");

    const hs = this.menuScreen.querySelector("div:last-child") as HTMLDivElement;
    if (hs) {
      const hsEl = hs.parentElement?.querySelector("div:nth-last-child(2)");
      if (hsEl) hsEl.textContent = `RECORDE: ${getHighScore()}`;
    }
  }

  public showGameOver(score: number, highScore: number): void {
    this.menuScreen.style.display = "none";
    this.gameOverScreen.style.display = "flex";

    const scoreEl = document.getElementById("final-score");
    const waveEl = document.getElementById("final-wave");
    if (scoreEl) scoreEl.textContent = `${score} PTS`;
    if (waveEl) waveEl.textContent = `WAVE ${getWave()} ALCANÇADA`;
  }

  public showLevelUp(): void {
    this.levelUpScreen.style.display = "flex";
    this.generateLevelUpChoices();
  }

  private generateLevelUpChoices(): void {
    const choices = document.getElementById("levelup-choices");
    if (!choices) return;
    choices.innerHTML = "";

    const upgrades = [
      { id: "damage", label: "DANO +10", icon: "⚔️", desc: "Mais dano por golpe" },
      { id: "speed", label: "VELOCIDADE", icon: "🏃", desc: "Movimento mais rápido" },
      { id: "health", label: "VIDA +25", icon: "❤️", desc: "Mais vida máxima" },
      { id: "attackSpeed", label: "ATAQUE RÁPIDO", icon: "⚡", desc: "Menor cooldown" },
      { id: "range", label: "ALCANCE", icon: "🔵", desc: "Slash mais longo" },
      { id: "dashSpeed", label: "DASH RÁPIDO", icon: "💨", desc: "Esquiva mais frequente" },
    ];

    // Pick 3 random
    const shuffled = upgrades.sort(() => Math.random() - 0.5).slice(0, 3);

    shuffled.forEach(upgrade => {
      const card = document.createElement("div");
      card.style.cssText = `
        padding: 20px 24px; border: 1px solid rgba(68,170,255,0.3);
        background: rgba(10,15,30,0.9); cursor: pointer;
        transition: all 0.2s ease; min-width: 140px; text-align: center;
      `;

      const icon = document.createElement("div");
      icon.style.cssText = `font-size: 28px; margin-bottom: 8px;`;
      icon.textContent = upgrade.icon;
      card.appendChild(icon);

      const label = document.createElement("div");
      label.style.cssText = `
        color: #44aaff; font-size: 12px; font-weight: 700;
        letter-spacing: 2px; margin-bottom: 4px;
      `;
      label.textContent = upgrade.label;
      card.appendChild(label);

      const desc = document.createElement("div");
      desc.style.cssText = `
        color: rgba(255,255,255,0.4); font-size: 10px;
        font-family: 'Inter', sans-serif;
      `;
      desc.textContent = upgrade.desc;
      card.appendChild(desc);

      card.onmouseenter = () => {
        card.style.borderColor = "#44aaff";
        card.style.background = "rgba(20,30,60,0.9)";
        card.style.boxShadow = "0 0 20px rgba(68,170,255,0.3)";
      };
      card.onmouseleave = () => {
        card.style.borderColor = "rgba(68,170,255,0.3)";
        card.style.background = "rgba(10,15,30,0.9)";
        card.style.boxShadow = "none";
      };
      card.onclick = () => {
        // Apply upgrade
        const scene = this.scene;
        const gameObjs = (scene as any).__gameObjects;
        if (gameObjs && gameObjs.player) {
          gameObjs.player.applyUpgrade(upgrade.id);
        }
        this.levelUpScreen.style.display = "none";
        setGameState("playing");
      };

      choices.appendChild(card);
    });
  }
}
