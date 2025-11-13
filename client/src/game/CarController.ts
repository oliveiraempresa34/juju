import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import type { PlayerSnapshot } from "../store/useRoom";

const ghostColor = new Color3(0.25, 0.25, 0.3); // Cinza mais escuro para fantasmas

// Mapeamento de cores disponíveis
const COLOR_MAP: Record<string, Color3> = {
  blue: new Color3(0.1, 0.3, 0.9),
  green: new Color3(0.1, 0.8, 0.3),
  yellow: new Color3(0.95, 0.85, 0.1),
  pink: new Color3(0.95, 0.3, 0.7),
};

export class CarController {
  private readonly cars = new Map<string, Mesh>();
  private localId?: string;
  private localCarColor: Color3 = COLOR_MAP.blue; // Cor padrão

  constructor(private readonly scene: Scene) {}

  setLocalCarColor(colorName: string) {
    this.localCarColor = COLOR_MAP[colorName] || COLOR_MAP.blue;
    // Atualizar a cor do carro local se já existir
    if (this.localId) {
      const localCar = this.cars.get(this.localId);
      if (localCar) {
        this.updateCarColor(localCar, this.localCarColor, true);
      }
    }
  }

  private updateCarColor(carGroup: Mesh, color: Color3, isLocal: boolean) {
    if (carGroup.getChildren) {
      carGroup.getChildren().forEach(child => {
        const childMesh = child as Mesh;
        if (childMesh.material) {
          const material = childMesh.material as StandardMaterial;
          if (material) {
            // Aplicar opacidade a TODOS os componentes do carro
            const targetAlpha = isLocal ? 1.0 : 0.6; // Adversários com 60% de opacidade

            // Carroceria (chassis, capô, teto, spoiler)
            if (childMesh.name.includes('chassis') ||
                childMesh.name.includes('hood') ||
                childMesh.name.includes('roof') ||
                childMesh.name.includes('spoiler')) {
              material.diffuseColor = color;
              material.alpha = targetAlpha;
            }

            // Vidro (windshield) - mais transparente para adversários
            if (childMesh.name.includes('windshield')) {
              material.alpha = isLocal ? 0.3 : 0.15;
            }

            // Rodas (pneus e aros) - mesma opacidade que a carroceria
            if (childMesh.name.includes('tire') || childMesh.name.includes('rim')) {
              material.alpha = targetAlpha;
            }

            // Lanternas traseiras - mesma opacidade
            if (childMesh.name.includes('taillight')) {
              material.alpha = targetAlpha;
            }

            // Faixas laterais - mesma opacidade
            if (childMesh.name.includes('stripe')) {
              material.alpha = targetAlpha;
            }
          }
        }
      });
    }
  }

  setLocalPlayer(id: string) {
    this.localId = id;
    this.cars.forEach((mesh, meshId) => {
      if (meshId === id) {
        this.updateCarColor(mesh, this.localCarColor, true);
      } else {
        this.updateCarColor(mesh, ghostColor, false);
      }
    });
  }

  update(snapshot: PlayerSnapshot) {
    const mesh = this.getOrCreate(snapshot.id);
    mesh.position.x = snapshot.x;
    mesh.position.y = snapshot.y; // Usar diretamente a posição Y calculada pela física
    mesh.position.z = snapshot.z;
    mesh.rotation.y = snapshot.yaw;

    // Aplicar inclinações da pista ao carro para que siga a curvatura
    if (snapshot.pitch !== undefined) {
      mesh.rotation.x = snapshot.pitch; // Inclinação para frente/trás
    }
    if (snapshot.roll !== undefined) {
      mesh.rotation.z = snapshot.roll; // Inclinação lateral (banking)
    }

    // Rotacionar rodas dianteiras baseado no input do jogador (30% mais lento)
    // steering: -1 = esquerda, +1 = direita
    // Quando vira esquerda, rodas viram direita (contra-esterço) e vice-versa
    const wheelSteerAngle = snapshot.steering
      ? -(snapshot.steering * Math.PI / 6 * 0.7)  // Inverte: esq=-21°, dir=+21° (30% mais lento)
      : 0;

    if (mesh.getChildren) {
      mesh.getChildren().forEach(child => {
        const childMesh = child as Mesh;

        // Rotacionar rodas dianteiras
        if ((childMesh as any).isFrontWheel) {
          childMesh.rotation.y = wheelSteerAngle;
        }

        // Controlar faixa central de freio (bordô -> vermelho vibrante quando controles ativos)
        if (childMesh.name.includes('center-taillight') && (childMesh as any).isBrakeLight) {
          const material = childMesh.material as StandardMaterial;
          if (material) {
            if (snapshot.pressing) {
              material.emissiveColor = new Color3(1.0, 0.0, 0.0); // VERMELHO VIBRANTE quando controles ativos
              material.diffuseColor = new Color3(0.9, 0.0, 0.0);
            } else {
              material.emissiveColor = new Color3(0.4, 0.0, 0.05); // BORDÔ quando inativo
              material.diffuseColor = new Color3(0.6, 0.0, 0.0);
            }
          }
        }

        // Aplicar material
        if (childMesh.material && (childMesh.name.includes('chassis') ||
            childMesh.name.includes('hood') ||
            childMesh.name.includes('roof') ||
            childMesh.name.includes('spoiler'))) {
          const material = childMesh.material as StandardMaterial;
          if (material) {
            const isLocal = snapshot.id === this.localId;
            material.diffuseColor = isLocal ? this.localCarColor : ghostColor;
            material.alpha = isLocal ? 1 : 0.5;
          }
        }
      });
    } else {
      // Fallback para carros antigos (caixa simples)
      const material = mesh.material as StandardMaterial | null;
      if (material) {
        const isLocal = snapshot.id === this.localId;
        material.diffuseColor = isLocal ? this.localCarColor : ghostColor;
        material.alpha = isLocal ? 1 : 0.5;
      }
    }
  }

