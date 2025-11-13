interface DifficultyTier {
    name: string;
    minDistance: number;
    maxVelocity: number;
    curveFrequency: number;
    curveIntensity: number;
    trackWidthMultiplier: number;
    scoreMultiplier: number;
    rightTurnBias: number;
    segmentVariations: string[];
}

interface DifficultyConfig {
    baseInterval: number;          // Distance interval for difficulty increases
    maxDifficultyDistance: number; // Distance where max difficulty is reached
    adaptiveScaling: boolean;      // Whether to use adaptive scaling
    playerCountScaling: boolean;   // Scale difficulty based on player count
}

export class Difficulty {
    private config: DifficultyConfig = {
        baseInterval: 300,          // Every 300 meters
        maxDifficultyDistance: 3000, // Max difficulty at 3km
        adaptiveScaling: true,
        playerCountScaling: true
    };

    private difficultyTiers: DifficultyTier[] = [
        {
            name: 'Beginner',
            minDistance: 0,
            maxVelocity: 22,
            curveFrequency: 0.3,     // 30% curves
            curveIntensity: 0.6,     // Gentle curves
            trackWidthMultiplier: 1.2, // Wider track
            scoreMultiplier: 1.0,
            rightTurnBias: 0.65,     // 65% right turns
            segmentVariations: ['straight_short', 'straight_long', 'curve_gentle_right', 'curve_gentle_left']
        },
        {
            name: 'Novice',
            minDistance: 300,
            maxVelocity: 25,
            curveFrequency: 0.4,
            curveIntensity: 0.7,
            trackWidthMultiplier: 1.1,
            scoreMultiplier: 1.2,
            rightTurnBias: 0.68,
            segmentVariations: ['straight_short', 'straight_long', 'curve_gentle_right', 'curve_gentle_left', 'curve_medium_right']
        },
        {
            name: 'Intermediate',
            minDistance: 600,
            maxVelocity: 28,
            curveFrequency: 0.5,
            curveIntensity: 0.8,
            trackWidthMultiplier: 1.0,
            scoreMultiplier: 1.5,
            rightTurnBias: 0.70,
            segmentVariations: ['straight_short', 'curve_gentle_right', 'curve_gentle_left', 'curve_medium_right', 'curve_medium_left', 's_curve_short']
        },
        {
            name: 'Advanced',
            minDistance: 1200,
            maxVelocity: 30,
            curveFrequency: 0.6,
            curveIntensity: 0.9,
            trackWidthMultiplier: 0.95,
            scoreMultiplier: 1.8,
            rightTurnBias: 0.72,
            segmentVariations: ['curve_gentle_right', 'curve_medium_right', 'curve_medium_left', 'hairpin_right', 's_curve_short', 's_curve_long']
        },
        {
            name: 'Expert',
            minDistance: 1800,
            maxVelocity: 32,
            curveFrequency: 0.7,
            curveIntensity: 1.0,
            trackWidthMultiplier: 0.9,
            scoreMultiplier: 2.2,
            rightTurnBias: 0.75,
            segmentVariations: ['curve_medium_right', 'curve_medium_left', 'hairpin_right', 'hairpin_left', 's_curve_long']
        },
        {
            name: 'Master',
            minDistance: 2400,
            maxVelocity: 35,
            curveFrequency: 0.8,
            curveIntensity: 1.1,
            trackWidthMultiplier: 0.85,
            scoreMultiplier: 2.5,
            rightTurnBias: 0.78,
            segmentVariations: ['curve_medium_right', 'hairpin_right', 'hairpin_left', 's_curve_long', 'split_decorative']
        },
        {
            name: 'Insane',
            minDistance: 3000,
            maxVelocity: 38,
            curveFrequency: 0.9,
            curveIntensity: 1.2,
            trackWidthMultiplier: 0.8,
            scoreMultiplier: 3.0,
            rightTurnBias: 0.80,
            segmentVariations: ['hairpin_right', 'hairpin_left', 's_curve_long', 'split_decorative']
        }
    ];

    private currentTier: DifficultyTier = this.difficultyTiers[0];
    private currentDistance: number = 0;
    private playerCount: number = 1;
    private adaptiveModifier: number = 1.0;

