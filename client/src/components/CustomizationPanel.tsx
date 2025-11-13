import React, { useState, useEffect, useRef } from 'react';
import { Scene, Engine, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Color3, Mesh } from '@babylonjs/core';
import { useAuthStore } from '../store/useAuth';

interface CarColor {
  name: string;
  displayName: string;
  color: Color3;
  hexColor: string;
}

const availableColors: CarColor[] = [
  { name: 'blue', displayName: 'Azul', color: new Color3(0.1, 0.3, 0.9), hexColor: '#1a4de6' },
  { name: 'green', displayName: 'Verde', color: new Color3(0.1, 0.8, 0.3), hexColor: '#1acc4d' },
  { name: 'yellow', displayName: 'Amarelo', color: new Color3(0.95, 0.85, 0.1), hexColor: '#f2d91a' },
  { name: 'pink', displayName: 'Rosa', color: new Color3(0.95, 0.3, 0.7), hexColor: '#f24db3' },
];

export const CustomizationPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedColor, setSelectedColor] = useState<string>('blue');
  const [savedColor, setSavedColor] = useState<string>('blue');
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const carMaterialRef = useRef<StandardMaterial | null>(null);

  // Carregar cor salva do usuário
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`carColor_${user.id}`) || 'blue';
      setSelectedColor(saved);
      setSavedColor(saved);
    }
  }, [user?.id]);

  // Criar scene 3D única
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color3(0.05, 0.05, 0.08).toColor4();

    // Camera
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 4,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, false);
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 15;

    // Light
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    // Criar carro
    const carGroup = MeshBuilder.CreateBox('carGroup', { size: 1 }, scene);
    carGroup.isVisible = false;

    // Chassis
    const chassis = MeshBuilder.CreateBox(
      'chassis',
      { height: 0.4, width: 1.8, depth: 4.2 },
      scene
    );
    chassis.position.y = 0.2;
    chassis.parent = carGroup;

    // Capô
    const hood = MeshBuilder.CreateBox(
      'hood',
      { height: 0.15, width: 1.6, depth: 1.4 },
      scene
    );
    hood.position.set(0, 0.475, 1.4);
    hood.parent = carGroup;

    // Teto
    const roof = MeshBuilder.CreateBox(
      'roof',
      { height: 0.3, width: 1.4, depth: 2.0 },
      scene
    );
    roof.position.set(0, 0.55, -0.2);
    roof.parent = carGroup;

    // Spoiler
    const spoiler = MeshBuilder.CreateBox(
      'spoiler',
      { height: 0.05, width: 1.6, depth: 0.4 },
      scene
    );
    spoiler.position.set(0, 0.65, -2.3);
    spoiler.parent = carGroup;

    // Material do carro
    const carMaterial = new StandardMaterial('carMat', scene);
    const initialColor = availableColors.find(c => c.name === selectedColor)?.color || availableColors[0].color;
    carMaterial.diffuseColor = initialColor;
    carMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
    carMaterial.specularPower = 32;

    [chassis, hood, roof, spoiler].forEach(mesh => {
      mesh.material = carMaterial;
    });

    carMaterialRef.current = carMaterial;

    // Rodas
    const wheelPositions = [
      { x: -0.8, z: 1.2 },
      { x: 0.8, z: 1.2 },
      { x: -0.8, z: -1.2 },
      { x: 0.8, z: -1.2 },
    ];

    wheelPositions.forEach((pos, i) => {
      const wheel = MeshBuilder.CreateCylinder(
        `wheel-${i}`,
        { diameter: 0.8, height: 0.3 },
        scene
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, 0.0, pos.z);
      wheel.parent = carGroup;

      const wheelMat = new StandardMaterial(`wheelMat-${i}`, scene);
      wheelMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
      wheel.material = wheelMat;
    });

    // Animação de rotação
    let angle = 0;
    scene.registerBeforeRender(() => {
      angle += 0.005;
      carGroup.rotation.y = angle;
    });

    engine.runRenderLoop(() => {
      scene.render();
    });

    engineRef.current = engine;
    sceneRef.current = scene;

    return () => {
      engine.dispose();
    };
  }, []);

  // Atualizar cor do preview quando selecionada
  useEffect(() => {
    if (carMaterialRef.current) {
      const colorData = availableColors.find(c => c.name === selectedColor);
      if (colorData) {
        carMaterialRef.current.diffuseColor = colorData.color;
      }
    }
  }, [selectedColor]);

  const handleColorClick = (colorName: string) => {
    setSelectedColor(colorName);
  };

  const handleSaveColor = async () => {
    setSaving(true);

    try {
      if (user?.id) {
        // Salvar no localStorage
        localStorage.setItem(`carColor_${user.id}`, selectedColor);
        setSavedColor(selectedColor);

        // Salvar no servidor
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:2567'}/api/users/update-car-color`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            carColor: selectedColor,
          }),
        });

        if (!response.ok) {
          console.warn('Falha ao salvar cor no servidor, usando localStorage');
        }
      }
    } catch (error) {
      console.error('Erro ao salvar cor:', error);
    } finally {
      setSaving(false);
    }
  };

  const showSaveButton = selectedColor !== savedColor;
  const selectedColorData = availableColors.find(c => c.name === selectedColor);

  return (
    <div style={{
      width: '100%',
      maxWidth: '700px',
      margin: '0 auto',
      padding: '20px',
    }}>
      <h2 style={{
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: '10px',
        textAlign: 'center',
      }}>
        🎨 Personalização do Carro
      </h2>

      <p style={{
        color: '#a0a0a0',
        textAlign: 'center',
        marginBottom: '30px',
        fontSize: '14px',
      }}>
        Escolha a cor do seu carro e veja o resultado em tempo real
      </p>

      {/* Preview 3D Central */}
      <div style={{
        width: '100%',
        height: '300px',
        marginBottom: '30px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '2px solid rgba(147, 51, 234, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>

      {/* Cor Selecionada */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        <span style={{
          color: '#a0a0a0',
          fontSize: '14px',
          marginRight: '10px',
        }}>
          Cor Selecionada:
        </span>
        <span style={{
          color: '#fff',
          fontSize: '18px',
          fontWeight: 'bold',
        }}>
          {selectedColorData?.displayName}
        </span>
      </div>

      {/* Paleta de Cores */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '30px',
        flexWrap: 'wrap',
      }}>
        {availableColors.map((carColor) => (
          <button
            key={carColor.name}
            onClick={() => handleColorClick(carColor.name)}
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${carColor.hexColor}, ${carColor.hexColor}dd)`,
              border: selectedColor === carColor.name
                ? '4px solid #9333ea'
                : '3px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: selectedColor === carColor.name ? 'scale(1.1)' : 'scale(1)',
              boxShadow: selectedColor === carColor.name
                ? `0 8px 24px ${carColor.hexColor}80`
                : '0 4px 12px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (selectedColor !== carColor.name) {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedColor !== carColor.name) {
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {selectedColor === carColor.name && (
              <span style={{
                fontSize: '24px',
                color: '#fff',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}>
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Labels das Cores */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '30px',
        flexWrap: 'wrap',
      }}>
        {availableColors.map((carColor) => (
          <div
            key={`label-${carColor.name}`}
            style={{
              width: '70px',
              textAlign: 'center',
              fontSize: '12px',
              color: selectedColor === carColor.name ? '#9333ea' : '#a0a0a0',
              fontWeight: selectedColor === carColor.name ? 'bold' : 'normal',
              transition: 'all 0.3s ease',
            }}
          >
            {carColor.displayName}
          </div>
        ))}
      </div>

      {/* Botão Salvar */}
      {showSaveButton && (
        <div style={{
          animation: 'slideInUp 0.3s ease',
          textAlign: 'center',
        }}>
          <button
            onClick={handleSaveColor}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 'bold',
              padding: '16px 48px',
              borderRadius: '12px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.3s ease',
              opacity: saving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
            }}
          >
            {saving ? '💾 Salvando...' : '✓ Salvar Escolha'}
          </button>
        </div>
      )}

      {/* Informações */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: 'rgba(147, 51, 234, 0.1)',
        border: '1px solid rgba(147, 51, 234, 0.3)',
        borderRadius: '12px',
      }}>
        <h4 style={{
          color: '#9333ea',
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '10px',
        }}>
          ℹ️ Como funciona
        </h4>
        <ul style={{
          color: '#a0a0a0',
          fontSize: '14px',
          lineHeight: '1.8',
          paddingLeft: '20px',
        }}>
          <li>Clique em uma cor para visualizar no modelo 3D</li>
          <li>Quando estiver satisfeito, clique em "Salvar Escolha"</li>
          <li>Sua cor será aplicada em todos os modos de jogo</li>
          <li>Todas as cores são gratuitas!</li>
        </ul>
      </div>

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