  prune(activeIds: Set<string>) {
    Array.from(this.cars.keys()).forEach((id) => {
      if (!activeIds.has(id)) {
        this.cars.get(id)?.dispose(false, true);
        this.cars.delete(id);
      }
    });
  }

  forEach(callback: (mesh: Mesh, id: string) => void) {
    this.cars.forEach((mesh, id) => callback(mesh, id));
  }

  getMesh(id: string) {
    return this.cars.get(id);
  }

  dispose() {
    this.cars.forEach((mesh) => mesh.dispose(false, true));
    this.cars.clear();
  }

  private getOrCreate(id: string): Mesh {
    const existing = this.cars.get(id);
    if (existing) {
      return existing;
    }

    // Criar um carro mais realista no estilo Skyline
    const carGroup = new Mesh(`car-group-${id}`, this.scene);

    // Chassis principal (corpo do carro)
    const chassis = MeshBuilder.CreateBox(
      `car-chassis-${id}`,
      { height: 0.4, width: 1.8, depth: 4.2 },
      this.scene
    );
    chassis.position.y = 0.2;
    chassis.parent = carGroup;

    // Capô (mais baixo e alongado)
    const hood = MeshBuilder.CreateBox(
      `car-hood-${id}`,
      { height: 0.15, width: 1.6, depth: 1.4 },
      this.scene
    );
    hood.position.set(0, 0.475, 1.4);
    hood.parent = carGroup;

    // Teto (menor para parecer esportivo)
    const roof = MeshBuilder.CreateBox(
      `car-roof-${id}`,
      { height: 0.3, width: 1.4, depth: 2.0 },
      this.scene
    );
    roof.position.set(0, 0.55, -0.2);
    roof.parent = carGroup;

    // Para-brisa dianteiro
    const windshield = MeshBuilder.CreateBox(
      `car-windshield-${id}`,
      { height: 0.25, width: 1.3, depth: 0.1 },
      this.scene
    );
    windshield.position.set(0, 0.525, 0.9);
    windshield.rotation.x = -0.2; // Inclinação do para-brisa
    windshield.parent = carGroup;

    // Spoiler traseiro (característico do Skyline)
    const spoiler = MeshBuilder.CreateBox(
      `car-spoiler-${id}`,
      { height: 0.1, width: 1.6, depth: 0.3 },
      this.scene
    );
    spoiler.position.set(0, 0.7, -2.0);
    spoiler.parent = carGroup;

    // Rodas com suporte para rotação
    const wheelPositions = [
      { x: 0.8, z: 1.3, isFront: true, name: 'front-right' },
      { x: -0.8, z: 1.3, isFront: true, name: 'front-left' },
      { x: 0.8, z: -1.3, isFront: false, name: 'rear-right' },
      { x: -0.8, z: -1.3, isFront: false, name: 'rear-left' }
    ];

    wheelPositions.forEach((pos) => {
      // Container da roda para permitir rotação
      const wheelContainer = new Mesh(`car-wheel-container-${id}-${pos.name}`, this.scene);
      wheelContainer.position.set(pos.x, 0.1, pos.z);
      wheelContainer.parent = carGroup;

      // Pneu
      const tire = MeshBuilder.CreateCylinder(
        `car-tire-${id}-${pos.name}`,
        { height: 0.35, diameter: 0.8, tessellation: 16 },
        this.scene
      );
      tire.rotation.z = Math.PI / 2;
      tire.parent = wheelContainer;

      const tireMaterial = new StandardMaterial(`tire-material-${id}-${pos.name}`, this.scene);
      tireMaterial.diffuseColor = new Color3(0.05, 0.05, 0.05); // Preto mais escuro
      tireMaterial.specularColor = new Color3(0.08, 0.08, 0.08); // Brilho sutil (borracha)
      tireMaterial.specularPower = 8; // Baixo brilho (borracha matte)
      tireMaterial.transparencyMode = 2; // ALPHA_BLEND
      tire.material = tireMaterial;

      // Aro (rim) cromado
      const rim = MeshBuilder.CreateCylinder(
        `car-rim-${id}-${pos.name}`,
        { height: 0.37, diameter: 0.5, tessellation: 16 },
        this.scene
      );
      rim.rotation.z = Math.PI / 2;
      rim.parent = wheelContainer;

      const rimMaterial = new StandardMaterial(`rim-material-${id}-${pos.name}`, this.scene);
      rimMaterial.diffuseColor = new Color3(0.7, 0.7, 0.75); // Prateado
      rimMaterial.specularColor = new Color3(1.0, 1.0, 1.0); // Branco puro (cromo)
      rimMaterial.specularPower = 256; // Muito brilhante (cromado)
      rimMaterial.emissiveColor = new Color3(0.05, 0.05, 0.06); // Leve emissão para destaque
      rimMaterial.transparencyMode = 2; // ALPHA_BLEND
      rim.material = rimMaterial;

      // Armazenar referência do container para rodas dianteiras (para rotação)
      if (pos.isFront) {
        (wheelContainer as any).isFrontWheel = true;
      }
    });

    // Lanternas traseiras estilo Skyline GT-R - CONTORNO VERMELHO VIBRANTE
    const taillightRingMaterial = new StandardMaterial(`taillight-ring-${id}`, this.scene);
    taillightRingMaterial.diffuseColor = new Color3(0.9, 0.0, 0.0); // Vermelho vibrante
    taillightRingMaterial.emissiveColor = new Color3(0.8, 0.0, 0.0); // Emissão forte (efeito LED)
    taillightRingMaterial.specularColor = new Color3(1.0, 0.2, 0.2);
    taillightRingMaterial.specularPower = 256; // Brilho forte (LED)
    taillightRingMaterial.transparencyMode = 2; // ALPHA_BLEND

    // Material para faixa central (bordô quando inativo, vermelho quando ativo)
    const taillightBrakeMaterial = new StandardMaterial(`taillight-brake-${id}`, this.scene);
    taillightBrakeMaterial.diffuseColor = new Color3(0.6, 0.0, 0.0);
    taillightBrakeMaterial.emissiveColor = new Color3(0.4, 0.0, 0.05); // Bordô suave quando inativo
    taillightBrakeMaterial.specularColor = new Color3(0.8, 0.1, 0.1);
    taillightBrakeMaterial.specularPower = 128;
    taillightBrakeMaterial.transparencyMode = 2; // ALPHA_BLEND

    // 4 círculos traseiros (CONTORNO VERMELHO)
    const taillightPositions = [
      { x: 0.65, y: 0.35, z: -2.2 },  // Superior esquerdo
      { x: 0.65, y: 0.15, z: -2.2 },  // Inferior esquerdo
      { x: -0.65, y: 0.35, z: -2.2 }, // Superior direito
      { x: -0.65, y: 0.15, z: -2.2 }  // Inferior direito
    ];

    taillightPositions.forEach((pos, index) => {
      // Criar contorno (torus) em vez de círculo sólido
      const taillight = MeshBuilder.CreateTorus(
        `car-taillight-${id}-${index}`,
        { diameter: 0.22, thickness: 0.04, tessellation: 16 },
        this.scene
      );
      taillight.position.set(pos.x, pos.y, pos.z);
      taillight.rotation.y = Math.PI / 2;
      taillight.material = taillightRingMaterial;
      taillight.parent = carGroup;
    });

    // Faixa central menor (BORDÔ -> VERMELHO quando ativado)
    const centerTaillight = MeshBuilder.CreateBox(
      `car-center-taillight-${id}`,
      { width: 0.7, height: 0.08, depth: 0.08 },
      this.scene
    );
    centerTaillight.position.set(0, 0.25, -2.2);
    centerTaillight.material = taillightBrakeMaterial;
    centerTaillight.parent = carGroup;
    (centerTaillight as any).isBrakeLight = true;

    carGroup.checkCollisions = false;
    carGroup.isPickable = false;

    // CRITICAL: Não freezar carros pois eles se movem constantemente
    // Mas podemos otimizar o cálculo de bounding info
    carGroup.alwaysSelectAsActiveMesh = true;

    // Material principal do carro com acabamento metálico premium
    const carMaterial = new StandardMaterial(`car-material-${id}`, this.scene);
    const isLocal = id === this.localId;
    carMaterial.diffuseColor = isLocal ? this.localCarColor : ghostColor;

    // Especular forte para acabamento metálico brilhante
    carMaterial.specularColor = new Color3(0.8, 0.8, 0.85); // Brilho prateado
    carMaterial.specularPower = 128; // Muito brilhante (pintura metálica)

    // Emissão sutil para destaque
    const emissiveIntensity = isLocal ? 0.05 : 0.02;
    carMaterial.emissiveColor = (isLocal ? this.localCarColor : ghostColor).scale(emissiveIntensity);

    carMaterial.alpha = isLocal ? 1 : 0.6; // Adversários com 60% de opacidade
    carMaterial.backFaceCulling = true;
    carMaterial.transparencyMode = 2; // ALPHA_BLEND mode para transparência suave

    // Aplicar material aos componentes principais
    chassis.material = carMaterial;
    hood.material = carMaterial;
    roof.material = carMaterial;
    spoiler.material = carMaterial;

    // Criar faixas VV nas laterais do carro
    this.createSideStripes(carGroup, id);

    // Material do para-brisa (vidro realista com reflexão)
    const glassMaterial = new StandardMaterial(`glass-material-${id}`, this.scene);
    glassMaterial.diffuseColor = new Color3(0.7, 0.85, 1.0); // Tom azulado
    glassMaterial.specularColor = new Color3(1.0, 1.0, 1.0); // Reflexão forte
    glassMaterial.specularPower = 256; // Muito reflexivo (vidro)
    glassMaterial.emissiveColor = new Color3(0.05, 0.08, 0.12); // Leve emissão azulada
    glassMaterial.alpha = 0.25; // Mais transparente
    glassMaterial.transparencyMode = 2; // ALPHA_BLEND
    glassMaterial.backFaceCulling = false; // Visível de ambos os lados
    windshield.material = glassMaterial;

    this.cars.set(id, carGroup);
    return carGroup;
  }

