import { Position, TrackSegment } from "../rooms/schema/DriftState";

export enum SegmentType {
    STRAIGHT_SHORT = 'straight_short',
    STRAIGHT_LONG = 'straight_long',
    CURVE_GENTLE_RIGHT = 'curve_gentle_right',
    CURVE_GENTLE_LEFT = 'curve_gentle_left',
    CURVE_MEDIUM_RIGHT = 'curve_medium_right',
    CURVE_MEDIUM_LEFT = 'curve_medium_left',
    HAIRPIN_RIGHT = 'hairpin_right',
    HAIRPIN_LEFT = 'hairpin_left',
    S_CURVE_SHORT = 's_curve_short',
    S_CURVE_LONG = 's_curve_long',
    SPLIT_DECORATIVE = 'split_decorative'
}

interface SegmentDefinition {
    type: SegmentType;
    length: number;
    curvature: number;
    banking: number;
    widthVariation: number;
    difficulty: number;
    rightTurnBias: number;
}

interface TrackState {
    currentPosition: Position;
    currentHeading: number;
    totalDistance: number;
    segmentCount: number;
}

export class TrackGenerator {
    private seed: number;
    private rng: () => number;
    private state: TrackState;
    private checkpoints: Position[] = [];
    
    private readonly config = {
        baseWidth: 7.0,
        checkpointInterval: 25, // Every 25 meters
        segmentPoolSize: 20,
        maxSegments: 100, // Limit for memory management
    };

    private segmentDefinitions: SegmentDefinition[] = [
        {
            type: SegmentType.STRAIGHT_SHORT,
            length: 30,
            curvature: 0,
            banking: 0,
            widthVariation: 1.0,
            difficulty: 0.1,
            rightTurnBias: 0.5
        },
        {
            type: SegmentType.STRAIGHT_LONG,
            length: 60,
            curvature: 0,
            banking: 0,
            widthVariation: 1.1,
            difficulty: 0.2,
            rightTurnBias: 0.5
        },
        {
            type: SegmentType.CURVE_GENTLE_RIGHT,
            length: 45,
            curvature: Math.PI / 6 / 45, // 30° over 45 units
            banking: Math.PI / 90, // 2°
            widthVariation: 0.95,
            difficulty: 0.3,
            rightTurnBias: 0.75
        },
        {
            type: SegmentType.CURVE_GENTLE_LEFT,
            length: 45,
            curvature: -Math.PI / 6 / 45,
            banking: -Math.PI / 90,
            widthVariation: 0.95,
            difficulty: 0.4,
            rightTurnBias: 0.25
        },
        {
            type: SegmentType.CURVE_MEDIUM_RIGHT,
            length: 40,
            curvature: Math.PI / 3 / 40, // 60° over 40 units
            banking: Math.PI / 45, // 4°
            widthVariation: 0.9,
            difficulty: 0.6,
            rightTurnBias: 0.8
        },
        {
            type: SegmentType.CURVE_MEDIUM_LEFT,
            length: 40,
            curvature: -Math.PI / 3 / 40,
            banking: -Math.PI / 45,
            widthVariation: 0.9,
            difficulty: 0.7,
            rightTurnBias: 0.2
        },
        {
            type: SegmentType.HAIRPIN_RIGHT,
            length: 35,
            curvature: 2 * Math.PI / 3 / 35, // 120° turn
            banking: Math.PI / 30, // 6°
            widthVariation: 0.85,
            difficulty: 0.9,
            rightTurnBias: 0.85
        },
        {
            type: SegmentType.HAIRPIN_LEFT,
            length: 35,
            curvature: -2 * Math.PI / 3 / 35,
            banking: -Math.PI / 30,
            widthVariation: 0.85,
            difficulty: 1.0,
            rightTurnBias: 0.15
        },
        {
            type: SegmentType.S_CURVE_SHORT,
            length: 50,
            curvature: 0, // Special handling
            banking: 0,
            widthVariation: 0.9,
            difficulty: 0.7,
            rightTurnBias: 0.6
        }
    ];

