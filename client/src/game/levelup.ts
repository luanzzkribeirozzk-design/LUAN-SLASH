import { Scene } from "@babylonjs/core/scene";
import { setGameState } from "./scene";

export class LevelUpManager {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public showChoices(): void {
    setGameState("levelup");
    const ui = (this.scene as any).__uiOverlay;
    if (ui) ui.showLevelUp();
  }

  public reset(): void {
    // Nothing to reset for levelup
  }
}