  private createSideStripes(carGroup: Mesh, id: string) {
    // Material das faixas (fibra de carbono com brilho)
    const stripeMaterial = new StandardMaterial(`stripe-material-${id}`, this.scene);
    stripeMaterial.diffuseColor = new Color3(0.08, 0.08, 0.12); // Preto carbono
    stripeMaterial.specularColor = new Color3(0.3, 0.3, 0.35); // Brilho sutil
    stripeMaterial.specularPower = 64; // Acabamento semi-brilhante
    stripeMaterial.emissiveColor = new Color3(0.01, 0.01, 0.02); // Levíssima emissão
    stripeMaterial.transparencyMode = 2; // ALPHA_BLEND

    // Criar faixas VV em ambos os lados
    ['left', 'right'].forEach((side, sideIndex) => {
      const sideMultiplier = side === 'left' ? -1 : 1;

      // Duas faixas VV por lado
      for (let stripeIndex = 0; stripeIndex < 2; stripeIndex++) {
        // Faixa superior
        const upperStripe = MeshBuilder.CreateBox(
          `stripe_${side}_upper_${stripeIndex}_${id}`,
          { width: 0.08, height: 0.15, depth: 1.8 }, // Fina, mais alta, comprida
          this.scene
        );

        // Faixa inferior
        const lowerStripe = MeshBuilder.CreateBox(
          `stripe_${side}_lower_${stripeIndex}_${id}`,
          { width: 0.08, height: 0.15, depth: 1.2 }, // Fina, mais alta, menos comprida
          this.scene
        );

        // Posicionamento das faixas para formar VV
        const baseX = sideMultiplier * 0.85; // Posição na lateral do carro
        const offsetZ = stripeIndex * 0.4 - 0.2; // Espaçamento entre as duas faixas

        // Faixa superior (vai da frente até o meio)
        upperStripe.position.set(baseX, 0.1, 0.4 + offsetZ);
        upperStripe.rotation.set(0, 0, sideMultiplier * Math.PI / 12); // Inclinação para formar V

        // Faixa inferior (vai do meio até trás)
        lowerStripe.position.set(baseX, -0.1, -0.6 + offsetZ);
        lowerStripe.rotation.set(0, 0, sideMultiplier * -Math.PI / 12); // Inclinação oposta para formar V

        // Aplicar material
        upperStripe.material = stripeMaterial;
        lowerStripe.material = stripeMaterial;

        // Anexar ao grupo do carro
        upperStripe.parent = carGroup;
        lowerStripe.parent = carGroup;
      }
    });
  }
}