import { Vector3 } from './Vector3';

export enum SegmentType {
  STRAIGHT_SHORT = 'straight_short',
  STRAIGHT_MEDIUM = 'straight_medium',
  CURVE_GENTLE_RIGHT = 'curve_gentle_right',
  CURVE_MEDIUM_RIGHT = 'curve_medium_right',
  CURVE_SHARP_RIGHT = 'curve_sharp_right',
  CURVE_GENTLE_LEFT = 'curve_gentle_left',
  CURVE_MEDIUM_LEFT = 'curve_medium_left',
  CURVE_SHARP_LEFT = 'curve_sharp_left'
}

interface SegmentDefinition {
  type: SegmentType;
  length: number;
  curvature: number;
  banking: number;
  widthVariation: number;
  difficulty: number;
  rightTurnBias: number;
  modulePattern: 'STRAIGHT' | 'TURN' | 'S';
  direction?: 'LEFT' | 'RIGHT' | 'LR' | 'RL';
  turnAngleRad?: number;
  sAmplitude?: number;
  elevationGain?: number;
}

interface SegmentBlueprint {
  centerline: Vector3[];
  leftEdge: Vector3[];
  rightEdge: Vector3[];
  deltaHeading: number;
  length: number;
}

interface TrackSegment {
  id: string;
  definition: SegmentDefinition;
  startPosition: Vector3;
  endPosition: Vector3;
  startHeading: number;
  endHeading: number;
  centerline: Vector3[];
  leftEdge: Vector3[];
  rightEdge: Vector3[];
  cumulativeStart: number;
  cumulativeEnd: number;
  accumulatedLengths: number[];
}

export interface TrackSample {
  position: Vector3;
  forward: Vector3;
  right: Vector3;
  width: number;
  segmentId: string;
}

export class TrackGenerator {
  private readonly segments: TrackSegment[] = [];
  private readonly blueprintCache = new Map<SegmentType, SegmentBlueprint>();
  private readonly trackWidth = 1.854;
  private readonly lookAheadDistance = 480;

  private readonly rng: () => number;
  private currentPosition = new Vector3(0, 0, 0);
  private currentHeading = 0;
  private segmentCount = 0;
  private totalLength = 0;

  private sequencePhase: 'straight' | 'curve' = 'straight';
  private straightsQueued = 0;
  private straightSinceCurve = 0;
  private lastCurveDirection = 0;
  private straightQueue: SegmentType[] = [];

  private readonly segmentDefinitions: SegmentDefinition[] = [
    {
      type: SegmentType.STRAIGHT_SHORT,
      length: 35,
      curvature: 0,
      banking: 0,
      widthVariation: 1.0,
      difficulty: 0.1,
      rightTurnBias: 0.5,
      modulePattern: 'STRAIGHT',
      elevationGain: 0
    },
    {
      type: SegmentType.STRAIGHT_MEDIUM,
      length: 60,
      curvature: 0,
      banking: 0,
      widthVariation: 1.0,
      difficulty: 0.1,
      rightTurnBias: 0.5,
      modulePattern: 'STRAIGHT',
      elevationGain: 1.0
    },
    {
      type: SegmentType.CURVE_GENTLE_RIGHT,
      length: 140,
      curvature: 0,
      banking: Math.PI / 48,
      widthVariation: 1.0,
      difficulty: 0.4,
      rightTurnBias: 1.0,
      modulePattern: 'TURN',
      direction: 'RIGHT',
      turnAngleRad: Math.PI / 1.5,
      elevationGain: 1.5
    },
    {
      type: SegmentType.CURVE_MEDIUM_RIGHT,
      length: 160,
      curvature: 0,
      banking: Math.PI / 44,
      widthVariation: 1.0,
      difficulty: 0.7,
      rightTurnBias: 1.0,
      modulePattern: 'TURN',
      direction: 'RIGHT',
      turnAngleRad: Math.PI / 1.2,
      elevationGain: 2.0
    },
    {
      type: SegmentType.CURVE_SHARP_RIGHT,
      length: 180,
      curvature: 0,
      banking: Math.PI / 48,
      widthVariation: 1.0,
      difficulty: 0.9,
      rightTurnBias: 1.0,
      modulePattern: 'S',
      direction: 'RL',
      sAmplitude: 0.05,
      elevationGain: 2.4
    },
    {
      type: SegmentType.CURVE_GENTLE_LEFT,
      length: 140,
      curvature: 0,
      banking: Math.PI / 48,
      widthVariation: 1.0,
      difficulty: 0.4,
      rightTurnBias: 0.0,
      modulePattern: 'TURN',
      direction: 'LEFT',
      turnAngleRad: Math.PI / 1.5,
      elevationGain: 1.5
    },
    {
      type: SegmentType.CURVE_MEDIUM_LEFT,
      length: 160,
      curvature: 0,
      banking: Math.PI / 44,
      widthVariation: 1.0,
      difficulty: 0.7,
      rightTurnBias: 0.0,
      modulePattern: 'TURN',
      direction: 'LEFT',
      turnAngleRad: Math.PI / 1.2,
      elevationGain: 2.0
    },
    {
      type: SegmentType.CURVE_SHARP_LEFT,
      length: 180,
      curvature: 0,
      banking: Math.PI / 48,
      widthVariation: 1.0,
      difficulty: 0.9,
      rightTurnBias: 0.0,
      modulePattern: 'S',
      direction: 'LR',
      sAmplitude: 0.05,
      elevationGain: 2.4
    }
  ];

