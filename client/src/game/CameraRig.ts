import { FreeCamera, Mesh, Scene, Vector3 } from "@babylonjs/core";

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export class CameraRig {
  private readonly camera: FreeCamera;

  // Posições em componentes separados para evitar alocações
  private currentX = 0;
  private currentY = 6;
  private currentZ = -10;

  private targetX = 0;
  private targetY = 6;
  private targetZ = -10;

  private lookAtX = 0;
  private lookAtY = 0;
  private lookAtZ = 50;

  private targetLookAtX = 0;
  private targetLookAtY = 0;
  private targetLookAtZ = 50;

  // Velocidades para smooth damping
  private velX = 0;
  private velY = 0;
  private velZ = 0;

  private velLookX = 0;
  private velLookY = 0;
  private velLookZ = 0;

  // Vector3 reutilizável (evita alocações)
  private readonly tempVec = Vector3.Zero();

  constructor(scene: Scene) {
    // Câmera posicionada atrás do carro
    this.camera = new FreeCamera("followCamera", new Vector3(0, 6, -10), scene);
    this.camera.fov = toRadians(75);
    scene.activeCamera = this.camera;

    // Modo de câmera otimizado
    this.camera.minZ = 0.1;
    this.camera.maxZ = 2000;
  }

  updateCameraPosition(carPosition: Vector3, carYaw: number, crashed: boolean, deltaTime: number = 1/60) {
    if (crashed) return;

    // Validação
    if (!isFinite(carPosition.x) || !isFinite(carPosition.y) || !isFinite(carPosition.z) || !isFinite(carYaw)) {
      return;
    }

    const distance = 14;
    const height = 8;
    const minAbsoluteHeight = 6;

    // Calcular posição alvo da câmera (atrás do carro)
    const sinYaw = Math.sin(carYaw);
    const cosYaw = Math.cos(carYaw);

    this.targetX = carPosition.x - sinYaw * distance;
    this.targetZ = carPosition.z - cosYaw * distance;
    this.targetY = Math.max(carPosition.y + height, minAbsoluteHeight);

    // Calcular ponto de look-at (à frente do carro)
    const lookAheadDistance = 25;
    this.targetLookAtX = carPosition.x + sinYaw * lookAheadDistance;
    this.targetLookAtZ = carPosition.z + cosYaw * lookAheadDistance;
    this.targetLookAtY = carPosition.y + 1;

    // Suavização direta (sem alocações)
    const lerpSpeed = 6.0;
    const lerpFactor = Math.min(1, lerpSpeed * deltaTime);

    // Interpolar posição da câmera
    this.currentX += (this.targetX - this.currentX) * lerpFactor;
    this.currentY += (this.targetY - this.currentY) * lerpFactor;
    this.currentZ += (this.targetZ - this.currentZ) * lerpFactor;

    // Interpolar look-at (mais lento)
    const lookLerpFactor = lerpFactor * 0.7;
    this.lookAtX += (this.targetLookAtX - this.lookAtX) * lookLerpFactor;
    this.lookAtY += (this.targetLookAtY - this.lookAtY) * lookLerpFactor;
    this.lookAtZ += (this.targetLookAtZ - this.lookAtZ) * lookLerpFactor;

    // Aplicar à câmera SEM criar novos Vector3
    this.camera.position.set(this.currentX, this.currentY, this.currentZ);

    // Usar setTarget de forma otimizada - reutilizar tempVec
    this.tempVec.set(this.lookAtX, this.lookAtY, this.lookAtZ);
    this.camera.setTarget(this.tempVec);
  }

  update(speed: number) {
    const minFov = 65;
    const maxFov = 80;
    const clamped = Math.max(0, Math.min(speed / 25, 1));
    const desired = minFov + (maxFov - minFov) * clamped;

    // Suavizar FOV também para evitar mudanças bruscas
    const currentFov = this.camera.fov / (Math.PI / 180);
    const newFov = currentFov + (desired - currentFov) * 0.1;
    this.camera.fov = toRadians(newFov);
  }

  dispose() {
    this.camera.dispose();
  }
}
