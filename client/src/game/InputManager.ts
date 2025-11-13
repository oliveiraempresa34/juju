import type { PlayerInputState } from "./LocalPhysics";

type InputCallback = (input: PlayerInputState) => void;

export class InputManager {
  private canvas?: HTMLCanvasElement | null;
  private callback?: InputCallback;

  private accelerating = false;
  private leftActive = false;
  private rightActive = false;
  private pointerActive = false;
  private suppressInitialPointer = true;
  private pointerSteering = 0;
  private pointerSide = 0; // -1 = esquerda, 0 = centro, 1 = direita
  private pointerIntensity = 0;
  private clickStartTime = 0; // Momento em que o clique começou

  attach(canvas: HTMLCanvasElement, callback: InputCallback) {
    this.detach();
    this.canvas = canvas;
    this.callback = callback;

    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("mouseleave", this.handleMouseLeave);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    canvas.addEventListener("touchend", this.handleTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", this.handleTouchEnd, { passive: false });
    canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });

    window.addEventListener("keydown", this.handleKeyDown, { passive: false });
    window.addEventListener("keyup", this.handleKeyUp, { passive: false });

    this.emit();
  }

  detach() {
    if (!this.canvas) {
      return;
    }

    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchend", this.handleTouchEnd);
    this.canvas.removeEventListener("touchcancel", this.handleTouchEnd);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);

    this.canvas = undefined;
    this.callback = undefined;
    this.pointerActive = false;
    this.pointerSteering = 0;
    this.pointerIntensity = 0;
  }

  private emit() {
    const steeringValue = this.computeSteering();
    const magnitude = Math.abs(steeringValue);
    const pointerIntensity = this.pointerActive ? this.pointerIntensity : 0;
    const hasDirectionalInput = magnitude > 0 || this.leftActive || this.rightActive || this.pointerActive;
    const driftDirection = steeringValue !== 0 ? Math.sign(steeringValue) : (this.leftActive ? -1 : this.rightActive ? 1 : 0);

    // Calcular tempo de clique mantido
    const clickHoldTime = this.pointerActive ? (performance.now() - this.clickStartTime) / 1000 : 0;

    this.callback?.({
      accelerate: this.accelerating || (this.pointerActive && !this.suppressInitialPointer),
      steering: hasDirectionalInput ? steeringValue : 0,
      drifting: hasDirectionalInput,
      driftDirection,
      intensity: hasDirectionalInput ? Math.max(magnitude, pointerIntensity || (this.leftActive || this.rightActive ? 1 : 0)) : 0,
      pointerActive: this.pointerActive,
      clickHoldTime
    });
  }

  private computeSteering() {
    if (this.pointerActive) {
      return this.pointerSteering;
    }

    if (this.leftActive && !this.rightActive) {
      return -1;
    }

    if (this.rightActive && !this.leftActive) {
      return 1;
    }

    return 0;
  }

  private updatePointerSteering(clientX: number) {
    if (!this.canvas) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const relative = (clientX - rect.left) / rect.width;
    const centered = relative - 0.5; // -0.5 .. 0.5
    this.pointerSide = centered >= 0 ? 1 : -1;
    const intensity = Math.max(0.4, Math.min(1, Math.abs(centered) * 2));
    this.pointerIntensity = intensity;
    this.pointerSteering = this.pointerSide * intensity;
  }

  private handleMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (this.suppressInitialPointer) {
      this.suppressInitialPointer = false;
    } else {
      this.accelerating = true;
      this.pointerActive = true;
      this.clickStartTime = performance.now();
      this.updatePointerSteering(event.clientX);
    }
    this.emit();
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.pointerActive || this.suppressInitialPointer) {
      return;
    }
    event.preventDefault();
    this.updatePointerSteering(event.clientX);
    this.emit();
  };

  private handleMouseUp = (event: MouseEvent) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    this.accelerating = false;
    this.pointerActive = false;
    this.suppressInitialPointer = false;
    this.pointerSteering = 0;
    this.pointerSide = 0;
    this.pointerIntensity = 0;
    this.clickStartTime = 0;
    this.emit();
  };

  private handleMouseLeave = (event: MouseEvent) => {
    if (!this.pointerActive || this.suppressInitialPointer) {
      return;
    }
    event.preventDefault();
    this.accelerating = false;
    this.pointerActive = false;
    this.pointerSteering = 0;
    this.pointerSide = 0;
    this.pointerIntensity = 0;
    this.clickStartTime = 0;
    this.emit();
  };

  private handleTouchStart = (event: TouchEvent) => {
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    if (this.suppressInitialPointer) {
      this.suppressInitialPointer = false;
    } else {
      this.accelerating = true;
      this.pointerActive = true;
      this.clickStartTime = performance.now();
      this.updatePointerSteering(touch.clientX);
    }
    this.emit();
  };

  private handleTouchMove = (event: TouchEvent) => {
    if (!this.pointerActive || this.suppressInitialPointer) {
      return;
    }
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    this.updatePointerSteering(touch.clientX);
    this.emit();
  };

  private handleTouchEnd = (event: TouchEvent) => {
    event.preventDefault();
    this.accelerating = false;
    this.pointerActive = false;
    this.suppressInitialPointer = false;
    this.pointerSteering = 0;
    this.pointerSide = 0;
    this.pointerIntensity = 0;
    this.clickStartTime = 0;
    this.emit();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case "Space":
      case "Enter":
      case "ArrowUp":
      case "KeyW":
        event.preventDefault();
        if (!this.accelerating) {
          this.accelerating = true;
          this.emit();
        }
        break;
      case "ArrowLeft":
      case "KeyA":
        event.preventDefault();
        this.leftActive = true;
        this.emit();
        break;
      case "ArrowRight":
      case "KeyD":
        event.preventDefault();
        this.rightActive = true;
        this.emit();
        break;
      default:
        break;
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case "Space":
      case "Enter":
      case "ArrowUp":
      case "KeyW":
        event.preventDefault();
        if (this.accelerating) {
          this.accelerating = false;
          this.emit();
        }
        break;
      case "ArrowLeft":
      case "KeyA":
        event.preventDefault();
        if (this.leftActive) {
          this.leftActive = false;
          this.emit();
        }
        break;
      case "ArrowRight":
      case "KeyD":
        event.preventDefault();
        if (this.rightActive) {
          this.rightActive = false;
          this.emit();
        }
        break;
      default:
        break;
    }
  };
}
