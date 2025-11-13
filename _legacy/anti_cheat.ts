import { Player, Position } from "../rooms/schema/DriftState";

interface PlayerUpdateMessage {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    velocity: number;
    timestamp: number;
    isOnTrack: boolean;
}

interface ValidationRule {
    name: string;
    maxViolations: number;
    windowMs: number;
    enabled: boolean;
}

interface PlayerValidationData {
    playerId: string;
    lastPosition: Position;
    lastVelocity: number;
    lastTimestamp: number;
    inputHistory: Array<{
        timestamp: number;
        type: string;
    }>;
    violationHistory: Array<{
        rule: string;
        timestamp: number;
        severity: 'low' | 'medium' | 'high';
        details: any;
    }>;
    warningCount: number;
    isSuspicious: boolean;
    lastWarningTime: number;
}

export class AntiCheat {
    private validationData: Map<string, PlayerValidationData> = new Map();
    private config = {
        maxVelocity: 35,           // Maximum allowed velocity (u/s)
        maxAcceleration: 15,       // Maximum allowed acceleration (u/s²)
        maxPositionJump: 5,        // Maximum position change per tick (units)
        maxInputRate: 50,          // Maximum inputs per second
        maxYawRate: Math.PI * 3,   // Maximum yaw rate (rad/s)
        teleportThreshold: 20,     // Distance that constitutes teleporting
        stuckThreshold: 0.1,       // Minimum movement to avoid "stuck" detection
        validationWindow: 5000,    // Time window for violations (ms)
    };

    private rules: ValidationRule[] = [
        { name: 'velocity', maxViolations: 3, windowMs: 5000, enabled: true },
        { name: 'acceleration', maxViolations: 5, windowMs: 3000, enabled: true },
        { name: 'teleport', maxViolations: 2, windowMs: 10000, enabled: true },
        { name: 'input_rate', maxViolations: 10, windowMs: 1000, enabled: true },
        { name: 'position_jump', maxViolations: 5, windowMs: 2000, enabled: true },
        { name: 'yaw_rate', maxViolations: 8, windowMs: 3000, enabled: true },
        { name: 'stuck_detection', maxViolations: 1, windowMs: 30000, enabled: true }
    ];