    public update(maxDistance: number, playerCount: number = 1): void {
        this.currentDistance = maxDistance;
        this.playerCount = playerCount;

        // Update current tier based on distance
        this.updateCurrentTier();

        // Calculate adaptive modifier
        if (this.config.adaptiveScaling) {
            this.updateAdaptiveModifier();
        }
    }

    private updateCurrentTier(): void {
        // Find the appropriate tier for current distance
        for (let i = this.difficultyTiers.length - 1; i >= 0; i--) {
            const tier = this.difficultyTiers[i];
            if (this.currentDistance >= tier.minDistance) {
                this.currentTier = tier;
                break;
            }
        }
    }

    private updateAdaptiveModifier(): void {
        // Base modifier starts at 1.0
        let modifier = 1.0;

        // Player count scaling
        if (this.config.playerCountScaling && this.playerCount > 1) {
            // Increase difficulty slightly with more players
            modifier += (this.playerCount - 1) * 0.05; // 5% per additional player
        }

        // Distance progression within tier
        const nextTierIndex = this.difficultyTiers.findIndex(tier => tier === this.currentTier) + 1;
        if (nextTierIndex < this.difficultyTiers.length) {
            const nextTier = this.difficultyTiers[nextTierIndex];
            const progressInTier = (this.currentDistance - this.currentTier.minDistance) / 
                                   (nextTier.minDistance - this.currentTier.minDistance);
            
            // Smooth transition between tiers
            modifier += Math.min(progressInTier, 1.0) * 0.1; // Up to 10% increase within tier
        }

        // Cap the modifier
        this.adaptiveModifier = Math.min(modifier, 2.0);
    }

    public getCurrentTier(): DifficultyTier {
        return this.currentTier;
    }

    public getTierName(): string {
        return this.currentTier.name;
    }

    public getMaxVelocity(): number {
        return this.currentTier.maxVelocity * this.adaptiveModifier;
    }

    public getCurveFrequency(): number {
        return Math.min(this.currentTier.curveFrequency * this.adaptiveModifier, 0.95);
    }

    public getCurveIntensity(): number {
        return this.currentTier.curveIntensity * this.adaptiveModifier;
    }

    public getTrackWidthMultiplier(): number {
        // Don't scale track width with adaptive modifier (for fairness)
        return this.currentTier.trackWidthMultiplier;
    }

    public getScoreMultiplier(): number {
        return this.currentTier.scoreMultiplier * this.adaptiveModifier;
    }

    public getRightTurnBias(): number {
        return Math.min(this.currentTier.rightTurnBias * this.adaptiveModifier, 0.85);
    }

    public getAvailableSegments(): string[] {
        return [...this.currentTier.segmentVariations];
    }

    public getDifficultyLevel(): number {
        // Return a 0-1 difficulty level for UI display
        const tierIndex = this.difficultyTiers.findIndex(tier => tier === this.currentTier);
        const maxTierIndex = this.difficultyTiers.length - 1;
        const baseDifficulty = tierIndex / maxTierIndex;
        
        // Add progression within tier
        const nextTierIndex = tierIndex + 1;
        if (nextTierIndex < this.difficultyTiers.length) {
            const nextTier = this.difficultyTiers[nextTierIndex];
            const progressInTier = (this.currentDistance - this.currentTier.minDistance) / 
                                   (nextTier.minDistance - this.currentTier.minDistance);
            
            return Math.min(baseDifficulty + (progressInTier / maxTierIndex), 1.0);
        }
        
        return baseDifficulty;
    }

    public getDifficultyDescription(): string {
        const level = this.getDifficultyLevel();
        const distance = this.currentDistance.toFixed(0);
        const tier = this.currentTier.name;
        
        let description = `${tier} (${distance}m)`;
        
        if (this.adaptiveModifier > 1.1) {
            description += ' - Enhanced';
        } else if (this.adaptiveModifier > 1.05) {
            description += ' - Moderate+';
        }
        
        return description;
    }

    public getNextMilestone(): { distance: number; tierName: string } | null {
        const currentTierIndex = this.difficultyTiers.findIndex(tier => tier === this.currentTier);
        const nextTierIndex = currentTierIndex + 1;
        
        if (nextTierIndex < this.difficultyTiers.length) {
            const nextTier = this.difficultyTiers[nextTierIndex];
            return {
                distance: nextTier.minDistance,
                tierName: nextTier.name
            };
        }
        
        return null; // Already at max tier
    }