  constructor(seed: number) {
    this.rng = this.createPRNG(seed);
    this.generateInitialSegments();
  }

  private createPRNG(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0xffffffff;
    };
  }

  private generateInitialSegments() {
    const first = this.segmentDefinitions.find((s) => s.type === SegmentType.STRAIGHT_MEDIUM);
    if (first) {
      this.createSegment(first);
      this.sequencePhase = 'curve';
      this.straightsQueued = 0;
    }

    while (this.totalLength < this.lookAheadDistance) {
      this.generateNextSegment();
    }
  }

  private generateNextSegment() {
    const type = this.chooseSegmentType();
    const definition = this.segmentDefinitions.find((s) => s.type === type);
    if (!definition) {
      return;
    }
    this.createSegment(definition);
  }

  private chooseSegmentType(): SegmentType {
    const index = this.segments.length;
    if (index === 0) {
      return SegmentType.STRAIGHT_MEDIUM;
    }

    if (this.straightQueue.length > 0) {
      const nextStraight = this.straightQueue.shift()!;
      this.sequencePhase = 'straight';
      if (nextStraight === SegmentType.STRAIGHT_SHORT || nextStraight === SegmentType.STRAIGHT_MEDIUM) {
        this.straightSinceCurve++;
      }
      return nextStraight;
    }

    if (this.sequencePhase === 'straight') {
      if (this.straightsQueued <= 0) {
        this.straightsQueued = this.rng() < 0.3 ? 1 : 0;
      }
      if (this.straightsQueued > 0) {
        this.straightsQueued--;
        this.straightSinceCurve++;
        return this.rng() < 0.6 ? SegmentType.STRAIGHT_SHORT : SegmentType.STRAIGHT_MEDIUM;
      }
      this.sequencePhase = 'curve';
    }

    const preferredDirection = this.lastCurveDirection === 0 ? (this.rng() < 0.5 ? 1 : -1) : this.lastCurveDirection;
    const flipDirection = this.rng() < 0.25;
    const directionSign = flipDirection ? -preferredDirection : preferredDirection;
    this.lastCurveDirection = directionSign;

    this.sequencePhase = 'straight';
    this.straightSinceCurve = 0;
    this.straightsQueued = 0;

    const curveRand = this.rng();
    if (curveRand < 0.35) {
      return directionSign < 0 ? SegmentType.CURVE_GENTLE_LEFT : SegmentType.CURVE_GENTLE_RIGHT;
    }
    if (curveRand < 0.7) {
      return directionSign < 0 ? SegmentType.CURVE_MEDIUM_LEFT : SegmentType.CURVE_MEDIUM_RIGHT;
    }
    return directionSign < 0 ? SegmentType.CURVE_SHARP_LEFT : SegmentType.CURVE_SHARP_RIGHT;
  }

  private createSegment(definition: SegmentDefinition) {
    const segment: TrackSegment = {
      id: `segment_${this.segmentCount}`,
      definition,
      startPosition: this.currentPosition.clone(),
      endPosition: new Vector3(),
      startHeading: this.currentHeading,
      endHeading: this.currentHeading,
      centerline: [],
      leftEdge: [],
      rightEdge: [],
      cumulativeStart: this.totalLength,
      cumulativeEnd: this.totalLength,
      accumulatedLengths: []
    };

    this.buildSegmentPaths(segment);

    if (definition.modulePattern === 'TURN') {
      this.lastCurveDirection = definition.direction === 'LEFT' ? -1 : 1;
      this.sequencePhase = 'straight';
      this.straightSinceCurve = 0;
      this.straightQueue = this.rng() < 0.35 ? [SegmentType.STRAIGHT_SHORT] : [];
    } else if (definition.modulePattern === 'S') {
      this.lastCurveDirection = definition.direction === 'RL' ? -1 : 1;
      this.sequencePhase = 'straight';
      this.straightSinceCurve = 0;
      this.straightQueue = this.rng() < 0.4 ? [SegmentType.STRAIGHT_SHORT] : [];
    } else if (definition.modulePattern === 'STRAIGHT') {
      this.straightSinceCurve++;
    }

    this.currentPosition = segment.endPosition.clone();
    this.currentHeading = segment.endHeading;
    this.segmentCount++;
    this.totalLength = segment.cumulativeEnd;
    this.segments.push(segment);
  }

  private buildSegmentPaths(segment: TrackSegment) {
    const blueprint = this.getBlueprint(segment.definition);
    const sinH = Math.sin(segment.startHeading);
    const cosH = Math.cos(segment.startHeading);

    const transformPoint = (point: Vector3): Vector3 => {
      const x = point.x * cosH + point.z * sinH;
      const z = -point.x * sinH + point.z * cosH;
      return new Vector3(x + segment.startPosition.x, point.y + segment.startPosition.y, z + segment.startPosition.z);
    };

    let centerline = blueprint.centerline.map((p) => transformPoint(p.clone()));
    let leftEdge = blueprint.leftEdge.map((p) => transformPoint(p.clone()));
    let rightEdge = blueprint.rightEdge.map((p) => transformPoint(p.clone()));

    const distanceKm = segment.cumulativeStart / 1000;
    // Não aplicar narrowing nos primeiros 100m para garantir espaço inicial seguro
    const narrowingFactor = segment.cumulativeStart < 100 ? 1.0 : Math.pow(0.8, Math.floor(distanceKm));
    const narrowingMultiplier = Math.max(0.5, narrowingFactor); // Mínimo 50% da largura original
    const isStraight = segment.definition.modulePattern === 'STRAIGHT';
    const isLongStraight = isStraight && segment.definition.length >= 50;

    if (isLongStraight || narrowingMultiplier < 1.0) {
      for (let i = 0; i < centerline.length; i++) {
        const centerPoint = centerline[i];
        const forward = (i < centerline.length - 1
          ? Vector3.subtract(centerline[i + 1], centerPoint)
          : Vector3.subtract(centerPoint, centerline[i - 1]))
          .normalize();
        const right = new Vector3(forward.z, 0, -forward.x).normalize();

        let localNarrowing = narrowingMultiplier;
        if (isLongStraight) {
          const progress = centerline.length <= 1 ? 0 : i / (centerline.length - 1);
          const middleNarrowing = 1.0 - (0.5 * Math.sin(progress * Math.PI));
          localNarrowing *= middleNarrowing;
        }

        const halfWidth = (this.trackWidth * localNarrowing) / 2;
        leftEdge[i] = Vector3.add(centerPoint, Vector3.scale(right, -halfWidth));
        rightEdge[i] = Vector3.add(centerPoint, Vector3.scale(right, halfWidth));
      }
    }

    if (isStraight) {
      this.smoothPath(centerline);
      this.smoothPath(leftEdge);
      this.smoothPath(rightEdge);
    }

    if (this.segments.length > 0) {
      const prev = this.segments[this.segments.length - 1];
      const prevEndCenter = prev.centerline[prev.centerline.length - 1];
      const prevEndLeft = prev.leftEdge[prev.leftEdge.length - 1];
      const prevEndRight = prev.rightEdge[prev.rightEdge.length - 1];

      const centerOffset = Vector3.subtract(prevEndCenter, centerline[0]);
      const leftOffset = Vector3.subtract(prevEndLeft, leftEdge[0]);
      const rightOffset = Vector3.subtract(prevEndRight, rightEdge[0]);

      centerline = centerline.map((point) => Vector3.add(point, centerOffset.clone()));
      leftEdge = leftEdge.map((point) => Vector3.add(point, leftOffset.clone()));
      rightEdge = rightEdge.map((point) => Vector3.add(point, rightOffset.clone()));

      centerline[0] = prevEndCenter.clone();
      leftEdge[0] = prevEndLeft.clone();
      rightEdge[0] = prevEndRight.clone();

      const transitionPoints = Math.min(8, centerline.length);
      const maxYDelta = 0.5;
      for (let i = 1; i < transitionPoints; i++) {
        const lerpFactor = Math.sin((i / transitionPoints) * Math.PI * 0.5);
        const prevY = centerline[i - 1].y;
        const targetY = prevEndCenter.y + (centerline[i].y - prevEndCenter.y) * lerpFactor;
        const smoothY = Math.max(prevY - maxYDelta, Math.min(prevY + maxYDelta, targetY));
        centerline[i].y = smoothY;
        leftEdge[i].y = smoothY + (leftEdge[i].y - centerline[i].y) * 0.1;
        rightEdge[i].y = smoothY + (rightEdge[i].y - centerline[i].y) * 0.1;
      }

      for (let i = transitionPoints; i < centerline.length - 1; i++) {
        const prevY = centerline[i - 1].y;
        const currentY = centerline[i].y;
        const nextY = centerline[i + 1].y;
        const smoothedY = (prevY + currentY + nextY) / 3;
        centerline[i].y = smoothedY;
        leftEdge[i].y = smoothedY + (leftEdge[i].y - centerline[i].y) * 0.1;
        rightEdge[i].y = smoothedY + (rightEdge[i].y - centerline[i].y) * 0.1;
      }
    }

    const accumulated: number[] = [0];
    for (let i = 1; i < centerline.length; i++) {
      const distance = Vector3.subtract(centerline[i], centerline[i - 1]).length();
      accumulated.push(accumulated[i - 1] + distance);
    }

    segment.centerline = centerline;
    segment.leftEdge = leftEdge;
    segment.rightEdge = rightEdge;
    segment.accumulatedLengths = accumulated;
    segment.endPosition = centerline[centerline.length - 1].clone();
    segment.endHeading = this.normalizeAngle(segment.startHeading + blueprint.deltaHeading);
    segment.cumulativeEnd = segment.cumulativeStart + accumulated[accumulated.length - 1];
  }

  private getBlueprint(definition: SegmentDefinition): SegmentBlueprint {
    const cached = this.blueprintCache.get(definition.type);
    if (cached) {
      return cached;
    }

    const subdivisions = Math.max(80, Math.ceil(definition.length / 1.5));
    const step = definition.length / subdivisions;
    const deltaHeadingLimit = Math.PI / 180;
    const modulePattern = definition.modulePattern ?? 'STRAIGHT';
    const direction = definition.direction ?? 'RIGHT';
    const widthMultiplier = definition.widthVariation ?? 1;
    const halfWidth = (this.trackWidth * widthMultiplier) / 2;
    const baseBanking = Math.min(Math.PI / 24, Math.abs(definition.banking ?? Math.PI / 24));
    const totalElevation = definition.elevationGain ?? 0;

    const centerline: Vector3[] = [];
    const leftEdge: Vector3[] = [];
    const rightEdge: Vector3[] = [];

    let heading = 0;
    let currentPosition = new Vector3(0, 0, 0);

    const easeLength = Math.min(12, definition.length * 0.15);
    const arcEffectiveLength = Math.max(1, definition.length - 2 * easeLength);
    const baseTurnAngle = definition.turnAngleRad ?? 0;
    const baseCurvature = baseTurnAngle === 0 ? 0 : baseTurnAngle / (arcEffectiveLength + easeLength);
    const turnSign = direction === 'LEFT' ? -1 : 1;
    const sOrientation = direction === 'LR' ? -1 : 1;
    const sAmplitude = definition.sAmplitude ?? 0.0075;

    for (let i = 0; i <= subdivisions; i++) {
      const t = subdivisions === 0 ? 0 : i / subdivisions;
      const distanceAlong = step * i;
      let curvatureValue = 0;

      if (modulePattern === 'TURN') {
        if (baseCurvature !== 0) {
          if (distanceAlong < easeLength) {
            const ratio = distanceAlong / easeLength;
            curvatureValue = baseCurvature * ratio;
          } else if (distanceAlong > definition.length - easeLength) {
            const ratio = Math.max(0, (definition.length - distanceAlong) / easeLength);
            curvatureValue = baseCurvature * ratio;
          } else {
            curvatureValue = baseCurvature;
          }
          curvatureValue *= turnSign;
        }
      } else if (modulePattern === 'S') {
        const sinValue = Math.sin(2 * Math.PI * t);
        curvatureValue = sAmplitude * sinValue * sOrientation;
      }

      if (i > 0) {
        const deltaHeading = Math.max(-deltaHeadingLimit, Math.min(deltaHeadingLimit, curvatureValue * step));
        heading += deltaHeading;
        const forwardStep = new Vector3(Math.sin(heading), 0, Math.cos(heading));
        currentPosition = Vector3.add(currentPosition, Vector3.scale(forwardStep, step));
      }

      const forward = new Vector3(Math.sin(heading), 0, Math.cos(heading)).normalize();
      const right = new Vector3(forward.z, 0, -forward.x).normalize();
      const elevation = totalElevation * t;
      const centerPoint = new Vector3(currentPosition.x, elevation, currentPosition.z);

      const referenceCurvature = modulePattern === 'S'
        ? Math.max(1e-4, Math.abs(sAmplitude))
        : Math.max(1e-4, Math.abs(baseCurvature) || Math.abs(curvatureValue));
      const bankingStrength = modulePattern === 'S' ? baseBanking * 0.4 : baseBanking;
      const bankingRatio = referenceCurvature > 0 ? Math.max(-1, Math.min(1, curvatureValue / referenceCurvature)) : 0;
      const bankingAngle = bankingStrength * bankingRatio;
      const lateralOffset = Vector3.scale(right, halfWidth);
      const verticalOffset = halfWidth * Math.sin(bankingAngle);

      const leftPoint = new Vector3(
        centerPoint.x - lateralOffset.x,
        centerPoint.y - verticalOffset,
        centerPoint.z - lateralOffset.z
      );
      const rightPoint = new Vector3(
        centerPoint.x + lateralOffset.x,
        centerPoint.y + verticalOffset,
        centerPoint.z + lateralOffset.z
      );

      centerline.push(centerPoint);
      leftEdge.push(leftPoint);
      rightEdge.push(rightPoint);
    }

    const blueprint: SegmentBlueprint = {
      centerline,
      leftEdge,
      rightEdge,
      deltaHeading: heading,
      length: definition.length
    };

    this.blueprintCache.set(definition.type, blueprint);
    return blueprint;
  }

  private smoothPath(path: Vector3[]) {
    if (path.length < 3) {
      return;
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i - 1];
        const current = path[i];
        const next = path[i + 1];
        const smoothedY = (prev.y + current.y * 2 + next.y) / 4;
        path[i].y = smoothedY;
      }
    }
  }

  private normalizeAngle(value: number): number {
    let angle = value;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  public ensureDistance(distance: number) {
    while (distance > this.totalLength - 120) {
      this.generateNextSegment();
    }
  }

  public getSampleAtDistance(distance: number): TrackSample | null {
    if (this.segments.length === 0) {
      return null;
    }

    this.ensureDistance(distance);

    for (const segment of this.segments) {
      if (distance < segment.cumulativeStart || distance > segment.cumulativeEnd) {
        continue;
      }
      const localDistance = distance - segment.cumulativeStart;
      return this.sampleSegment(segment, localDistance);
    }

    const last = this.segments[this.segments.length - 1];
    return this.sampleSegment(last, last.accumulatedLengths[last.accumulatedLengths.length - 1]);
  }

  private sampleSegment(segment: TrackSegment, localDistance: number): TrackSample {
    const { centerline, accumulatedLengths } = segment;

    if (centerline.length < 2) {
      const forward = new Vector3(Math.sin(segment.endHeading), 0, Math.cos(segment.endHeading)).normalize();
      const right = new Vector3(forward.z, 0, -forward.x).normalize();
      return {
        position: segment.endPosition.clone(),
        forward,
        right,
        width: this.trackWidth,
        segmentId: segment.id
      };
    }

    let index = 1;
    for (; index < accumulatedLengths.length; index++) {
      if (accumulatedLengths[index] >= localDistance) {
        break;
      }
    }

    const prevIndex = Math.max(0, index - 1);
    const nextIndex = Math.min(centerline.length - 1, index);
    const prevPoint = centerline[prevIndex];
    const nextPoint = centerline[nextIndex];
    const segmentDistance = accumulatedLengths[nextIndex] - accumulatedLengths[prevIndex] || 1;
    const t = Math.max(0, Math.min(1, (localDistance - accumulatedLengths[prevIndex]) / segmentDistance));

    const position = Vector3.lerp(prevPoint, nextPoint, t);
    const forward = Vector3.subtract(nextPoint, prevPoint).normalize();
    const lateral = Vector3.subtract(segment.rightEdge[nextIndex], segment.leftEdge[nextIndex]);
    const width = lateral.length();
    const right = lateral.normalize();

    return {
      position,
      forward,
      right,
      width,
      segmentId: segment.id
    };
  }
}
