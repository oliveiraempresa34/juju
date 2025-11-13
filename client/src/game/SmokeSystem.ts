import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3, VertexBuffer } from "@babylonjs/core";

interface SmokeParticle {
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
}

export class SmokeSystem {
  private particles: SmokeParticle[] = [];
  private smokeMeshes: Mesh[] = [];
  private material!: StandardMaterial;
  private maxParticles = 72; // Reduzido 70% (240 * 0.3 = 72)
  private emissionRate = 0.01; // Emissão mais espaçada para menos lag
  private lastEmission = 0;

  constructor(private readonly scene: Scene) {
    this.setupMaterial();
  }

  private setupMaterial() {
    this.material = new StandardMaterial("smokeMaterial", this.scene);
    this.material.diffuseColor = new Color3(1.0, 1.0, 1.0); // Branco puro
    this.material.emissiveColor = new Color3(0.3, 0.3, 0.3); // Emissão branca para garantir visibilidade
    this.material.specularColor = new Color3(0, 0, 0); // Remove reflexo especular
    this.material.alpha = 0.6; // Opacidade reduzida em 25%
    this.material.backFaceCulling = false;
    this.material.disableLighting = true; // Desabilita iluminação para cor uniforme
  }

  private frameCounter = 0;

  update(carPosition: Vector3, carYaw: number, deltaTime: number, turnStrength: number, isClicking: boolean) {
    const now = performance.now() / 1000;

    // Emite fumaça sempre que estiver clicando na tela
    const shouldEmitSmoke = isClicking;

    if (shouldEmitSmoke && (now - this.lastEmission) > this.emissionRate) {
      this.emitParticle(carPosition, carYaw, turnStrength);
      this.lastEmission = now;
    }

    // Atualiza partículas existentes
    this.updateParticles(deltaTime);

    // Cleanup e update de meshes apenas a cada 2 frames para performance
    this.frameCounter++;
    if (this.frameCounter % 2 === 0) {
      this.cleanupParticles();
      this.updateMeshes();
    }
  }

  private emitParticle(carPosition: Vector3, carYaw: number, turnStrength: number) {
    // Remove limite rígido - permite emissão contínua
    // Cleanup automático vai gerenciar o número de partículas

    // Emite múltiplas partículas para criar dois feixes densos
    const particlesToEmit = 3; // Reduzido 70% (10 * 0.3 = 3)

    for (let i = 0; i < particlesToEmit; i++) {
      if (this.particles.length >= this.maxParticles) break; // Limite soft para performance

      // Configurações do carro
      const carWidth = 1.2; // Largura um pouco maior
      const backDistance = 1.4; // Mais atrás para cantos inferiores
      const lowerHeight = -0.1; // Altura mais baixa (cantos inferiores)

      // Posição base atrás e abaixo do carro
      const backOffset = new Vector3(
        -Math.sin(carYaw) * backDistance,
        lowerHeight, // Posição mais baixa
        -Math.cos(carYaw) * backDistance
      );

      // Cria duas posições fixas: canto esquerdo e direito traseiro inferior
      const leftCornerOffset = new Vector3(
        Math.cos(carYaw) * (carWidth / 2), // Lado esquerdo
        0,
        -Math.sin(carYaw) * (carWidth / 2)
      );

      const rightCornerOffset = new Vector3(
        Math.cos(carYaw) * (-carWidth / 2), // Lado direito
        0,
        -Math.sin(carYaw) * (-carWidth / 2)
      );

      // Alterna entre os dois cantos para criar dois feixes distintos
      const useLeftCorner = (i % 2 === 0);
      const cornerOffset = useLeftCorner ? leftCornerOffset : rightCornerOffset;

      // Variação menor para manter feixes coesos
      const randomVariation = new Vector3(
        (Math.random() - 0.5) * 0.15, // Variação muito pequena
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.15
      );

      const startPosition = carPosition.add(backOffset).add(cornerOffset).add(randomVariation);

      // Velocidade inicial direcionada para criar feixes
      const velocity = new Vector3(
        (Math.random() - 0.5) * 0.8, // Velocidade lateral menor
        Math.random() * 1.5 + 0.3, // Sobe mais devagar
        (Math.random() - 0.5) * 0.8 // Velocidade frontal/traseira menor
      );

      const maxLife = 1.46; // Aumentado 60% (0.91 * 1.6 = 1.46) - duram 60% mais tempo antes de sumir

      const particle: SmokeParticle = {
        position: startPosition,
        velocity,
        life: 0,
        maxLife,
        size: Math.random() * 0.4 + 0.3, // Partículas maiores para melhor visibilidade
        alpha: 0.6 // Alpha inicial reduzido em 25%
      };

      this.particles.push(particle);
    }
  }

  private updateParticles(deltaTime: number) {
    this.particles.forEach(particle => {
      // Atualiza posição
      particle.position.addInPlace(particle.velocity.scale(deltaTime));

      // Aplica gravidade e resistência do ar mais suave
      particle.velocity.y -= 0.5 * deltaTime; // Gravidade mais leve
      particle.velocity.scaleInPlace(0.98); // Menos resistência para manter movimento

      // Atualiza vida
      particle.life += deltaTime;

      // Fade out natural e gradual para fumaça branca
      const lifeRatio = particle.life / particle.maxLife;
      const fadeStart = 0.2; // Começa a desaparecer aos 20% da vida

      if (lifeRatio < fadeStart) {
        particle.alpha = 0.6; // Mantém opacidade reduzida em 25% no início
      } else {
        const fadeRatio = (lifeRatio - fadeStart) / (1 - fadeStart);
        particle.alpha = Math.max(0, 0.6 * (1 - fadeRatio)); // Fade gradual com opacidade reduzida
      }

      // Cresce mais devagar
      particle.size += deltaTime * 0.15;
    });
  }

  private cleanupParticles() {
    this.particles = this.particles.filter(particle =>
      particle.life < particle.maxLife && particle.alpha > 0.01
    );
  }

  private updateMeshes() {
    // Remove meshes desnecessárias
    while (this.smokeMeshes.length > this.particles.length) {
      const mesh = this.smokeMeshes.pop();
      mesh?.dispose();
    }

    // Cria novas meshes se necessário (esferas para partículas redondas)
    while (this.smokeMeshes.length < this.particles.length) {
      const mesh = MeshBuilder.CreateSphere(
        `smoke_${this.smokeMeshes.length}`,
        { diameter: 1, segments: 8 }, // Baixa tesselagem para performance
        this.scene
      );
      mesh.material = this.material;
      this.smokeMeshes.push(mesh);
    }

    // Atualiza posições e tamanhos
    this.particles.forEach((particle, index) => {
      const mesh = this.smokeMeshes[index];
      if (mesh) {
        mesh.position.copyFrom(particle.position);
        mesh.scaling.setAll(particle.size);

        // Atualiza alpha do material
        if (mesh.material) {
          (mesh.material as StandardMaterial).alpha = particle.alpha;
        }
      }
    });
  }

  // Métodos para configurar performance em mobile
  setMaxParticles(count: number) {
    this.maxParticles = count;
  }

  setEmissionRate(rate: number) {
    this.emissionRate = rate;
  }

  dispose() {
    this.smokeMeshes.forEach(mesh => mesh.dispose());
    this.smokeMeshes = [];
    this.particles = [];
    this.material.dispose();
  }
}