    public getProgressToNextTier(): number {
        const nextMilestone = this.getNextMilestone();
        if (!nextMilestone) return 1.0; // At max tier
        
        const currentTierDistance = this.currentTier.minDistance;
        const nextTierDistance = nextMilestone.distance;
        
        return Math.min((this.currentDistance - currentTierDistance) / (nextTierDistance - currentTierDistance), 1.0);
    }

    // Segment selection with difficulty weighting
    public selectSegmentType(availableSegments: string[], rng: () => number): string {
        const segments = availableSegments.length > 0 ? availableSegments : this.getAvailableSegments();
        
        // Apply difficulty-based weighting
        const weightedSegments = segments.map(segment => ({
            type: segment,
            weight: this.calculateSegmentWeight(segment)
        }));
        
        // Weighted random selection
        const totalWeight = weightedSegments.reduce((sum, item) => sum + item.weight, 0);
        let randomValue = rng() * totalWeight;
        
        for (const item of weightedSegments) {
            randomValue -= item.weight;
            if (randomValue <= 0) {
                return item.type;
            }
        }
        
        return segments[0]; // Fallback
    }

    private calculateSegmentWeight(segmentType: string): number {
        const baseWeight = 1.0;
        const curveFreq = this.getCurveFrequency();
        const curveIntensity = this.getCurveIntensity();
        const rightBias = this.getRightTurnBias();
        
        // Adjust weights based on segment type and current difficulty
        switch (segmentType) {
            case 'straight_short':
            case 'straight_long':
                return baseWeight * (1.0 - curveFreq);
                
            case 'curve_gentle_right':
                return baseWeight * curveFreq * rightBias * (1.0 - curveIntensity * 0.5);
                
            case 'curve_gentle_left':
                return baseWeight * curveFreq * (1.0 - rightBias) * (1.0 - curveIntensity * 0.5);
                
            case 'curve_medium_right':
                return baseWeight * curveFreq * rightBias * curveIntensity;
                
            case 'curve_medium_left':
                return baseWeight * curveFreq * (1.0 - rightBias) * curveIntensity;
                
            case 'hairpin_right':
                return baseWeight * curveFreq * rightBias * Math.max(curveIntensity - 0.3, 0);
                
            case 'hairpin_left':
                return baseWeight * curveFreq * (1.0 - rightBias) * Math.max(curveIntensity - 0.3, 0);
                
            case 's_curve_short':
            case 's_curve_long':
                return baseWeight * curveFreq * curveIntensity * 0.7;
                
            case 'split_decorative':
                return baseWeight * curveFreq * Math.max(curveIntensity - 0.5, 0);
                
            default:
                return baseWeight;
        }
    }

    // Configuration methods
    public setConfig(newConfig: Partial<DifficultyConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public setAdaptiveScaling(enabled: boolean): void {
        this.config.adaptiveScaling = enabled;
        if (!enabled) {
            this.adaptiveModifier = 1.0;
        }
    }

    public setPlayerCountScaling(enabled: boolean): void {
        this.config.playerCountScaling = enabled;
    }

    // Statistics and debug info
    public getStatistics(): any {
        return {
            currentTier: this.currentTier.name,
            currentDistance: this.currentDistance,
            difficultyLevel: this.getDifficultyLevel(),
            adaptiveModifier: this.adaptiveModifier,
            playerCount: this.playerCount,
            maxVelocity: this.getMaxVelocity(),
            curveFrequency: this.getCurveFrequency(),
            curveIntensity: this.getCurveIntensity(),
            scoreMultiplier: this.getScoreMultiplier(),
            nextMilestone: this.getNextMilestone(),
            progressToNext: this.getProgressToNextTier()
        };
    }

    public reset(): void {
        this.currentTier = this.difficultyTiers[0];
        this.currentDistance = 0;
        this.playerCount = 1;
        this.adaptiveModifier = 1.0;
    }

    public dispose(): void {
        // Cleanup if needed
        this.reset();
    }
}