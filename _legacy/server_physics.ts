import { Player, Position, Rotation } from "../rooms/schema/DriftState";

interface PhysicsConfig {
    maxVelocityBase: number;
    acceleration: number;
    driftFactor: number;
    slipDamping: number;
    yawRateMax: number;
    driftThreshold: number;
    recoveryDamping: number;
    overSteer: number;
    lateralForceMax: number;
    velocityInfluence: number;
}

interface CarState {
    position: Position;
    rotation: Rotation;
    velocity: number;
    velocityVector: { x: number; y: number; z: number };
    heading: number;
    yawRate: number;
    slipAngle: number;
    driftAngle: number;
    isDrifting: boolean;
    driftDuration: number;
    acceleration: number;
    isOnTrack: boolean;
}

export class Physics {
    private config: PhysicsConfig = {
        maxVelocityBase: 22,      // u/s
        acceleration: 6,          // u/s²
        driftFactor: 0.85,
        slipDamping: 8,           // s⁻¹
        yawRateMax: Math.PI * 2,  // 120° in rad/s
        driftThreshold: Math.PI / 36, // 5° in radians
        recoveryDamping: 0.85,
        overSteer: 0.15,
        lateralForceMax: 15,
        velocityInfluence: 0.3
    };

    private playerStates: Map<string, CarState> = new Map();
    private inputHoldTimes: Map<string, number> = new Map();

    public updatePlayer(player: Player, deltaTime: number): Partial<Player> {
        // Get or initialize player state
        let carState = this.playerStates.get(player.id);
        if (!carState) {
            carState = this.initializeCarState(player);
            this.playerStates.set(player.id, carState);
        }

        // Update input hold time
        const holdTime = this.inputHoldTimes.get(player.id) || 0;
        if (player.inputPressed) {
            this.inputHoldTimes.set(player.id, holdTime + deltaTime);
        } else {
            this.inputHoldTimes.set(player.id, 0);
        }

        // Update physics
        this.updateVelocity(carState, deltaTime);
        this.updateDrift(carState, deltaTime, player.inputPressed, holdTime);
        this.updatePosition(carState, deltaTime);
        this.updateRotation(carState, deltaTime);

        // Validate bounds
        this.validateBounds(carState);

        // Update player object
        player.position.x = carState.position.x;
        player.position.y = carState.position.y;
        player.position.z = carState.position.z;
        player.rotation.x = carState.rotation.x;
        player.rotation.y = carState.rotation.y;
        player.rotation.z = carState.rotation.z;
        player.velocity = carState.velocity;

        // Update distance
        const distance = Math.sqrt(
            carState.position.x ** 2 + carState.position.z ** 2
        );
        
        if (distance > player.distance) {
            player.distance = distance;
        }

        return {
            position: player.position,
            rotation: player.rotation,
            velocity: player.velocity,
            distance: player.distance
        };
    }

    private initializeCarState(player: Player): CarState {
        return {
            position: { ...player.position },
            rotation: { ...player.rotation },
            velocity: 2, // Start with small forward velocity
            velocityVector: { x: 0, y: 0, z: 2 },
            heading: 0,
            yawRate: 0,
            slipAngle: 0,
            driftAngle: 0,
            isDrifting: false,
            driftDuration: 0,
            acceleration: 0,
            isOnTrack: true
        };
    }

    private updateVelocity(carState: CarState, deltaTime: number): void {
        // Calculate target velocity with progression
        const difficultyMultiplier = 1.0 + Math.floor(carState.position.z / 300) * 0.05;
        const targetVelocity = this.config.maxVelocityBase * Math.min(difficultyMultiplier, 1.5);

        // Automatic acceleration
        if (carState.velocity < targetVelocity) {
            carState.acceleration = this.config.acceleration;
            carState.velocity += carState.acceleration * deltaTime;
            carState.velocity = Math.min(carState.velocity, targetVelocity);
        } else {
            carState.acceleration = 0;
        }

        // Velocity loss during extreme drift
        if (Math.abs(carState.slipAngle) > Math.PI / 7.2) { // 25°
            const velocityLoss = 0.95;
            carState.velocity *= Math.pow(velocityLoss, deltaTime);
        }
    }

    private updateDrift(carState: CarState, deltaTime: number, isPressed: boolean, holdTime: number): void {
        if (isPressed) {
            this.applyDriftInput(carState, deltaTime, holdTime);
        } else {
            this.applyRecovery(carState, deltaTime);
        }

        // Calculate slip angle
        const velocityDirection = Math.atan2(carState.velocityVector.x, carState.velocityVector.z);
        carState.slipAngle = this.normalizeAngle(velocityDirection - carState.heading);
        carState.driftAngle = Math.abs(carState.slipAngle);

        // Update drift state
        carState.isDrifting = carState.driftAngle > this.config.driftThreshold;
        
        if (carState.isDrifting) {
            carState.driftDuration += deltaTime;
        } else {
            carState.driftDuration = 0;
        }
    }

