import { Color3, Matrix, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";

export enum SegmentType {
  STRAIGHT_SHORT = "straight_short",
  STRAIGHT_MEDIUM = "straight_medium",
  CURVE_GENTLE_RIGHT = "curve_gentle_right",
  CURVE_MEDIUM_RIGHT = "curve_medium_right",
  CURVE_SHARP_RIGHT = "curve_sharp_right",
  CURVE_GENTLE_LEFT = "curve_gentle_left",
  CURVE_MEDIUM_LEFT = "curve_medium_left",
  CURVE_SHARP_LEFT = "curve_sharp_left"
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
  mesh?: Mesh;
  barriers: Mesh[];
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
  private segments: TrackSegment[] = [];
  private barriers: Mesh[] = [];
  private seed: number;
  private rng: () => number;
  private currentPosition: Vector3;
  private currentHeading: number;
  private segmentCount: number;
  private totalLength: number;
  private readonly trackWidth = 14; // Rua significativamente mais estreita
  private readonly lookAheadDistance = 480;
  private readonly blueprintCache = new Map<SegmentType, SegmentBlueprint>();

  private sequencePhase: 'straight' | 'curve' = 'straight';
  private straightsQueued: number = 0;
  private lastCurveDirection: number = 0;
  private straightSinceCurve: number = 0;
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
      turnAngleRad: Math.PI / 1.5, // ~120° - curva mais fechada
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
      turnAngleRad: Math.PI / 1.2, // ~150° - curva muito fechada
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
      sAmplitude: 0.05, // S-curve mais acentuada
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
      turnAngleRad: Math.PI / 1.5, // ~120° - curva mais fechada
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
      turnAngleRad: Math.PI / 1.2, // ~150° - curva muito fechada
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
      sAmplitude: 0.05, // S-curve mais acentuada
      elevationGain: 2.4
    }
  ];

  constructor(private readonly scene: Scene, seed?: number) {
    this.seed = seed || Date.now();
    this.rng = this.createPRNG(this.seed);
    this.currentPosition = new Vector3(0, 0, 0);
    this.currentHeading = 0;
    this.segmentCount = 0;
    this.totalLength = 0;
    this.sequencePhase = 'straight';
    this.straightsQueued = 0;
    this.lastCurveDirection = 0;
    this.straightSinceCurve = 0;
    this.straightQueue = [];
    this.generateInitialSegments();
  }

  private createPRNG(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
      return state / Math.pow(2, 32);
    };
  }

  private generateInitialSegments() {
    // Primeiro segmento sempre reto
    const straightDef = this.segmentDefinitions.find((s) => s.type === SegmentType.STRAIGHT_MEDIUM);
    if (straightDef) {
      this.createSegment(straightDef);
      this.sequencePhase = 'curve';
      this.straightsQueued = 0;
    }

    // Gera segmentos subsequentes com curvas progressivamente mais fechadas
    while (this.totalLength < this.lookAheadDistance) {
      this.generateNextSegment();
    }
  }

  private generateNextSegment() {
    const segmentType = this.chooseSegmentType();
    const definition = this.segmentDefinitions.find((s) => s.type === segmentType);
    if (!definition) {
      return;
    }
    this.createSegment(definition);
  }

  private createSegment(definition: SegmentDefinition) {
    const startPosition = this.currentPosition.clone();

    const segment: TrackSegment = {
      id: `segment_${this.segmentCount}`,
      definition,
      startPosition: startPosition,
      endPosition: new Vector3(),
      startHeading: this.currentHeading,
      endHeading: this.currentHeading,
      barriers: [],
      centerline: [],
      leftEdge: [],
      rightEdge: [],
      cumulativeStart: this.totalLength,
      cumulativeEnd: this.totalLength,
      accumulatedLengths: []
    };

    this.buildSegmentGeometry(segment);
    this.createSegmentMesh(segment);
    this.createSegmentBarriers(segment);

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

  private chooseSegmentType(): SegmentType {
    const segmentIndex = this.segments.length;

    // Primeiro segmento sempre reto
    if (segmentIndex === 0) {
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

    // Curvas: escolher direção baseada na última curva, com chance de inverter
    const preferredDirection = this.lastCurveDirection === 0 ? (this.rng() < 0.5 ? 1 : -1) : this.lastCurveDirection;
    const flipDirection = this.rng() < 0.25;
    const directionSign = flipDirection ? -preferredDirection : preferredDirection;
    this.lastCurveDirection = directionSign;

    // Reinicia fase para próximas retas
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

  private getBlueprint(definition: SegmentDefinition): SegmentBlueprint {
    const cached = this.blueprintCache.get(definition.type);
    if (cached) {
      return cached;
    }

    const subdivisions = Math.max(80, Math.ceil(definition.length / 1.5));
    const step = definition.length / subdivisions;
    const deltaHeadingLimit = Math.PI / 180; // 1° por passo
    const gradeSlope = definition.elevationGain ? definition.elevationGain / definition.length : 0;
    const bankingLimit = Math.PI / 24; // limite máximo ~7.5°
    const modulePattern = definition.modulePattern ?? 'STRAIGHT';
    const direction = definition.direction ?? 'RIGHT';
    const widthMultiplier = definition.widthVariation ?? 1;
    const halfWidth = (this.trackWidth * widthMultiplier) / 2;
    const baseBanking = Math.min(bankingLimit, Math.abs(definition.banking ?? bankingLimit));
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
      } else {
        curvatureValue = 0;
      }

      if (i > 0) {
        const deltaHeading = Math.max(-deltaHeadingLimit, Math.min(deltaHeadingLimit, curvatureValue * step));
        heading += deltaHeading;

        const forwardStep = new Vector3(Math.sin(heading), 0, Math.cos(heading));
        currentPosition = currentPosition.add(new Vector3(forwardStep.x * step, 0, forwardStep.z * step));
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
      const lateralOffset = right.scale(halfWidth);
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

    if (modulePattern === 'STRAIGHT') {
      this.smoothPath(centerline);
      this.smoothPath(leftEdge);
      this.smoothPath(rightEdge);
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

  private buildSegmentGeometry(segment: TrackSegment) {
    const blueprint = this.getBlueprint(segment.definition);
    const rotation = Matrix.RotationY(segment.startHeading);
    const transformPoint = (point: Vector3) => Vector3.TransformCoordinates(point, rotation).add(segment.startPosition);

    let centerline = blueprint.centerline.map(transformPoint);
    let leftEdge = blueprint.leftEdge.map(transformPoint);
    let rightEdge = blueprint.rightEdge.map(transformPoint);

    // Calcular fator de estreitamento baseado na distância total
    // A cada 1000 pontos, reduz 20% da largura
    const distanceKm = segment.cumulativeStart / 1000;
    const narrowingFactor = Math.pow(0.8, Math.floor(distanceKm)); // 0.8^n onde n = quantidades de 1000m
    const narrowingMultiplier = Math.max(0.4, narrowingFactor); // Mínimo de 40% da largura original

    // Aplicar estreitamento adicional de 50% no meio de retas longas
    const isStraight = segment.definition.modulePattern === 'STRAIGHT';
    const isLongStraight = isStraight && segment.definition.length >= 50;

    if (isLongStraight || narrowingMultiplier < 1.0) {
      // Recalcular bordas com nova largura
      for (let i = 0; i < centerline.length; i++) {
        const centerPoint = centerline[i];
        const forward = i < centerline.length - 1
          ? centerline[i + 1].subtract(centerPoint).normalize()
          : centerline[i].subtract(centerline[i - 1]).normalize();
        const right = new Vector3(forward.z, 0, -forward.x).normalize();

        // Fator de estreitamento no meio da reta
        let localNarrowing = narrowingMultiplier;
        if (isLongStraight) {
          const progress = i / (centerline.length - 1);
          // Criar estreitamento no meio da reta (em forma de sino)
          const middleNarrowing = 1.0 - (0.5 * Math.sin(progress * Math.PI)); // Varia de 1.0 -> 0.5 -> 1.0
          localNarrowing *= middleNarrowing;
        }

        const halfWidth = (this.trackWidth * localNarrowing) / 2;
        leftEdge[i] = centerPoint.add(right.scale(-halfWidth));
        rightEdge[i] = centerPoint.add(right.scale(halfWidth));
      }
    }

    // Garante continuidade ABSOLUTA com o segmento anterior
    if (this.segments.length > 0) {
      const prevSegment = this.segments[this.segments.length - 1];
      const prevEndCenter = prevSegment.centerline[prevSegment.centerline.length - 1];
      const prevEndLeft = prevSegment.leftEdge[prevSegment.leftEdge.length - 1];
      const prevEndRight = prevSegment.rightEdge[prevSegment.rightEdge.length - 1];

      // Ajusta pontos iniciais para match perfeito
      const centerOffset = prevEndCenter.subtract(centerline[0]);
      const leftOffset = prevEndLeft.subtract(leftEdge[0]);
      const rightOffset = prevEndRight.subtract(rightEdge[0]);

      // Aplica offset a todos os pontos
      centerline = centerline.map(point => point.add(centerOffset));
      leftEdge = leftEdge.map(point => point.add(leftOffset));
      rightEdge = rightEdge.map(point => point.add(rightOffset));

      // Força o primeiro ponto a ser exatamente igual ao último do anterior
      centerline[0] = prevEndCenter.clone();
      leftEdge[0] = prevEndLeft.clone();
      rightEdge[0] = prevEndRight.clone();

      // Suaviza a transição de altura para eliminar ondulações desnecessárias
      const transitionPoints = Math.min(8, centerline.length); // Menos pontos para maior suavidade
      const maxYDelta = 0.5; // Mudanças muito pequenas de altura para pista lisa

      for (let i = 1; i < transitionPoints; i++) {
        const lerpFactor = Math.sin((i / transitionPoints) * Math.PI * 0.5); // Curva senoidal suave
        const targetY = prevEndCenter.y + (centerline[i].y - prevEndCenter.y) * lerpFactor;

        // Limita mudanças muito pequenas de altura para pista uniforme
        const prevY = centerline[i - 1].y;
        const maxAllowedY = prevY + maxYDelta;
        const minAllowedY = prevY - maxYDelta;

        const smoothY = Math.max(minAllowedY, Math.min(maxAllowedY, targetY));

        centerline[i].y = smoothY;
        leftEdge[i].y = smoothY + (leftEdge[i].y - centerline[i].y) * 0.1; // Inclinação lateral mínima
        rightEdge[i].y = smoothY + (rightEdge[i].y - centerline[i].y) * 0.1;
      }

      // Suavização adicional para eliminar ondulações restantes
      for (let i = transitionPoints; i < centerline.length - 1; i++) {
        const prevY = centerline[i - 1].y;
        const currentY = centerline[i].y;
        const nextY = centerline[i + 1].y;

        // Aplicar filtro de média móvel para suavidade extrema
        const smoothedY = (prevY + currentY + nextY) / 3;
        centerline[i].y = smoothedY;
        leftEdge[i].y = smoothedY + (leftEdge[i].y - centerline[i].y) * 0.1;
        rightEdge[i].y = smoothedY + (rightEdge[i].y - centerline[i].y) * 0.1;
      }

      // Atualiza a posição inicial do segmento
      segment.startPosition = centerline[0].clone();
    }

    const accumulated: number[] = [0];
    for (let i = 1; i < centerline.length; i++) {
      const dist = Vector3.Distance(centerline[i], centerline[i - 1]);
      accumulated.push(accumulated[i - 1] + dist);
    }

    const totalLength = accumulated[accumulated.length - 1];

    segment.centerline = centerline;
    segment.leftEdge = leftEdge;
    segment.rightEdge = rightEdge;
    segment.accumulatedLengths = accumulated;
    segment.endPosition = centerline[centerline.length - 1].clone();
    segment.endHeading = this.normalizeAngle(segment.startHeading + blueprint.deltaHeading);
    segment.cumulativeEnd = segment.cumulativeStart + totalLength;
  }

  private createSegmentMesh(segment: TrackSegment) {
    const pathArray = [segment.leftEdge, segment.rightEdge];

    const trackMesh = MeshBuilder.CreateRibbon(
      segment.id,
      { pathArray, sideOrientation: Mesh.DOUBLESIDE, updatable: false },
      this.scene
    );

    const material = new StandardMaterial(`${segment.id}_material`, this.scene);

    // Cor diferenciada para início e fim dos segmentos
    const isFirstSegment = segment.id === 'segment_0';
    const isConnectionPoint = this.segments.length > 0;

    // Asfalto cinza escuro com tom levemente azulado (mais realista)
    material.diffuseColor = new Color3(0.12, 0.13, 0.15); // Cinza escuro azulado

    if (isFirstSegment) {
      // Adicionar padrão xadrez no primeiro segmento (mantém cor cinza)
      this.createCheckerboardPattern(segment);
      // Primeiro segmento já visível
      material.alpha = 1;
    } else {
      // Habilitar transparência para fade-in nos outros segmentos
      material.alpha = 0;
    }

    // Melhor especularidade para asfalto realista
    material.specularColor = new Color3(0.08, 0.08, 0.10); // Leve brilho especular
    material.specularPower = 32; // Brilho suave
    material.emissiveColor = new Color3(0.01, 0.01, 0.02); // Levíssima emissão para melhor visibilidade
    material.transparencyMode = 2; // ALPHA_BLEND

    trackMesh.material = material;

    // CRITICAL: Freeze world matrix para eliminar jitter
    trackMesh.freezeWorldMatrix();
    trackMesh.doNotSyncBoundingInfo = true;

    segment.mesh = trackMesh;

    // Criar faixas amarelas centrais (somente se pista for larga o suficiente)
    const trackWidthRatio = this.trackWidth / 1.8; // Razão com largura do carro
    if (trackWidthRatio >= 2.0) { // Apenas se >= 200% do tamanho do carro
      this.createCenterLaneMarkings(segment);
    }

    // Criar faixas brancas laterais
    this.createSideLineMarkings(segment);
  }

  private createCheckerboardPattern(segment: TrackSegment) {
    // Criar padrão xadrez com 4 fileiras cruzando a pista
    const rows = 4;
    const cols = 8; // 8 colunas para ter largura adequada
    const squareSize = this.trackWidth / cols;

    // Posição no início do segmento, na frente do carro
    const segmentStart = segment.centerline[Math.floor(segment.centerline.length * 0.3)]; // 30% do segmento
    const startX = segmentStart.x - (this.trackWidth / 2);
    const startZ = segmentStart.z - (rows * squareSize / 2);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Padrão xadrez: alternar cores baseado na soma das coordenadas
        const isWhite = (row + col) % 2 === 0;

        if (isWhite) {
          // Criar apenas os quadrados brancos (pretos são o "buraco" na pista verde)
          const square = MeshBuilder.CreateGround(
            `checker_${segment.id}_${row}_${col}`,
            { width: squareSize * 0.9, height: squareSize * 0.9 }, // 90% do tamanho para criar espaçamento
            this.scene
          );

          // Posicionar o quadrado
          square.position.x = startX + (col * squareSize) + (squareSize / 2);
          square.position.y = segmentStart.y + 0.01; // Ligeiramente acima da pista
          square.position.z = startZ + (row * squareSize) + (squareSize / 2);

          // Material branco para os quadrados
          const checkerMaterial = new StandardMaterial(`checker_mat_${segment.id}_${row}_${col}`, this.scene);
          checkerMaterial.diffuseColor = new Color3(0.9, 0.9, 0.9); // Branco
          checkerMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
          square.material = checkerMaterial;

          // CRITICAL: Freeze world matrix
          square.freezeWorldMatrix();
          square.doNotSyncBoundingInfo = true;

          // Adicionar às barreiras para ser removido junto com o segmento
          segment.barriers.push(square);
        }
      }
    }
  }

  private createCenterLaneMarkings(segment: TrackSegment) {
    const { centerline } = segment;
    if (centerline.length < 2) return;

    // Parâmetros das faixas - completamente planas
    const laneWidth = 0.08; // Largura uniforme das faixas
    const laneGap = 0.16; // Distância entre as duas faixas

    // Criar duas faixas como pequenos grounds planos
    for (let i = 0; i < centerline.length - 1; i++) {
      const point1 = centerline[i];
      const point2 = centerline[i + 1];

      // Calcular direção e comprimento do segmento
      const direction = point2.subtract(point1);
      const segmentLength = direction.length();
      const normalizedDirection = direction.normalize();
      const perpendicular = new Vector3(-normalizedDirection.z, 0, normalizedDirection.x);

      // Ponto médio do segmento
      const midPoint = Vector3.Lerp(point1, point2, 0.5);

      // Criar faixa esquerda
      const leftLaneCenter = midPoint.add(perpendicular.scale(laneGap / 2));
      leftLaneCenter.y += 0.002; // Elevar ligeiramente

      const leftLaneMesh = MeshBuilder.CreateGround(
        `${segment.id}_left_lane_${i}`,
        { width: laneWidth, height: segmentLength },
        this.scene
      );

      leftLaneMesh.position = leftLaneCenter;
      leftLaneMesh.rotation.y = Math.atan2(normalizedDirection.x, normalizedDirection.z);

      // Criar faixa direita
      const rightLaneCenter = midPoint.subtract(perpendicular.scale(laneGap / 2));
      rightLaneCenter.y += 0.002; // Elevar ligeiramente

      const rightLaneMesh = MeshBuilder.CreateGround(
        `${segment.id}_right_lane_${i}`,
        { width: laneWidth, height: segmentLength },
        this.scene
      );

      rightLaneMesh.position = rightLaneCenter;
      rightLaneMesh.rotation.y = Math.atan2(normalizedDirection.x, normalizedDirection.z);

      // Material amarelo vibrante com emissão
      const laneMaterial = new StandardMaterial(`${segment.id}_lane_mat_${i}`, this.scene);
      laneMaterial.diffuseColor = new Color3(1.0, 0.95, 0.0); // Amarelo vibrante
      laneMaterial.emissiveColor = new Color3(0.4, 0.38, 0.0); // Emissão forte para destaque
      laneMaterial.specularColor = new Color3(0.6, 0.6, 0.0);
      laneMaterial.specularPower = 16; // Brilho suave
      laneMaterial.backFaceCulling = false; // Visível dos dois lados

      leftLaneMesh.material = laneMaterial;
      rightLaneMesh.material = laneMaterial;

      // Desabilitar física e colisões
      leftLaneMesh.checkCollisions = false;
      leftLaneMesh.isPickable = false;
      rightLaneMesh.checkCollisions = false;
      rightLaneMesh.isPickable = false;

      // CRITICAL: Freeze world matrices
      leftLaneMesh.freezeWorldMatrix();
      leftLaneMesh.doNotSyncBoundingInfo = true;
      rightLaneMesh.freezeWorldMatrix();
      rightLaneMesh.doNotSyncBoundingInfo = true;

      segment.barriers.push(leftLaneMesh, rightLaneMesh);
    }
  }

  private createSideLineMarkings(segment: TrackSegment) {
    const { leftEdge, rightEdge } = segment;
    if (leftEdge.length < 2 || rightEdge.length < 2) return;

    const lineWidth = 0.08; // Faixas brancas mais visíveis
    const isFirstSegment = segment.id === 'segment_0';

    // Criar faixa branca no lado esquerdo
    for (let i = 0; i < leftEdge.length - 1; i++) {
      const point1 = leftEdge[i];
      const point2 = leftEdge[i + 1];

      const direction = point2.subtract(point1);
      const segmentLength = direction.length();
      const normalizedDirection = direction.normalize();
      const midPoint = Vector3.Lerp(point1, point2, 0.5);

      midPoint.y += 0.005; // Elevar mais para ficar acima da pista

      const leftLineMesh = MeshBuilder.CreateGround(
        `${segment.id}_left_side_line_${i}`,
        { width: lineWidth, height: segmentLength },
        this.scene
      );

      leftLineMesh.position = midPoint;
      leftLineMesh.rotation.y = Math.atan2(normalizedDirection.x, normalizedDirection.z);

      const lineMaterial = new StandardMaterial(`${segment.id}_left_side_mat_${i}`, this.scene);
      lineMaterial.diffuseColor = new Color3(1.0, 1.0, 1.0); // Branco puro
      lineMaterial.emissiveColor = new Color3(0.5, 0.5, 0.5); // Emissão forte para visibilidade
      lineMaterial.specularColor = new Color3(0.8, 0.8, 0.8);
      lineMaterial.specularPower = 32; // Brilho para parecer refletivo
      lineMaterial.backFaceCulling = false;

      // Aplicar transparência para fade-in (exceto primeiro segmento)
      if (!isFirstSegment) {
        lineMaterial.alpha = 0;
        lineMaterial.transparencyMode = 2; // ALPHA_BLEND
      }

      leftLineMesh.material = lineMaterial;
      leftLineMesh.checkCollisions = false;
      leftLineMesh.isPickable = false;
      leftLineMesh.freezeWorldMatrix();
      leftLineMesh.doNotSyncBoundingInfo = true;

      segment.barriers.push(leftLineMesh);
    }

    // Criar faixa branca no lado direito
    for (let i = 0; i < rightEdge.length - 1; i++) {
      const point1 = rightEdge[i];
      const point2 = rightEdge[i + 1];

      const direction = point2.subtract(point1);
      const segmentLength = direction.length();
      const normalizedDirection = direction.normalize();
      const midPoint = Vector3.Lerp(point1, point2, 0.5);

      midPoint.y += 0.005; // Elevar mais para ficar acima da pista

      const rightLineMesh = MeshBuilder.CreateGround(
        `${segment.id}_right_side_line_${i}`,
        { width: lineWidth, height: segmentLength },
        this.scene
      );

      rightLineMesh.position = midPoint;
      rightLineMesh.rotation.y = Math.atan2(normalizedDirection.x, normalizedDirection.z);

      const lineMaterial = new StandardMaterial(`${segment.id}_right_side_mat_${i}`, this.scene);
      lineMaterial.diffuseColor = new Color3(1.0, 1.0, 1.0); // Branco puro
      lineMaterial.emissiveColor = new Color3(0.5, 0.5, 0.5); // Emissão forte para visibilidade
      lineMaterial.specularColor = new Color3(0.8, 0.8, 0.8);
      lineMaterial.specularPower = 32; // Brilho para parecer refletivo
      lineMaterial.backFaceCulling = false;

      // Aplicar transparência para fade-in (exceto primeiro segmento)
      if (!isFirstSegment) {
        lineMaterial.alpha = 0;
        lineMaterial.transparencyMode = 2; // ALPHA_BLEND
      }

      rightLineMesh.material = lineMaterial;
      rightLineMesh.checkCollisions = false;
      rightLineMesh.isPickable = false;
      rightLineMesh.freezeWorldMatrix();
      rightLineMesh.doNotSyncBoundingInfo = true;

      segment.barriers.push(rightLineMesh);
    }
  }

  private createSegmentBarriers(segment: TrackSegment) {
    if (segment.leftEdge.length === 0 || segment.rightEdge.length === 0) {
      return;
    }

    const leftBarrier = MeshBuilder.CreateTube(
      `${segment.id}_barrier_left`,
      {
        path: segment.leftEdge.map((p) => p.clone().add(new Vector3(0, 0.75, 0))),
        radius: 0.16, // Ligeiramente maior para melhor visibilidade
        tessellation: 12, // Mais suave
        sideOrientation: Mesh.DOUBLESIDE
      },
      this.scene
    );

    const rightBarrier = MeshBuilder.CreateTube(
      `${segment.id}_barrier_right`,
      {
        path: segment.rightEdge.map((p) => p.clone().add(new Vector3(0, 0.75, 0))),
        radius: 0.16, // Ligeiramente maior para melhor visibilidade
        tessellation: 12, // Mais suave
        sideOrientation: Mesh.DOUBLESIDE
      },
      this.scene
    );

    const barrierMaterial = new StandardMaterial(`${segment.id}_barrier_material`, this.scene);
    // Vermelho neon mais vibrante
    barrierMaterial.diffuseColor = new Color3(0.9, 0.15, 0.15);
    barrierMaterial.emissiveColor = new Color3(0.6, 0.1, 0.1); // Emissão forte para efeito neon
    barrierMaterial.specularColor = new Color3(0.4, 0.05, 0.05);
    barrierMaterial.specularPower = 64; // Brilho metálico

    leftBarrier.material = barrierMaterial;
    rightBarrier.material = barrierMaterial;

    // CRITICAL: Freeze world matrices para eliminar jitter
    leftBarrier.freezeWorldMatrix();
    leftBarrier.doNotSyncBoundingInfo = true;
    rightBarrier.freezeWorldMatrix();
    rightBarrier.doNotSyncBoundingInfo = true;

    segment.barriers.push(leftBarrier, rightBarrier);
    this.barriers.push(leftBarrier, rightBarrier);
  }

  private pendingDisposals: Array<{ mesh?: Mesh; barriers: Mesh[] }> = [];
  private lastCleanupTime = 0;

  public syncToDistance(distance: number) {
    // Gerar segmentos antecipadamente (apenas 1 por chamada para evitar lag)
    if (distance + this.lookAheadDistance > this.totalLength) {
      this.generateNextSegment();
    }

    const safeDistance = Math.max(0, distance - 150); // Aumentar margem de segurança

    // Marcar segmentos para disposal ao invés de remover imediatamente
    const survivors: TrackSegment[] = [];
    this.segments.forEach((segment) => {
      if (segment.cumulativeEnd < safeDistance) {
        // Adicionar à fila de disposal ao invés de remover imediatamente
        this.pendingDisposals.push({
          mesh: segment.mesh,
          barriers: segment.barriers
        });
        return;
      }

      // Atualizar opacidade baseado na distância do carro
      this.updateSegmentOpacity(segment, distance);

      survivors.push(segment);
    });

    this.segments = survivors;
  }

  private updateSegmentOpacity(segment: TrackSegment, carDistance: number) {
    // Distância do carro até o início do segmento
    const distanceToSegment = segment.cumulativeStart - carDistance;

    // Fade-in: 0 quando muito longe, 1 quando próximo
    // Começar fade a 200 unidades de distância, completar a 50 unidades
    const fadeStartDistance = 200;
    const fadeEndDistance = 50;

    let alpha = 1;
    if (distanceToSegment > fadeEndDistance) {
      if (distanceToSegment >= fadeStartDistance) {
        alpha = 0;
      } else {
        // Interpolação suave entre 0 e 1
        const fadeProgress = (fadeStartDistance - distanceToSegment) / (fadeStartDistance - fadeEndDistance);
        alpha = Math.min(1, Math.max(0, fadeProgress));
      }
    }

    // Aplicar alpha na pista principal
    if (segment.mesh && segment.mesh.material) {
      const material = segment.mesh.material as StandardMaterial;
      material.alpha = alpha;
    }

    // Aplicar alpha em todos os barriers (incluindo linhas laterais e barreiras)
    segment.barriers.forEach(barrier => {
      if (barrier.material) {
        const barrierMaterial = barrier.material as StandardMaterial;
        // Só aplicar fade-in se o material tiver transparência habilitada
        if (barrierMaterial.transparencyMode === 2) {
          barrierMaterial.alpha = alpha;
        }
      }
    });
  }

  // Limpar geometria em lote, fora do frame crítico
  public cleanupGeometry() {
    const now = performance.now();

    // Limpar apenas a cada 100ms para evitar impacto no framerate
    if (now - this.lastCleanupTime < 100) {
      return;
    }

    // Limpar no máximo 2 meshes por vez
    const toClean = this.pendingDisposals.splice(0, 2);
    toClean.forEach(({ mesh, barriers }) => {
      mesh?.dispose(false, true);
      barriers.forEach((barrier) => barrier.dispose(false, true));
    });

    this.lastCleanupTime = now;
  }

  public getSampleAtDistance(distance: number): TrackSample | null {
    if (this.segments.length === 0) {
      return null;
    }

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

  public getClosestSample(position: Vector3): TrackSample | null {
    let closest: TrackSample | null = null;
    let closestDistanceSq = Number.POSITIVE_INFINITY;

    for (const segment of this.segments) {
      const { centerline } = segment;
      for (let i = 0; i < centerline.length - 1; i++) {
        const a = centerline[i];
        const b = centerline[i + 1];

        const ab = b.clone().subtract(a);
        const abXZ = new Vector3(ab.x, 0, ab.z);
        const lengthSq = abXZ.lengthSquared();
        if (lengthSq < 1e-6) {
          continue;
        }

        const toPoint = new Vector3(position.x - a.x, 0, position.z - a.z);
        let t = Vector3.Dot(toPoint, abXZ) / lengthSq;
        t = Math.max(0, Math.min(1, t));

        const pointX = a.x + ab.x * t;
        const pointY = a.y + (b.y - a.y) * t;
        const pointZ = a.z + ab.z * t;

        const leftPoint = Vector3.Lerp(segment.leftEdge[i], segment.leftEdge[i + 1], t);
        const rightPoint = Vector3.Lerp(segment.rightEdge[i], segment.rightEdge[i + 1], t);

        const diffX = position.x - pointX;
        const diffZ = position.z - pointZ;
        const distSq = diffX * diffX + diffZ * diffZ;

        if (distSq < closestDistanceSq) {
          const forwardVec = b.clone().subtract(a).normalize();
          const lateral = rightPoint.clone().subtract(leftPoint);
          const width = lateral.length();
          const right = lateral.normalize();
          closestDistanceSq = distSq;
          closest = {
            position: new Vector3(pointX, pointY, pointZ),
            forward: forwardVec,
            right,
            width,
            segmentId: segment.id
          };
        }
      }
    }

    return closest;
  }

  private sampleSegment(segment: TrackSegment, localDistance: number): TrackSample {
    const { centerline, accumulatedLengths } = segment;

    if (centerline.length < 2) {
      return {
        position: segment.endPosition.clone(),
        forward: new Vector3(Math.sin(segment.endHeading), 0, Math.cos(segment.endHeading)),
        right: new Vector3(-Math.cos(segment.endHeading), 0, Math.sin(segment.endHeading)),
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
    const prevPoint = centerline[prevIndex];
    const nextPoint = centerline[Math.min(index, centerline.length - 1)];
    const prevAccum = accumulatedLengths[prevIndex];
    const nextAccum = accumulatedLengths[Math.min(index, accumulatedLengths.length - 1)];
    const span = Math.max(0.001, nextAccum - prevAccum);
    const t = Math.min(1, Math.max(0, (localDistance - prevAccum) / span));
    const position = Vector3.Lerp(prevPoint, nextPoint, t);

    const forwardVec = nextPoint.clone().subtract(prevPoint).normalize();
    const leftPoint = Vector3.Lerp(segment.leftEdge[prevIndex], segment.leftEdge[Math.min(index, segment.leftEdge.length - 1)], t);
    const rightPoint = Vector3.Lerp(segment.rightEdge[prevIndex], segment.rightEdge[Math.min(index, segment.rightEdge.length - 1)], t);
    const lateral = rightPoint.clone().subtract(leftPoint);
    const width = lateral.length();
    const right = lateral.normalize();

    return {
      position,
      forward: forwardVec,
      right,
      width,
      segmentId: segment.id
    };
  }

  public checkBounds(position: Vector3, carHalfWidth: number): boolean {
    // Encontra o segmento mais próximo
    let closestSegment: TrackSegment | null = null;
    let minDistanceSq = Number.POSITIVE_INFINITY;

    for (const segment of this.segments) {
      for (let i = 0; i < segment.centerline.length; i++) {
        const centerPoint = segment.centerline[i];
        const distSq = Vector3.DistanceSquared(position, centerPoint);
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          closestSegment = segment;
        }
      }
    }

    if (!closestSegment) {
      return true;
    }

    // Verifica colisão detalhada com as bordas do segmento
    return this.checkSegmentBounds(position, carHalfWidth, closestSegment);
  }

  private checkSegmentBounds(position: Vector3, carHalfWidth: number, segment: TrackSegment): boolean {
    const carPos2D = new Vector3(position.x, 0, position.z);
    const barrierThickness = 0.18;
    const collisionThreshold = carHalfWidth + barrierThickness;

    // Verifica colisão com borda esquerda (barreira vermelha)
    for (let i = 0; i < segment.leftEdge.length - 1; i++) {
      const p1 = new Vector3(segment.leftEdge[i].x, 0, segment.leftEdge[i].z);
      const p2 = new Vector3(segment.leftEdge[i + 1].x, 0, segment.leftEdge[i + 1].z);

      const distance = this.distanceToLineSegment(carPos2D, p1, p2);
      if (distance < collisionThreshold) {
        return false; // Colisão com barreira esquerda
      }
    }

    // Verifica colisão com borda direita (barreira vermelha)
    for (let i = 0; i < segment.rightEdge.length - 1; i++) {
      const p1 = new Vector3(segment.rightEdge[i].x, 0, segment.rightEdge[i].z);
      const p2 = new Vector3(segment.rightEdge[i + 1].x, 0, segment.rightEdge[i + 1].z);

      const distance = this.distanceToLineSegment(carPos2D, p1, p2);
      if (distance < collisionThreshold) {
        return false; // Colisão com barreira direita
      }
    }

    return true; // Nenhuma colisão
  }

  private distanceToLineSegment(point: Vector3, lineStart: Vector3, lineEnd: Vector3): number {
    const line = lineEnd.subtract(lineStart);
    const lineLength = line.length();

    if (lineLength < 0.001) {
      return Vector3.Distance(point, lineStart);
    }

    const lineDirection = line.normalize();
    const toPoint = point.subtract(lineStart);
    const projection = Vector3.Dot(toPoint, lineDirection);

    // Clamp projeção para o segmento
    const clampedProjection = Math.max(0, Math.min(lineLength, projection));
    const closestPointOnLine = lineStart.add(lineDirection.scale(clampedProjection));

    return Vector3.Distance(point, closestPointOnLine);
  }

  getHalfWidth() {
    return this.trackWidth / 2;
  }

  getTrackCenterPosition(): Vector3 {
    if (this.segments.length === 0) {
      return new Vector3(0, 0, 0);
    }
    const segment = this.segments[0];
    return segment.centerline[0]?.clone() ?? new Vector3(0, 0, 0);
  }

  resetTrack() {
    this.segments.forEach((segment) => {
      segment.mesh?.dispose(false, true);
      segment.barriers.forEach((barrier) => barrier.dispose(false, true));
    });
    this.segments = [];
    this.barriers = [];
    this.currentPosition = new Vector3(0, 0, 0);
    this.currentHeading = 0;
    this.segmentCount = 0;
    this.totalLength = 0;
    this.generateInitialSegments();
  }

  dispose() {
    // Limpar pending disposals primeiro
    this.pendingDisposals.forEach(({ mesh, barriers }) => {
      mesh?.dispose(false, true);
      barriers.forEach((barrier) => barrier.dispose(false, true));
    });
    this.pendingDisposals = [];

    this.resetTrack();
  }

  private smoothPath(path: Vector3[]) {
    if (path.length < 3) return;

    // Aplicar filtro de suavização múltiplas vezes para eliminar ondulações
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i - 1];
        const current = path[i];
        const next = path[i + 1];

        // Suavização apenas na altura (Y) para manter forma lateral
        const smoothedY = (prev.y + current.y * 2 + next.y) / 4; // Peso maior no ponto atual
        path[i].y = smoothedY;
      }
    }
  }

  private normalizeAngle(value: number) {
    let angle = value;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}
