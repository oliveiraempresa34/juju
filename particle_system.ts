import {
  Scene,
  ParticleSystem,
  Texture,
  Vector3,
  Color4,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Tools,
  Animation,
  AbstractMesh
} from '@babylonjs/core';
import { CarState } from './CarController';

interface TireTrail {
  mesh: Mesh;
  creationTime: number;
  positions: Vector3[];
}

export class ParticleSystemManager {
  private scene: Scene;
  private smokeParticleSystem: ParticleSystem | null = null;
  private sparkParticleSystem: ParticleSystem | null = null;
  private tireTrails: TireTrail[] = [];
  private currentTrail: TireTrail | null = null;
  
  private readonly config = {
    trailLifetime: 4000, // 4 seconds
    trailWidth: 0.3,
    maxTrails: 20,
    sparkThreshold: Tools.ToRadians(20), // Min drift angle for sparks
    smokeThreshold: Tools.ToRadians(10)  // Min drift angle for smoke
  };

  constructor(scene: Scene) {
    this.scene = scene;
    this.initializeParticleSystems();
  }

  private initializeParticleSystems(): void {
    this.createSmokeSystem();
    this.createSparkSystem();
  }

  private createSmokeSystem(): void {
    this.smokeParticleSystem = new ParticleSystem('driftSmoke', 150, this.scene);
    
    // Smoke texture - create a simple circular gradient
    const smokeTexture = new DynamicTexture('smokeTexture', { width: 64, height: 64 }, this.scene);
    const context = smokeTexture.getContext();
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(200,200,200,0.4)');
    gradient.addColorStop(1, 'rgba(100,100,100,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    smokeTexture.update();
    
    this.smokeParticleSystem.particleTexture = smokeTexture;
    
    // Emitter configuration
    this.smokeParticleSystem.emitRate = 50;
    this.smokeParticleSystem.minEmitBox = new Vector3(-0.2, 0, -0.3);
    this.smokeParticleSystem.maxEmitBox = new Vector3(0.2, 0, 0.3);
    
    // Particle properties
    this.smokeParticleSystem.color1 = new Color4(0.8, 0.8, 0.8, 0.6);
    this.smokeParticleSystem.color2 = new Color4(0.6, 0.6, 0.6, 0.4);
    this.smokeParticleSystem.colorDead = new Color4(0.4, 0.4, 0.4, 0);
    
    this.smokeParticleSystem.minSize = 0.5;
    this.smokeParticleSystem.maxSize = 1.2;
    
    this.smokeParticleSystem.minLifeTime = 0.8;
    this.smokeParticleSystem.maxLifeTime = 1.5;
    
    // Velocity and forces
    this.smokeParticleSystem.minEmitPower = 1;
    this.smokeParticleSystem.maxEmitPower = 3;
    this.smokeParticleSystem.updateSpeed = 0.02;
    
    this.smokeParticleSystem.direction1 = new Vector3(-0.5, 0.5, -0.5);
    this.smokeParticleSystem.direction2 = new Vector3(0.5, 1, 0.5);
    
    this.smokeParticleSystem.gravity = new Vector3(0, -2, 0);
    
    // Blending
    this.smokeParticleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    
    this.smokeParticleSystem.stop();
  }

  private createSparkSystem(): void {
    this.sparkParticleSystem = new ParticleSystem('driftSparks', 100, this.scene);
    
    // Spark texture - small bright dot
    const sparkTexture = new DynamicTexture('sparkTexture', { width: 32, height: 32 }, this.scene);
    const context = sparkTexture.getContext();
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,200,1)');
    gradient.addColorStop(0.6, 'rgba(255,200,100,0.8)');
    gradient.addColorStop(1, 'rgba(255,100,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    sparkTexture.update();
    
    this.sparkParticleSystem.particleTexture = sparkTexture;
    
    // Emitter configuration
    this.sparkParticleSystem.emitRate = 80;
    this.sparkParticleSystem.minEmitBox = new Vector3(-0.3, -0.1, -0.4);
    this.sparkParticleSystem.maxEmitBox = new Vector3(0.3, 0.1, 0.4);
    
    // Spark colors - bright orange to red
    this.sparkParticleSystem.color1 = new Color4(1, 0.8, 0.2, 1);
    this.sparkParticleSystem.color2 = new Color4(1, 0.4, 0.1, 1);
    this.sparkParticleSystem.colorDead = new Color4(0.5, 0.1, 0, 0);
    
    this.sparkParticleSystem.minSize = 0.1;
    this.sparkParticleSystem.maxSize = 0.3;
    
    this.sparkParticleSystem.minLifeTime = 0.2;
    this.sparkParticleSystem.maxLifeTime = 0.6;
    
    // Fast, chaotic movement
    this.sparkParticleSystem.minEmitPower = 3;
    this.sparkParticleSystem.maxEmitPower = 8;
    this.sparkParticleSystem.updateSpeed = 0.01;
    
    this.sparkParticleSystem.direction1 = new Vector3(-2, -0.5, -2);
    this.sparkParticleSystem.direction2 = new Vector3(2, 1, 2);
    
    this.sparkParticleSystem.gravity = new Vector3(0, -9.8, 0);
    
    // Additive blending for bright effect
    this.sparkParticleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
    
    this.sparkParticleSystem.stop();
  }

  public update(carState: CarState, deltaTime: number): void {
    this.updateParticleEmitters(carState);
    this.updateTireTrails(carState, deltaTime);
    this.cleanupOldTrails();
  }

  private updateParticleEmitters(carState: CarState): void {
    if (!this.smokeParticleSystem || !this.sparkParticleSystem) return;
    
    const isDrifting = carState.driftAngle > this.config.smokeThreshold;
    const isSparkingDrift = carState.driftAngle > this.config.sparkThreshold;
    
    // Position emitters at rear wheels
    const rearAxlePosition = carState.position.add(
      new Vector3(
        -Math.sin(carState.heading) * 1.2, // 1.2 units behind car center
        0.1, // Slightly above ground
        -Math.cos(carState.heading) * 1.2
      )
    );
    
    if (isDrifting) {
      // Start/update smoke
      this.smokeParticleSystem.emitter = rearAxlePosition;
      if (!this.smokeParticleSystem.isStarted()) {
        this.smokeParticleSystem.start();
      }
      
      // Adjust emission rate based on drift intensity
      const driftIntensity = Math.min(carState.driftAngle / Tools.ToRadians(30), 1.0);
      this.smokeParticleSystem.emitRate = 30 + driftIntensity * 70;
      
      // Adjust particle velocity based on car movement
      const carVelocityEffect = carState.velocityVector.scale(-0.5); // Opposite to car motion
      this.smokeParticleSystem.direction1 = new Vector3(-0.5, 0.5, -0.5).add(carVelocityEffect);
      this.smokeParticleSystem.direction2 = new Vector3(0.5, 1, 0.5).add(carVelocityEffect);
      
    } else {
      // Stop smoke
      if (this.smokeParticleSystem.isStarted()) {
        this.smokeParticleSystem.stop();
      }
    }
    
    if (isSparkingDrift) {
      // Start sparks for extreme drifts
      this.sparkParticleSystem.emitter = rearAxlePosition;
      if (!this.sparkParticleSystem.isStarted()) {
        this.sparkParticleSystem.start();
      }
      
      // Intense sparks during extreme drift
      const sparkIntensity = Math.min((carState.driftAngle - this.config.sparkThreshold) / Tools.ToRadians(15), 1.0);
      this.sparkParticleSystem.emitRate = sparkIntensity * 80;
      
    } else {
      // Stop sparks
      if (this.sparkParticleSystem.isStarted()) {
        this.sparkParticleSystem.stop();
      }
    }
  }

  private updateTireTrails(carState: CarState, deltaTime: number): void {
    const isDrifting = carState.driftAngle > Tools.ToRadians(8);
    
    if (isDrifting) {
      // Create or update tire trail
      if (!this.currentTrail) {
        this.currentTrail = this.createNewTrail();
      }
      
      // Add new position to current trail
      const rearLeftPos = this.getRearWheelPosition(carState, -0.7); // Left wheel
      const rearRightPos = this.getRearWheelPosition(carState, 0.7);  // Right wheel
      
      this.currentTrail.positions.push(rearLeftPos, rearRightPos);
      this.updateTrailMesh(this.currentTrail);
      
    } else {
      // End current trail
      if (this.currentTrail) {
        this.currentTrail = null;
      }
    }
  }

  private getRearWheelPosition(carState: CarState, lateralOffset: number): Vector3 {
    const carRight = new Vector3(
      Math.cos(carState.heading),
      0,
      -Math.sin(carState.heading)
    );
    
    const rearCenter = carState.position.add(
      new Vector3(
        -Math.sin(carState.heading) * 1.2,
        0.02, // Slightly above ground
        -Math.cos(carState.heading) * 1.2
      )
    );
    
    return rearCenter.add(carRight.scale(lateralOffset));
  }

  private createNewTrail(): TireTrail {
    const trailMesh = new Mesh('tireTrail', this.scene);
    
    // Create trail material
    const material = new StandardMaterial('trailMaterial', this.scene);
    material.diffuseColor = new Color4(0.1, 0.1, 0.1, 0.8).toColor3();
    material.alpha = 0.6;
    trailMesh.material = material;
    
    const trail: TireTrail = {
      mesh: trailMesh,
      creationTime: Date.now(),
      positions: []
    };
    
    this.tireTrails.push(trail);
    
    // Limit number of trails
    if (this.tireTrails.length > this.config.maxTrails) {
      const oldTrail = this.tireTrails.shift();
      if (oldTrail) {
        oldTrail.mesh.dispose();
      }
    }
    
    return trail;
  }

  private updateTrailMesh(trail: TireTrail): void {
    if (trail.positions.length < 4) return; // Need at least 2 wheel positions
    
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    
    // Create trail strip from wheel positions
    for (let i = 0; i < trail.positions.length - 1; i += 2) {
      const leftPos = trail.positions[i];
      const rightPos = trail.positions[i + 1];
      
      if (!leftPos || !rightPos) continue;
      
      const progress = (i / 2) / ((trail.positions.length - 1) / 2);
      
      // Add vertices
      vertices.push(leftPos.x, leftPos.y, leftPos.z);
      vertices.push(rightPos.x, rightPos.y, rightPos.z);
      
      // Add UVs
      uvs.push(0, progress);
      uvs.push(1, progress);
      
      // Add indices for triangles
      if (i > 0) {
        const baseIndex = (i / 2) * 2;
        indices.push(
          baseIndex - 2, baseIndex - 1, baseIndex,
          baseIndex - 1, baseIndex + 1, baseIndex
        );
      }
    }
    
    // Update mesh
    trail.mesh.setVerticesData('position', vertices);
    trail.mesh.setVerticesData('uv', uvs);
    trail.mesh.setIndices(indices);
    
    if (vertices.length > 0) {
      trail.mesh.createNormals(false);
    }
  }

  private cleanupOldTrails(): void {
    const currentTime = Date.now();
    const trailsToRemove: TireTrail[] = [];
    
    this.tireTrails.forEach((trail, index) => {
      const age = currentTime - trail.creationTime;
      
      if (age > this.config.trailLifetime) {
        trailsToRemove.push(trail);
      } else {
        // Fade out trail based on age
        const fadeProgress = age / this.config.trailLifetime;
        const alpha = Math.max(0, 0.6 * (1 - fadeProgress));
        
        if (trail.mesh.material && trail.mesh.material instanceof StandardMaterial) {
          trail.mesh.material.alpha = alpha;
        }
      }
    });
    
    // Remove expired trails
    trailsToRemove.forEach(trail => {
      const index = this.tireTrails.indexOf(trail);
      if (index > -1) {
        this.tireTrails.splice(index, 1);
        trail.mesh.dispose();
        
        if (this.currentTrail === trail) {
          this.currentTrail = null;
        }
      }
    });
  }

  public setIntensity(intensity: number): void {
    // Adjust particle system intensity (0-1)
    if (this.smokeParticleSystem) {
      this.smokeParticleSystem.emitRate = 30 + intensity * 70;
    }
    
    if (this.sparkParticleSystem) {
      this.sparkParticleSystem.emitRate = intensity * 80;
    }
  }

  public pauseEffects(): void {
    if (this.smokeParticleSystem?.isStarted()) {
      this.smokeParticleSystem.stop();
    }
    
    if (this.sparkParticleSystem?.isStarted()) {
      this.sparkParticleSystem.stop();
    }
  }

  public resumeEffects(): void {
    // Effects will resume automatically when conditions are met in update()
  }

  public dispose(): void {
    if (this.smokeParticleSystem) {
      this.smokeParticleSystem.dispose();
    }
    
    if (this.sparkParticleSystem) {
      this.sparkParticleSystem.dispose();
    }
    
    this.tireTrails.forEach(trail => {
      trail.mesh.dispose();
    });
    
    this.tireTrails = [];
    this.currentTrail = null;
  }
}