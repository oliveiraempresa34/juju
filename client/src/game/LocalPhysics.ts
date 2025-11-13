import { Vector3 } from "@babylonjs/core";
import type { TrackGenerator, TrackSample } from "./TrackGenerator";

export interface PlayerInputState {
  accelerate: boolean;
  steering: number;
  drifting?: boolean;
  driftDirection?: number;
  intensity?: number;
  pointerActive?: boolean; // Indica se o usuário está clicando
  clickHoldTime?: number; // Tempo que o clique está sendo mantido
}

interface LocalPlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number; // Direção do carro
  velocity: number; // Velocidade constante

  // Sistema bidirecional
  turningDirection: number; // -1 = esquerda, 0 = reto, 1 = direita
  turnStrength: number; // Intensidade da curva (0-1)

  // Sistema de inércia angular para suavidade
  angularVelocity: number; // Velocidade angular atual do carro
  targetAngularVelocity: number; // Velocidade angular desejada

  // Sistema de deriva visual suave
  visualDriftAngle: number; // Ângulo visual atual de deriva
  targetDriftAngle: number; // Ângulo visual alvo de deriva

  // Estado visual e físico
  pitch: number;
  roll: number;
  distance: number;
  gameOver: boolean;
  crashed: boolean;
  lastSyncDistance: number;

  // Buffer para suavização adicional da câmera
  smoothedX: number;
  smoothedY: number;
  smoothedZ: number;
  smoothedYaw: number;
}

const DEFAULT_INPUT: PlayerInputState = { accelerate: false, steering: 0, drifting: false, driftDirection: 0, intensity: 0 };

export class LocalPhysics {
  private state: LocalPlayerState;
  private lastUpdate: number;
  private input: PlayerInputState;
  private track?: TrackGenerator;
  private positionCache?: Vector3;

  constructor(track?: TrackGenerator) {
    this.track = track;
    this.state = this.createInitialState();
    this.lastUpdate = performance.now();
    this.input = { ...DEFAULT_INPUT };
  }

  setTrack(track: TrackGenerator) {
    this.track = track;
  }

  setInput(input: PlayerInputState) {
    const clampedSteering = Math.max(-1, Math.min(1, input.steering));
    const normalizedIntensity = typeof input.intensity === "number"
      ? Math.max(0, Math.min(1, input.intensity))
      : Math.abs(clampedSteering);

    this.input = {
      accelerate: input.accelerate,
      steering: clampedSteering,
      drifting: input.drifting,
      driftDirection: input.driftDirection,
      intensity: normalizedIntensity
    };
  }

