import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";

export class StarField {
  private starMeshes: Mesh[] = [];
  private material!: StandardMaterial;
  private readonly starCount: number; // Ajustado baseado na plataforma
  private readonly scene: Scene;

  constructor(scene: Scene, isMobile: boolean = false) {
    this.scene = scene;
    // Ajustar quantidade de estrelas baseado na plataforma (menos objetos para reduzir tremor)
    this.starCount = isMobile ? 500 : 1800;
    this.createStarMaterial();
    this.generateStars();
  }

  private createStarMaterial() {
    this.material = new StandardMaterial("starMaterial", this.scene);
    this.material.diffuseColor = new Color3(1, 1, 1); // Branco puro
    this.material.emissiveColor = new Color3(0.8, 0.8, 1.0); // Brilho azulado
    this.material.specularColor = new Color3(0, 0, 0); // Sem reflexo especular
    this.material.disableLighting = true; // Sem iluminação para brilho constante
    this.material.backFaceCulling = false;
  }

  private generateStars() {
    for (let i = 0; i < this.starCount; i++) {
      this.createStar(i);
    }
  }

  private createStar(index: number) {
    // Criar estrela como pequena esfera otimizada (baixa tesselagem)
    const star = MeshBuilder.CreateSphere(
      `star_${index}`,
      { diameter: this.getRandomStarSize(), segments: 6 }, // Baixa tesselagem para performance
      this.scene
    );

    // Posição aleatória em uma esfera gigante ao redor do jogador
    const radius = 600 + Math.random() * 300; // Distância ajustada para melhor performance
    const phi = Math.random() * Math.PI * 2; // Ângulo horizontal
    const theta = Math.random() * Math.PI; // Ângulo vertical

    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(theta) * Math.sin(phi);

    star.position = new Vector3(x, y, z);
    star.material = this.material;

    // Reduzir variação de material para melhor performance (menos drawcalls)
    // Usar apenas um material compartilhado

    // CRITICAL: Não freezar estrelas pois elas se movem com o jogador
    // Mas podemos otimizar
    star.alwaysSelectAsActiveMesh = true;
    star.doNotSyncBoundingInfo = true;

    this.starMeshes.push(star);
  }

  private getRandomStarSize(): number {
    // Variação no tamanho das estrelas
    const rand = Math.random();
    if (rand < 0.7) {
      return 0.3 + Math.random() * 0.4; // Estrelas pequenas (70%)
    } else if (rand < 0.9) {
      return 0.8 + Math.random() * 0.6; // Estrelas médias (20%)
    } else {
      return 1.2 + Math.random() * 0.8; // Estrelas grandes (10%)
    }
  }

  private lastPlayerPosition = new Vector3(0, 0, 0);
  private updateCounter = 0;

  update(playerPosition: Vector3) {
    // Atualizar estrelas de forma sincronizada
    const movementDelta = Vector3.Distance(playerPosition, this.lastPlayerPosition);

    if (movementDelta < 1) {
      return; // Não atualizar se o movimento foi muito pequeno
    }

    const followFactor = 0.98;
    const offset = playerPosition.subtract(this.lastPlayerPosition).scale(followFactor);

    // Atualizar TODAS as estrelas de uma vez para movimento sincronizado
    for (let i = 0; i < this.starMeshes.length; i++) {
      this.starMeshes[i].position.addInPlace(offset);
    }

    this.lastPlayerPosition.copyFrom(playerPosition);
  }

  dispose() {
    this.starMeshes.forEach(star => star.dispose());
    this.starMeshes = [];
    this.material.dispose();
  }
}