    public validatePosition(playerId: string, update: PlayerUpdateMessage, player: Player): boolean {
        // Get or create validation data
        let data = this.validationData.get(playerId);
        if (!data) {
            data = this.initializePlayerData(playerId);
            this.validationData.set(playerId, data);
        }

        const now = Date.now();
        const deltaTime = data.lastTimestamp > 0 ? (update.timestamp - data.lastTimestamp) / 1000 : 0;

        // Skip validation for first update or if too much time has passed
        if (deltaTime <= 0 || deltaTime > 1.0) {
            this.updatePlayerData(data, update);
            return true;
        }

        let isValid = true;
        const violations: Array<{ rule: string; severity: 'low' | 'medium' | 'high'; details: any }> = [];

        // 1. Velocity validation
        if (this.isRuleEnabled('velocity')) {
            if (update.velocity > this.config.maxVelocity) {
                violations.push({
                    rule: 'velocity',
                    severity: 'high',
                    details: { velocity: update.velocity, max: this.config.maxVelocity }
                });
                isValid = false;
            }
        }

        // 2. Acceleration validation
        if (this.isRuleEnabled('acceleration') && data.lastVelocity > 0) {
            const acceleration = Math.abs(update.velocity - data.lastVelocity) / deltaTime;
            if (acceleration > this.config.maxAcceleration) {
                violations.push({
                    rule: 'acceleration',
                    severity: 'medium',
                    details: { 
                        acceleration, 
                        max: this.config.maxAcceleration,
                        velocityChange: update.velocity - data.lastVelocity,
                        deltaTime 
                    }
                });
                // Don't fail immediately for acceleration, just warn
            }
        }

        // 3. Position jump validation
        if (this.isRuleEnabled('position_jump') && data.lastPosition) {
            const distance = this.calculateDistance(update.position, data.lastPosition);
            const expectedMaxDistance = this.config.maxVelocity * deltaTime * 1.5; // 50% tolerance
            
            if (distance > expectedMaxDistance && distance > this.config.maxPositionJump) {
                violations.push({
                    rule: 'position_jump',
                    severity: 'high',
                    details: { 
                        distance, 
                        expected: expectedMaxDistance,
                        deltaTime,
                        from: data.lastPosition,
                        to: update.position
                    }
                });
                isValid = false;
            }
        }

        // 4. Teleport detection
        if (this.isRuleEnabled('teleport') && data.lastPosition) {
            const distance = this.calculateDistance(update.position, data.lastPosition);
            if (distance > this.config.teleportThreshold) {
                violations.push({
                    rule: 'teleport',
                    severity: 'high',
                    details: { 
                        distance, 
                        threshold: this.config.teleportThreshold,
                        from: data.lastPosition,
                        to: update.position
                    }
                });
                isValid = false;
            }
        }

        // 5. Yaw rate validation (if rotation data is available)
        if (this.isRuleEnabled('yaw_rate') && player.rotation && data.lastTimestamp > 0) {
            const currentYaw = update.rotation.y;
            const lastYaw = player.rotation.y;
            const yawChange = this.normalizeAngle(currentYaw - lastYaw);
            const yawRate = Math.abs(yawChange) / deltaTime;
            
            if (yawRate > this.config.maxYawRate) {
                violations.push({
                    rule: 'yaw_rate',
                    severity: 'medium',
                    details: { 
                        yawRate, 
                        max: this.config.maxYawRate,
                        yawChange,
                        deltaTime
                    }
                });
                // Don't fail for yaw rate, cars can turn quickly
            }
        }

        // 6. Stuck detection (player not moving for too long)
        if (this.isRuleEnabled('stuck_detection') && data.lastPosition) {
            const distance = this.calculateDistance(update.position, data.lastPosition);
            if (distance < this.config.stuckThreshold && update.velocity > 5) {
                // Player claims to be moving but position barely changes
                violations.push({
                    rule: 'stuck_detection',
                    severity: 'low',
                    details: { 
                        distance, 
                        velocity: update.velocity,
                        threshold: this.config.stuckThreshold
                    }
                });
            }
        }

        // Process violations
        if (violations.length > 0) {
            this.processViolations(data, violations, now);
            
            // Check if player should be flagged
            const recentViolations = this.getRecentViolations(data, now);
            if (recentViolations.length > 10) {
                data.isSuspicious = true;
                console.warn(`🚨 Player ${playerId} flagged as suspicious: ${recentViolations.length} recent violations`);
            }
        }

        // Update player data for next validation
        if (isValid) {
            this.updatePlayerData(data, update);
        }

        // Log violations for monitoring
        if (violations.length > 0 && (now - data.lastWarningTime) > 5000) {
            console.warn(`⚠️ AntiCheat violations for ${playerId}:`, violations.map(v => v.rule));
            data.lastWarningTime = now;
        }

        return isValid;
    }

    public validateInputRate(playerId: string, timestamp: number): boolean {
        let data = this.validationData.get(playerId);
        if (!data) {
            data = this.initializePlayerData(playerId);
            this.validationData.set(playerId, data);
        }

        const now = Date.now();
        
        // Add input to history
        data.inputHistory.push({ timestamp: now, type: 'input' });
        
        // Clean old inputs (older than 1 second)
        data.inputHistory = data.inputHistory.filter(input => 
            (now - input.timestamp) < 1000
        );
        
        // Check input rate
        if (data.inputHistory.length > this.config.maxInputRate) {
            this.addViolation(data, {
                rule: 'input_rate',
                severity: 'medium',
                details: { 
                    rate: data.inputHistory.length,
                    max: this.config.maxInputRate,
                    window: 1000
                }
            }, now);
            
            return false;
        }
        
        return true;
    }

    public getPlayerTrustScore(playerId: string): number {
        const data = this.validationData.get(playerId);
        if (!data) return 1.0; // New players start with full trust
        
        const now = Date.now();
        const recentViolations = this.getRecentViolations(data, now);
        const totalViolations = data.violationHistory.length;
        
        // Calculate trust score (0.0 to 1.0)
        let trustScore = 1.0;
        
        // Reduce trust based on recent violations
        trustScore -= recentViolations.length * 0.05;
        
        // Reduce trust based on total violations
        trustScore -= Math.min(totalViolations * 0.02, 0.3);
        
        // Heavily penalize if flagged as suspicious
        if (data.isSuspicious) {
            trustScore -= 0.4;
        }
        
        return Math.max(trustScore, 0.0);
    }