    private applyDriftInput(carState: CarState, deltaTime: number, holdTime: number): void {
        // Calculate drift intensity
        const holdFactor = Math.min(holdTime / 0.5, 1.0); // Max after 0.5s
        const velocityFactor = carState.velocity / this.config.maxVelocityBase;
        const driftIntensity = holdFactor * this.config.driftFactor * (0.7 + 0.3 * velocityFactor);

        // Apply yaw rate (turn to the right)
        const targetYawRate = this.config.yawRateMax * driftIntensity;
        carState.yawRate = this.lerp(carState.yawRate, targetYawRate, 8.0 * deltaTime);

        // Apply lateral force
        const lateralForce = this.config.lateralForceMax * driftIntensity;
        const rightDirection = {
            x: Math.cos(carState.heading),
            y: 0,
            z: -Math.sin(carState.heading)
        };

        // Add lateral velocity component
        const currentLateralSpeed = this.dotProduct(carState.velocityVector, rightDirection);
        const targetLateralSpeed = lateralForce * this.config.velocityInfluence;
        const lateralAccel = (targetLateralSpeed - currentLateralSpeed) * 6.0;

        carState.velocityVector.x += rightDirection.x * lateralAccel * deltaTime;
        carState.velocityVector.z += rightDirection.z * lateralAccel * deltaTime;
    }

    private applyRecovery(carState: CarState, deltaTime: number): void {
        // Exponential damping of yaw rate
        carState.yawRate *= Math.pow(this.config.recoveryDamping, deltaTime);

        // Apply slip damping with oversteer
        const dampingFactor = Math.pow(1.0 / (1.0 + this.config.slipDamping * deltaTime), 1.0);
        const oversteerFactor = 1.0 + this.config.overSteer;

        // Decompose velocity
        const forwardDirection = {
            x: Math.sin(carState.heading),
            y: 0,
            z: Math.cos(carState.heading)
        };

        const rightDirection = {
            x: Math.cos(carState.heading),
            y: 0,
            z: -Math.sin(carState.heading)
        };

        const forwardSpeed = this.dotProduct(carState.velocityVector, forwardDirection);
        const lateralSpeed = this.dotProduct(carState.velocityVector, rightDirection);

        // Damp lateral velocity
        const dampedLateralSpeed = lateralSpeed * dampingFactor;

        // Reconstruct velocity vector
        carState.velocityVector.x = forwardDirection.x * forwardSpeed + rightDirection.x * dampedLateralSpeed;
        carState.velocityVector.z = forwardDirection.z * forwardSpeed + rightDirection.z * dampedLateralSpeed;
    }

    private updatePosition(carState: CarState, deltaTime: number): void {
        // Update position based on velocity vector
        carState.position.x += carState.velocityVector.x * deltaTime;
        carState.position.z += carState.velocityVector.z * deltaTime;

        // Update velocity magnitude
        carState.velocity = Math.sqrt(
            carState.velocityVector.x ** 2 + 
            carState.velocityVector.y ** 2 + 
            carState.velocityVector.z ** 2
        );

        // Keep Y position stable (simple ground constraint)
        carState.position.y = Math.max(carState.position.y, 0);
    }

    private updateRotation(carState: CarState, deltaTime: number): void {
        // Update heading based on yaw rate
        carState.heading += carState.yawRate * deltaTime;
        carState.heading = this.normalizeAngle(carState.heading);

        // Update mesh rotation
        carState.rotation.y = carState.heading;

        // Add slight roll during drift
        const rollAmount = Math.sign(carState.slipAngle) * Math.min(Math.abs(carState.slipAngle), Math.PI / 12);
        carState.rotation.z = rollAmount * 0.3; // Subtle roll

        // Reset pitch
        carState.rotation.x = 0;
    }

    private validateBounds(carState: CarState): void {
        // Limit position to reasonable bounds
        const maxDistance = 10000; // 10km max distance
        
        if (Math.abs(carState.position.x) > maxDistance) {
            carState.position.x = Math.sign(carState.position.x) * maxDistance;
        }
        
        if (Math.abs(carState.position.z) > maxDistance) {
            carState.position.z = Math.sign(carState.position.z) * maxDistance;
        }

        // Prevent falling through ground
        if (carState.position.y < -10) {
            carState.isOnTrack = false;
        }
    }

    // Utility methods
    private normalizeAngle(angle: number): number {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    private lerp(current: number, target: number, speed: number): number {
        return current + (target - current) * Math.min(speed, 1.0);
    }

    private dotProduct(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    // Public methods for game configuration
    public updateDifficulty(distance: number): void {
        const difficultyMultiplier = 1.0 + Math.floor(distance / 300) * 0.05;
        // Update physics config based on difficulty
        // This could modify drift factors, max velocity, etc.
    }

    public getPlayerState(playerId: string): CarState | undefined {
        return this.playerStates.get(playerId);
    }

    public resetPlayer(playerId: string): void {
        this.playerStates.delete(playerId);
        this.inputHoldTimes.delete(playerId);
    }

    public dispose(): void {
        this.playerStates.clear();
        this.inputHoldTimes.clear();
    }
}