  update() {
    const now = performance.now();
    let deltaTime = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    if (deltaTime <= 0 || this.state.gameOver) {
      return this.getPublicState();
    }

    // Limitar deltaTime para evitar picos mas permitir frames rápidos
    deltaTime = Math.max(0.001, Math.min(deltaTime, 0.1)); // Entre 1ms e 100ms

    // VALIDAÇÃO INICIAL: garantir que Y nunca seja inválido
    if (!isFinite(this.state.y) || isNaN(this.state.y) || this.state.y < 0) {
      this.state.y = 1.0; // Altura de segurança
    }

    // Boost de 50% na rotação quando clique mantido por mais de 0.3s
    const clickHoldTime = this.input.clickHoldTime || 0;
    const turnBoost = clickHoldTime > 0.3 ? 1.5 : 1.0;

    // Sistema de velocidade progressiva: +2% a cada 150 pontos
    const baseSpeed = 19;
    const speedIncreasePerMilestone = 0.02; // 2%
    const milestoneDistance = 150;
    const maxSpeedMultiplier = 1.30; // Limite de 30% de aumento

    const distanceMilestones = Math.floor(this.state.distance / milestoneDistance);
    const speedMultiplier = Math.min(1 + (distanceMilestones * speedIncreasePerMilestone), maxSpeedMultiplier);

    const config = {
      constantSpeed: baseSpeed * speedMultiplier, // Velocidade aumenta com a distância
      driftSpeed: (baseSpeed - 2) * speedMultiplier, // Drift também acelera proporcionalmente
      maxTurnRate: (Math.PI / 4.5) * turnBoost, // ~40° base, ~60° com boost (+50%)
      turnAcceleration: 1.15,
      turnDeceleration: 0.18,
      angularAcceleration: 1.1,
      angularDeceleration: 0.32,

      // Configurações de drift mais responsivas
      maxDriftAngle: Math.PI / 3.5, // ~51° para drift mais agressivo
      driftAcceleration: 1.25,
      driftDeceleration: 0.5,

      rollResponse: 1.4,
      pitchResponse: 1.15
    };

    const CAR_HALF_WIDTH = 0.7;

    // 1. Sistema de controle bidirecional baseado no steering e drift ativo
    const steeringInput = this.input.steering || 0; // Valor contínuo -1..1
    const steeringMagnitude = Math.min(1, Math.abs(steeringInput));
    const inputIntensity = Math.max(steeringMagnitude, this.input.intensity ?? 0);
    const effectiveIntensity = Math.max(0.25, inputIntensity);
    const isDrifting = this.input.drifting || effectiveIntensity > 0.15;
    const driftDirection = this.input.driftDirection ?? (steeringInput === 0 ? 0 : Math.sign(steeringInput));

    if (isDrifting && Math.abs(driftDirection) > 0) {
      // Driftando ativamente para um lado
      this.state.turningDirection = Math.sign(driftDirection);
      this.state.turnStrength = Math.min(1.25, this.state.turnStrength + config.turnAcceleration * effectiveIntensity * deltaTime);
      this.state.velocity = config.driftSpeed; // Velocidade levemente reduzida ao driftar

      // Definir velocidade angular alvo de forma progressiva (curva suave)
      const intensityBoost = 0.6 + effectiveIntensity * 0.7;
      const progressiveTurnRate = config.maxTurnRate * Math.pow(this.state.turnStrength, 1.35) * intensityBoost * this.state.turningDirection;
      this.state.targetAngularVelocity = progressiveTurnRate;

      // Definir ângulo de deriva visual alvo baseado na intensidade e direção da curva
      this.state.targetDriftAngle = config.maxDriftAngle * Math.min(1.1, this.state.turnStrength * intensityBoost) * this.state.turningDirection;
    } else {
      // Não driftando = para de virar MUITO LENTAMENTE + velocidade normal
      this.state.turningDirection = 0;
      this.state.turnStrength = Math.max(0.0, this.state.turnStrength - config.turnDeceleration * deltaTime);
      this.state.velocity = config.constantSpeed; // Velocidade normal

      // Velocidade angular alvo = 0 quando não driftando (mudança ultra gradual)
      this.state.targetAngularVelocity = 0;

      // Deriva visual alvo = 0 quando não driftando (retorno ultra suave)
      this.state.targetDriftAngle = 0;
    }

    // 2. Sistema de inércia angular extremamente suave para transição ultra natural
    const angularDiff = this.state.targetAngularVelocity - this.state.angularVelocity;

    if (Math.abs(angularDiff) > 0.001) {
      // Usar interpolação ultra suave com limitação extrema
      const changeRate = isDrifting ? config.angularAcceleration : config.angularDeceleration;
      const maxChange = changeRate * deltaTime;

      // Suavização consistente
      const smoothingFactor = isDrifting ? 0.12 : 0.08; // Mais consistente
      const actualChange = Math.sign(angularDiff) * Math.min(Math.abs(angularDiff) * smoothingFactor, maxChange);
      this.state.angularVelocity += actualChange;

      // Limitar velocidade angular máxima
      this.state.angularVelocity = Math.max(-config.maxTurnRate, Math.min(config.maxTurnRate, this.state.angularVelocity));

      // Damping moderado
      this.state.angularVelocity *= 0.97;
    }

    // 3. Sistema de deriva visual suave
    const driftDiff = this.state.targetDriftAngle - this.state.visualDriftAngle;

    if (Math.abs(driftDiff) > 0.001) {
      // Suavização consistente para deriva visual
      const driftChangeRate = isDrifting ? config.driftAcceleration : config.driftDeceleration;
      const maxDriftChange = driftChangeRate * deltaTime;

      // Suavização moderada e consistente
      const driftSmoothingFactor = isDrifting ? 0.12 : 0.08; // Mais consistente
      const actualDriftChange = Math.sign(driftDiff) * Math.min(Math.abs(driftDiff) * driftSmoothingFactor, maxDriftChange);
      this.state.visualDriftAngle += actualDriftChange;

      // Damping moderado
      this.state.visualDriftAngle *= 0.97;
    }

    // 4. Aplicar rotação baseada na velocidade angular atual (suave)
    if (Math.abs(this.state.angularVelocity) > 0.001) {
      this.state.yaw += this.state.angularVelocity * deltaTime;
    }

    this.state.yaw = this.normalizeAngle(this.state.yaw);

    // 4. Movimento direto baseado na direção atual
    const direction = new Vector3(
      Math.sin(this.state.yaw),
      0,
      Math.cos(this.state.yaw)
    );

    const travel = this.state.velocity * deltaTime;
    this.state.x += direction.x * travel;
    this.state.z += direction.z * travel;
    this.state.distance += travel;

    // Suavização adicional para câmera - incluindo visualDriftAngle
    const smoothFactor = 1 - Math.exp(-10.0 * deltaTime); // Suavização muito rápida
    this.state.smoothedX = this.state.smoothedX + (this.state.x - this.state.smoothedX) * smoothFactor;
    this.state.smoothedY = this.state.smoothedY + (this.state.y - this.state.smoothedY) * smoothFactor;
    this.state.smoothedZ = this.state.smoothedZ + (this.state.z - this.state.smoothedZ) * smoothFactor;

    // Suavizar o yaw COMPLETO (com deriva visual já aplicada)
    const fullYaw = this.normalizeAngle(this.state.yaw + this.state.visualDriftAngle);
    const yawDiff = this.normalizeAngle(fullYaw - this.state.smoothedYaw);
    this.state.smoothedYaw = this.normalizeAngle(this.state.smoothedYaw + yawDiff * smoothFactor);

    // 5. Atualizar posição na pista
    this.updateTrackPosition(deltaTime, CAR_HALF_WIDTH, config);

    return this.getPublicState();
  }