    constructor(seed: number) {
        this.seed = seed;
        this.rng = this.createPRNG(seed);
        
        this.state = {
            currentPosition: { x: 0, y: 0, z: 0 },
            currentHeading: 0,
            totalDistance: 0,
            segmentCount: 0
        };
    }

    public setSeed(newSeed: number): void {
        this.seed = newSeed;
        this.rng = this.createPRNG(newSeed);
        this.reset();
    }

    public generateInitialSegments(): TrackSegment[] {
        console.log(`🛤️ Generating initial track segments with seed ${this.seed}`);
        
        const segments: TrackSegment[] = [];
        
        // Generate initial set of segments
        for (let i = 0; i < this.config.segmentPoolSize; i++) {
            const segment = this.generateNextSegment();
            segments.push(segment);
        }
        
        console.log(`✅ Generated ${segments.length} initial segments`);
        return segments;
    }

    public generateNextSegment(): TrackSegment {
        // Select segment type based on current difficulty and bias
        const segmentDef = this.selectSegmentType();
        
        // Create track segment
        const segment = new TrackSegment();
        segment.id = `segment_${this.state.segmentCount}_${Date.now()}`;
        segment.type = segmentDef.type;
        segment.length = segmentDef.length;
        segment.curvature = segmentDef.curvature;
        segment.banking = segmentDef.banking;
        segment.widthVariation = segmentDef.widthVariation;
        segment.difficulty = segmentDef.difficulty;
        
        // Set start position
        segment.startPosition = { ...this.state.currentPosition };
        
        // Generate centerline
        segment.centerline = this.generateCenterline(segmentDef);
        
        // Set end position
        if (segment.centerline.length > 0) {
            const lastPoint = segment.centerline[segment.centerline.length - 1];
            segment.endPosition = { ...lastPoint };
        } else {
            segment.endPosition = { ...this.state.currentPosition };
        }
        
        // Generate checkpoints for this segment
        segment.checkpoints = this.generateSegmentCheckpoints(segment.centerline);
        
        // Update state for next segment
        this.state.currentPosition = { ...segment.endPosition };
        this.state.totalDistance += segmentDef.length;
        this.state.segmentCount++;
        
        return segment;
    }

    private selectSegmentType(): SegmentDefinition {
        // Simple selection based on difficulty and right-turn bias
        const rightTurnBias = 0.65 + this.rng() * 0.1; // 65-75%
        
        // Filter segments based on progression (simple difficulty scaling)
        const progressionFactor = Math.min(this.state.totalDistance / 1000, 1.0); // 0-1 over first 1km
        const availableSegments = this.segmentDefinitions.filter(def => 
            def.difficulty <= (0.3 + progressionFactor * 0.7)
        );
        
        if (availableSegments.length === 0) {
            return this.segmentDefinitions[0]; // Fallback
        }
        
        // Apply right-turn bias
        const weightedSegments = availableSegments.map(def => ({
            definition: def,
            weight: this.rng() < rightTurnBias ? def.rightTurnBias : (1.0 - def.rightTurnBias)
        }));
        
        // Select based on weighted probability
        const totalWeight = weightedSegments.reduce((sum, item) => sum + item.weight, 0);
        let randomValue = this.rng() * totalWeight;
        
        for (const item of weightedSegments) {
            randomValue -= item.weight;
            if (randomValue <= 0) {
                return item.definition;
            }
        }
        
        return availableSegments[0]; // Fallback
    }

