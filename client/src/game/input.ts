import { Vector3 } from "@babylonjs/core/Maths/math";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";

export class InputManager {
  private keys: Set<string> = new Set();
  private joystickActive: boolean = false;
  private joystickStart: { x: number; y: number } | null = null;
  private joystickCurrent: { x: number; y: number } | null = null;
  private touchId: number | null = null;
  private canvas: HTMLCanvasElement;
  private camera: ArcRotateCamera;

  constructor(canvas: HTMLCanvasElement, camera: ArcRotateCamera) {
    this.canvas = canvas;
    this.camera = camera;
    this.setupTouchControls();
  }

  private setupTouchControls(): void {
    // Left side of screen = movement joystick
    this.canvas.addEventListener("touchstart", (e: TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const rect = this.canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) / rect.width;

        if (x < 0.5) {
          // Left side - movement
          this.joystickActive = true;
          this.joystickStart = { x: touch.clientX, y: touch.clientY };
          this.joystickCurrent = { x: touch.clientX, y: touch.clientY };
          this.touchId = touch.identifier;
        }
      }
    }, { passive: true });

    this.canvas.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      if (this.touchId === null) return;

      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.touchId) {
          this.joystickCurrent = { x: e.touches[i].clientX, y: e.touches[i].clientY };
        }
      }
    }, { passive: false });

    this.canvas.addEventListener("touchend", (e: TouchEvent) => {
      if (this.touchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.touchId) {
          this.joystickActive = false;
          this.joystickStart = null;
          this.joystickCurrent = null;
          this.touchId = null;
        }
      }
    });

    // Double tap = dash
    let lastTap = 0;
    this.canvas.addEventListener("touchstart", (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        // Double tap
        this.keys.add("dash");
        setTimeout(() => this.keys.delete("dash"), 100);
      }
      lastTap = now;
    }, { passive: true });
  }

  public handleKeyDown(key: string): void {
    this.keys.add(key);
    if (key === "shift") {
      this.keys.add("dash");
    }
  }

  public handleKeyUp(key: string): void {
    this.keys.delete(key);
    if (key === "shift") {
      this.keys.delete("dash");
    }
  }

  public getMovementDirection(): Vector3 {
    let dx = 0;
    let dz = 0;

    // Keyboard input
    if (this.keys.has("w") || this.keys.has("arrowup")) dz -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dz += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;

    // Touch joystick
    if (this.joystickActive && this.joystickStart && this.joystickCurrent) {
      const maxDist = 80; // pixels
      const dxPixels = this.joystickCurrent.x - this.joystickStart.x;
      const dyPixels = this.joystickCurrent.y - this.joystickStart.y;
      const dist = Math.sqrt(dxPixels * dxPixels + dyPixels * dyPixels);

      if (dist > 10) {
        dx += (dxPixels / maxDist);
        dz += (dyPixels / maxDist);
      }
    }

    // Normalize
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length > 0) {
      dx /= length;
      dz /= length;
    }

    return new Vector3(dx, 0, dz);
  }

  public isDashing(): boolean {
    return this.keys.has("dash");
  }

  public getJoystickState(): { active: boolean; x: number; y: number } | null {
    if (!this.joystickActive || !this.joystickStart || !this.joystickCurrent) return null;
    const maxDist = 80;
    const dx = (this.joystickCurrent.x - this.joystickStart.x) / maxDist;
    const dy = (this.joystickCurrent.y - this.joystickStart.y) / maxDist;
    return {
      active: this.joystickActive,
      x: Math.max(-1, Math.min(1, dx)),
      y: Math.max(-1, Math.min(1, dy)),
    };
  }
}