  // Método melhorado para atualizar posição na pista
  private updateTrackPosition(deltaTime: number, carHalfWidth: number, config: any) {
    // Sync track menos frequente para evitar stuttering
    if (this.track && this.state.distance - this.state.lastSyncDistance > 20) {
      this.track.syncToDistance(this.state.distance);
      this.state.lastSyncDistance = this.state.distance;
    }

    // Usar distance para obter a altura correta da pista
    const frame = this.track?.getSampleAtDistance(this.state.distance);

    if (frame && frame.position && typeof frame.position.y === 'number') {
      // SISTEMA ANTI-MERGULHO: SEMPRE ACIMA DA PISTA
      const ALTURA_CARRO = 0.8;
      const targetY = frame.position.y + ALTURA_CARRO;

      // Suavização consistente para subida E descida
      const yDiff = targetY - this.state.y;
      const yAdjustSpeed = 8.0; // Velocidade de ajuste consistente
      this.state.y += yDiff * Math.min(1, yAdjustSpeed * deltaTime);

      // Verificar colisões apenas se não estiver crashed (otimização)
      if (!this.state.crashed) {
        // Reusar Vector3 para evitar alocação
        if (!this.positionCache) {
          this.positionCache = new Vector3(this.state.x, this.state.y, this.state.z);
        } else {
          this.positionCache.set(this.state.x, this.state.y, this.state.z);
        }

        if (!this.track!.checkBounds(this.positionCache, carHalfWidth)) {
          this.triggerCrash();
        }
      }

      // Atualizar pitch e roll da pista suavemente
      const rightY = Math.max(-1, Math.min(1, frame.right.y));
      const trackRoll = Math.asin(rightY);
      this.state.roll += (trackRoll - this.state.roll) * config.rollResponse * deltaTime;

      const forwardXZ = Math.hypot(frame.forward.x, frame.forward.z);
      const trackPitch = forwardXZ < 1e-4 ? 0 : -Math.atan2(frame.forward.y, forwardXZ); // Inverter sinal para alinhar com subida

      // Limitar pitch máximo para evitar inclinações extremas
      const maxPitch = Math.PI / 6; // 30 graus máximo
      const limitedTrackPitch = Math.max(-maxPitch, Math.min(maxPitch, trackPitch));

      this.state.pitch += (limitedTrackPitch - this.state.pitch) * config.pitchResponse * deltaTime;
    }

    // Validação final simples (apenas casos extremos)
    if (!isFinite(this.state.y) || isNaN(this.state.y) || this.state.y < -5) {
      this.state.y = 1.0; // Reset apenas em casos críticos
    }
  }