    private generateCenterline(definition: SegmentDefinition): Position[] {
        const points: Position[] = [];
        const stepSize = 2.0; // 2 unit steps
        const numSteps = Math.ceil(definition.length / stepSize);
        
        let currentPos = { ...this.state.currentPosition };
        let currentHeading = this.state.currentHeading;
        
        points.push({ ...currentPos });
        
        for (let i = 1; i <= numSteps; i++) {
            const t = i / numSteps;
            
            // Apply curvature
            if (definition.curvature !== 0) {
                currentHeading += definition.curvature * stepSize;
            }
            
            // Special handling for S-curves
            if (definition.type === SegmentType.S_CURVE_SHORT) {
                const sCurveAngle = Math.sin(t * Math.PI * 2) * (Math.PI / 9); // 20° amplitude
                currentHeading += sCurveAngle * stepSize / definition.length;
            }
            
            // Move forward
            currentPos.x += Math.sin(currentHeading) * stepSize;
            currentPos.z += Math.cos(currentHeading) * stepSize;
            
            points.push({ ...currentPos });
        }
        
        // Update heading for next segment
        this.state.currentHeading = currentHeading;
        
        return points;
    }

    private generateSegmentCheckpoints(centerline: Position[]): Position[] {
        const checkpoints: Position[] = [];
        let distance = 0;
        
        for (let i = 1; i < centerline.length; i++) {
            const prevPoint = centerline[i - 1];
            const currentPoint = centerline[i];
            
            const stepDistance = Math.sqrt(
                Math.pow(currentPoint.x - prevPoint.x, 2) +
                Math.pow(currentPoint.z - prevPoint.z, 2)
            );
            
            distance += stepDistance;
            
            if (distance >= this.config.checkpointInterval) {
                checkpoints.push({ ...currentPoint });
                this.checkpoints.push({ ...currentPoint });
                distance = 0;
            }
        }
        
        return checkpoints;
    }

    public getCheckpoints(): Position[] {
        return [...this.checkpoints];
    }

    public getNearestCheckpoint(position: Position): Position | null {
        if (this.checkpoints.length === 0) return null;
        
        let nearestCheckpoint: Position | null = null;
        let nearestDistance = Infinity;
        
        for (const checkpoint of this.checkpoints) {
            const distance = this.calculateDistance(position, checkpoint);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestCheckpoint = checkpoint;
            }
        }
        
        return nearestCheckpoint;
    }

    public isOffTrack(position: Position): boolean {
        // Simple implementation: check distance from last known position
        const distanceFromStart = this.calculateDistance(position, { x: 0, y: 0, z: 0 });
        const maxAllowedDistance = this.state.totalDistance + 100; // 100 unit tolerance
        
        // Check if too far from expected track area
        if (distanceFromStart > maxAllowedDistance) {
            return true;
        }
        
        // Check Y coordinate (falling off)
        if (position.y < -5) {
            return true;
        }
        
        // Simple lateral distance check
        // This is simplified - in a real implementation, you'd check distance to centerline
        const lateralDistance = Math.abs(position.x);
        if (lateralDistance > this.config.baseWidth) {
            return true;
        }
        
        return false;
    }

    public validatePlayerPosition(position: Position, previousPosition: Position, deltaTime: number): boolean {
        // Basic validation to prevent teleporting/cheating
        const distance = this.calculateDistance(position, previousPosition);
        const maxExpectedDistance = 50 * deltaTime; // 50 units/second max
        
        return distance <= maxExpectedDistance;
    }

    public getTrackInfo(): any {
        return {
            seed: this.seed,
            totalDistance: this.state.totalDistance,
            segmentCount: this.state.segmentCount,
            checkpointCount: this.checkpoints.length,
            currentPosition: this.state.currentPosition,
            currentHeading: this.state.currentHeading
        };
    }

    private calculateDistance(pos1: Position, pos2: Position): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    private createPRNG(seed: number): () => number {
        let currentSeed = seed;
        return () => {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        };
    }

    private reset(): void {
        this.state = {
            currentPosition: { x: 0, y: 0, z: 0 },
            currentHeading: 0,
            totalDistance: 0,
            segmentCount: 0
        };
        this.checkpoints = [];
    }

    public dispose(): void {
        this.checkpoints = [];
        this.reset();
    }
}