    public isPlayerSuspicious(playerId: string): boolean {
        const data = this.validationData.get(playerId);
        return data?.isSuspicious || false;
    }

    public getPlayerViolations(playerId: string): any[] {
        const data = this.validationData.get(playerId);
        if (!data) return [];
        
        const now = Date.now();
        return this.getRecentViolations(data, now);
    }

    public resetPlayer(playerId: string): void {
        this.validationData.delete(playerId);
    }

    public updateConfig(newConfig: Partial<typeof this.config>): void {
        this.config = { ...this.config, ...newConfig };
    }

    private initializePlayerData(playerId: string): PlayerValidationData {
        return {
            playerId,
            lastPosition: { x: 0, y: 0, z: 0 },
            lastVelocity: 0,
            lastTimestamp: 0,
            inputHistory: [],
            violationHistory: [],
            warningCount: 0,
            isSuspicious: false,
            lastWarningTime: 0
        };
    }

    private updatePlayerData(data: PlayerValidationData, update: PlayerUpdateMessage): void {
        data.lastPosition = { ...update.position };
        data.lastVelocity = update.velocity;
        data.lastTimestamp = update.timestamp;
    }

    private processViolations(data: PlayerValidationData, violations: any[], timestamp: number): void {
        for (const violation of violations) {
            this.addViolation(data, violation, timestamp);
        }
    }

    private addViolation(data: PlayerValidationData, violation: any, timestamp: number): void {
        data.violationHistory.push({
            ...violation,
            timestamp
        });
        
        // Clean old violations
        data.violationHistory = data.violationHistory.filter(v => 
            (timestamp - v.timestamp) < this.config.validationWindow * 2
        );
        
        // Check if rule violation threshold is exceeded
        const rule = this.rules.find(r => r.name === violation.rule);
        if (rule) {
            const recentRuleViolations = data.violationHistory.filter(v => 
                v.rule === violation.rule && 
                (timestamp - v.timestamp) < rule.windowMs
            );
            
            if (recentRuleViolations.length >= rule.maxViolations) {
                data.warningCount++;
                if (data.warningCount >= 3) {
                    data.isSuspicious = true;
                }
            }
        }
    }

    private getRecentViolations(data: PlayerValidationData, timestamp: number): any[] {
        return data.violationHistory.filter(v => 
            (timestamp - v.timestamp) < this.config.validationWindow
        );
    }

    private isRuleEnabled(ruleName: string): boolean {
        const rule = this.rules.find(r => r.name === ruleName);
        return rule?.enabled || false;
    }

    private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    private normalizeAngle(angle: number): number {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    // Admin/Debug methods
    public getStatistics(): any {
        const totalPlayers = this.validationData.size;
        const suspiciousPlayers = Array.from(this.validationData.values())
            .filter(data => data.isSuspicious).length;
        
        const allViolations = Array.from(this.validationData.values())
            .flatMap(data => data.violationHistory);
        
        const violationsByRule = this.rules.reduce((acc, rule) => {
            acc[rule.name] = allViolations.filter(v => v.rule === rule.name).length;
            return acc;
        }, {} as Record<string, number>);
        
        return {
            totalPlayers,
            suspiciousPlayers,
            totalViolations: allViolations.length,
            violationsByRule,
            averageTrustScore: this.calculateAverageTrustScore()
        };
    }

    private calculateAverageTrustScore(): number {
        if (this.validationData.size === 0) return 1.0;
        
        const totalTrust = Array.from(this.validationData.keys())
            .reduce((sum, playerId) => sum + this.getPlayerTrustScore(playerId), 0);
        
        return totalTrust / this.validationData.size;
    }

    public enableRule(ruleName: string, enabled: boolean): void {
        const rule = this.rules.find(r => r.name === ruleName);
        if (rule) {
            rule.enabled = enabled;
        }
    }

    public dispose(): void {
        this.validationData.clear();
    }
}