  // Sistema removido - agora usa rearSlip diretamente

  private triggerCrash() {
    this.state.crashed = true;
    this.state.gameOver = true;
    this.state.velocity = 0;
  }

  private normalizeAngle(value: number) {
    let angle = value;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  private getPublicState() {
    // Usar deriva visual suavizada em vez de cálculo direto
    const visualYaw = this.state.yaw + this.state.visualDriftAngle;

    // Calcular intensidade baseada na deriva visual atual
    const driftIntensity = Math.abs(this.state.visualDriftAngle) / (Math.PI / 6); // Normalizar para 0-1

    // Fumaça sai sempre que qualquer lado da tela é clicado
    const shouldEmitSmoke = this.input.pointerActive || false;

    return {
      x: this.state.x,
      y: this.state.y,
      z: this.state.z,
      yaw: visualYaw, // Usar yaw visual com deriva ultra suave
      pitch: this.state.pitch,
      roll: this.state.roll,
      velocity: this.state.velocity,
      pressing: this.input.pointerActive || this.input.drifting || false, // Pressionando quando está clicando ou driftando
      isTurning: Math.abs(this.state.visualDriftAngle) > 0.05, // Baseado na deriva visual suave
      distance: this.state.distance,
      isDrifting: shouldEmitSmoke, // Fumaça sempre que clicar
      slipAngle: this.state.visualDriftAngle, // Ângulo baseado na deriva visual suavizada
      gameOver: this.state.gameOver,
      crashed: this.state.crashed
    };
  }

  getState() {
    return { ...this.state };
  }

  // Obter estado suavizado especificamente para a câmera
  getSmoothedCameraState() {
    return {
      x: this.state.smoothedX,
      y: this.state.smoothedY,
      z: this.state.smoothedZ,
      yaw: this.state.smoothedYaw, // Já inclui deriva visual aplicada na suavização
      crashed: this.state.crashed
    };
  }

  reset() {
    this.state = this.createInitialState();
    this.lastUpdate = performance.now();
    this.input = { ...DEFAULT_INPUT };
  }

  isGameOver() {
    return this.state.gameOver;
  }

  private createInitialState(): LocalPlayerState {
    return {
      x: 0,
      y: 0.3,
      z: 0,
      yaw: 0,
      velocity: 0,

      // Sistema bidirecional
      turningDirection: 0,
      turnStrength: 0,

      // Sistema de inércia angular
      angularVelocity: 0,
      targetAngularVelocity: 0,

      // Sistema de deriva visual suave
      visualDriftAngle: 0,
      targetDriftAngle: 0,

      // Estado visual e físico
      pitch: 0,
      roll: 0,
      distance: 0,
      gameOver: false,
      crashed: false,
      lastSyncDistance: 0,

      // Buffer para suavização adicional da câmera
      smoothedX: 0,
      smoothedY: 0.3,
      smoothedZ: 0,
      smoothedYaw: 0
    };
  }
}
