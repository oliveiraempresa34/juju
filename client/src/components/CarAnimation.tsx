import { useEffect, useRef } from 'react';
import * as BABYLON from '@babylonjs/core';

export const CarAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create engine and scene
    const engine = new BABYLON.Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      alpha: true,
    });
    engineRef.current = engine;

    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Transparent background
    sceneRef.current = scene;

    // Camera - Better angle for Skyline showcase
    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2.3,
      22,
      new BABYLON.Vector3(0, 0.5, 0),
      scene
    );
    camera.lowerRadiusLimit = 18;
    camera.upperRadiusLimit = 28;

    // Enhanced lighting for better showcase
    const light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
    light1.intensity = 0.8;

    const light2 = new BABYLON.DirectionalLight('light2', new BABYLON.Vector3(-1, -2, -1), scene);
    light2.intensity = 0.6;

    const light3 = new BABYLON.PointLight('light3', new BABYLON.Vector3(5, 3, 5), scene);
    light3.intensity = 0.4;

    // Create improved Nissan Skyline GT-R R34
    const createSkylineGTR = () => {
      const carGroup = new BABYLON.TransformNode('carGroup', scene);
      carGroup.scaling = new BABYLON.Vector3(1.1, 1.1, 1.1);

      // Main body - GT-R proportions
      const mainBody = BABYLON.MeshBuilder.CreateBox('mainBody', {
        width: 4.2,
        height: 0.7,
        depth: 2.0,
      }, scene);
      mainBody.position.y = 0.65;
      mainBody.parent = carGroup;

      // Hood with GT-R characteristic bulge
      const hood = BABYLON.MeshBuilder.CreateBox('hood', {
        width: 1.4,
        height: 0.5,
        depth: 2.0,
      }, scene);
      hood.position.set(2.3, 0.85, 0);
      hood.rotation.z = -0.12;
      hood.parent = carGroup;

      // Hood bulge (power dome)
      const hoodBulge = BABYLON.MeshBuilder.CreateBox('hoodBulge', {
        width: 0.6,
        height: 0.2,
        depth: 1.0,
      }, scene);
      hoodBulge.position.set(2.1, 1.2, 0);
      hoodBulge.parent = carGroup;

      // Cabin - GT-R low profile
      const cabin = BABYLON.MeshBuilder.CreateBox('cabin', {
        width: 2.2,
        height: 0.95,
        depth: 1.75,
      }, scene);
      cabin.position.set(-0.2, 1.4, 0);
      cabin.parent = carGroup;

      // Rear section
      const rearSection = BABYLON.MeshBuilder.CreateBox('rearSection', {
        width: 1.0,
        height: 0.65,
        depth: 2.0,
      }, scene);
      rearSection.position.set(-2.1, 0.85, 0);
      rearSection.parent = carGroup;

      // Trunk with slope
      const trunk = BABYLON.MeshBuilder.CreateBox('trunk', {
        width: 0.9,
        height: 0.7,
        depth: 1.75,
      }, scene);
      trunk.position.set(-1.5, 1.3, 0);
      trunk.rotation.z = 0.25;
      trunk.parent = carGroup;

      // Iconic GT-R rear spoiler
      const spoilerBase = BABYLON.MeshBuilder.CreateBox('spoilerBase', {
        width: 0.15,
        height: 0.5,
        depth: 0.15,
      }, scene);
      spoilerBase.position.set(-2.5, 1.35, 0.85);
      spoilerBase.parent = carGroup;

      const spoilerBase2 = spoilerBase.clone('spoilerBase2');
      spoilerBase2.position.set(-2.5, 1.35, -0.85);
      spoilerBase2.parent = carGroup;

      const spoilerWing = BABYLON.MeshBuilder.CreateBox('spoilerWing', {
        width: 0.35,
        height: 0.12,
        depth: 2.0,
      }, scene);
      spoilerWing.position.set(-2.5, 1.6, 0);
      spoilerWing.parent = carGroup;

      // Front bumper with air intakes
      const frontBumper = BABYLON.MeshBuilder.CreateBox('frontBumper', {
        width: 0.7,
        height: 0.35,
        depth: 2.1,
      }, scene);
      frontBumper.position.set(2.75, 0.35, 0);
      frontBumper.parent = carGroup;

      // Front lip/splitter
      const frontLip = BABYLON.MeshBuilder.CreateBox('frontLip', {
        width: 0.3,
        height: 0.08,
        depth: 2.0,
      }, scene);
      frontLip.position.set(2.95, 0.15, 0);
      frontLip.parent = carGroup;

      // Side skirts
      const createSideSkirt = (zPos: number) => {
        const skirt = BABYLON.MeshBuilder.CreateBox('sideSkirt', {
          width: 3.8,
          height: 0.15,
          depth: 0.25,
        }, scene);
        skirt.position.set(0.2, 0.2, zPos);
        skirt.parent = carGroup;
        return skirt;
      };

      const leftSkirt = createSideSkirt(1.05);
      const rightSkirt = createSideSkirt(-1.05);

      // Rear bumper
      const rearBumper = BABYLON.MeshBuilder.CreateBox('rearBumper', {
        width: 0.5,
        height: 0.35,
        depth: 2.1,
      }, scene);
      rearBumper.position.set(-2.6, 0.35, 0);
      rearBumper.parent = carGroup;

      // Rear diffuser
      const rearDiffuser = BABYLON.MeshBuilder.CreateBox('rearDiffuser', {
        width: 0.4,
        height: 0.2,
        depth: 1.8,
      }, scene);
      rearDiffuser.position.set(-2.7, 0.2, 0);
      rearDiffuser.rotation.z = 0.3;
      rearDiffuser.parent = carGroup;

      // GT-R Wheels - Proper design with deep dish
      const tireMaterial = new BABYLON.StandardMaterial('tireMat', scene);
      tireMaterial.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.08);
      tireMaterial.specularColor = new BABYLON.Color3(0.15, 0.15, 0.15);
      tireMaterial.specularPower = 16;

      const createGTRWheel = (x: number, z: number, isFront: boolean, isLeft: boolean) => {
        const wheelContainer = new BABYLON.TransformNode(`wheelContainer_${x}_${z}`, scene);
        wheelContainer.position.set(x, 0.48, z);
        wheelContainer.parent = carGroup;

        // Front wheels: drift angle
        // Rear wheels: straight, facing viewer (90 degree rotation)
        if (isFront) {
          wheelContainer.rotation.y = isLeft ? Math.PI / 6 : -Math.PI / 6;
        } else {
          wheelContainer.rotation.y = Math.PI / 2;
        }

        // Tire - wider performance tire
        const tire = BABYLON.MeshBuilder.CreateCylinder('tire', {
          diameter: 0.96,
          height: 0.55,
          tessellation: 36,
        }, scene);

        // All wheels horizontal (X-axis rotation)
        tire.rotation.x = Math.PI / 2;
        tire.material = tireMaterial;
        tire.parent = wheelContainer;

        // GT-R style 6-spoke rim (inside the tire)
        const rim = BABYLON.MeshBuilder.CreateCylinder('rim', {
          diameter: 0.64,
          height: 0.40,
          tessellation: 32,
        }, scene);

        rim.rotation.x = Math.PI / 2;

        const rimMat = new BABYLON.StandardMaterial('rimMat', scene);
        rimMat.diffuseColor = new BABYLON.Color3(0.82, 0.82, 0.85);
        rimMat.specularColor = new BABYLON.Color3(1, 1, 1);
        rimMat.specularPower = 128;
        rim.material = rimMat;
        rim.parent = wheelContainer;

        // 6 spokes for GT-R wheel
        const spokeContainer = new BABYLON.TransformNode('spokeContainer', scene);
        spokeContainer.rotation.x = Math.PI / 2;
        spokeContainer.parent = wheelContainer;

        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI * 2) / 6;
          const spoke = BABYLON.MeshBuilder.CreateBox('spoke', {
            width: 0.08,
            height: 0.26,
            depth: 0.40,
          }, scene);
          spoke.position.set(
            Math.cos(angle) * 0.16,
            0,
            Math.sin(angle) * 0.16
          );
          spoke.rotation.y = angle;
          spoke.material = rimMat;
          spoke.parent = spokeContainer;
        }

        // Center cap
        const centerCap = BABYLON.MeshBuilder.CreateCylinder('centerCap', {
          diameter: 0.20,
          height: 0.42,
          tessellation: 24,
        }, scene);

        centerCap.rotation.x = Math.PI / 2;

        const capMat = new BABYLON.StandardMaterial('capMat', scene);
        capMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.18);
        capMat.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        centerCap.material = capMat;
        centerCap.parent = wheelContainer;

        // Brake caliper (Brembo style)
        const caliper = BABYLON.MeshBuilder.CreateBox('caliper', {
          width: 0.25,
          height: 0.35,
          depth: 0.15,
        }, scene);
        caliper.position.set(0, -0.15, isLeft ? 0.25 : -0.25);
        const caliperMat = new BABYLON.StandardMaterial('caliperMat', scene);
        caliperMat.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1); // Red Brembo
        caliperMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        caliper.material = caliperMat;
        caliper.parent = wheelContainer;

        // Brake disc
        const brakeDisc = BABYLON.MeshBuilder.CreateCylinder('brakeDisc', {
          diameter: 0.50,
          height: 0.36,
          tessellation: 32,
        }, scene);

        brakeDisc.rotation.x = Math.PI / 2;

        const discMat = new BABYLON.StandardMaterial('discMat', scene);
        discMat.diffuseColor = new BABYLON.Color3(0.35, 0.35, 0.38);
        discMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        discMat.specularPower = 64;
        brakeDisc.material = discMat;
        brakeDisc.parent = wheelContainer;

        return wheelContainer;
      };

      // Position wheels with GT-R stance
      createGTRWheel(1.5, 1.05, true, true);   // Front left
      createGTRWheel(1.5, -1.05, true, false); // Front right
      createGTRWheel(-1.5, 1.05, false, true);   // Rear left
      createGTRWheel(-1.5, -1.05, false, false); // Rear right

      // Side mirrors
      const mirrorMat = new BABYLON.StandardMaterial('mirrorMat', scene);
      mirrorMat.diffuseColor = new BABYLON.Color3(0.08, 0.08, 0.08);
      mirrorMat.specularPower = 32;

      const createMirror = (zPos: number) => {
        const mirrorArm = BABYLON.MeshBuilder.CreateBox('mirrorArm', {
          width: 0.08,
          height: 0.08,
          depth: 0.2,
        }, scene);
        mirrorArm.position.set(0.9, 1.25, zPos > 0 ? 0.9 : -0.9);
        mirrorArm.material = mirrorMat;
        mirrorArm.parent = carGroup;

        const mirror = BABYLON.MeshBuilder.CreateBox('mirror', {
          width: 0.18,
          height: 0.18,
          depth: 0.3,
        }, scene);
        mirror.position.set(0.9, 1.25, zPos);
        mirror.material = mirrorMat;
        mirror.parent = carGroup;
        return mirror;
      };

      createMirror(1.15);  // Left mirror
      createMirror(-1.15); // Right mirror

      // Headlights - GT-R round lights
      const headlightMat = new BABYLON.StandardMaterial('headlightMat', scene);
      headlightMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 1);
      headlightMat.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.5);
      headlightMat.specularPower = 256;

      const createHeadlight = (zPos: number) => {
        const light = BABYLON.MeshBuilder.CreateCylinder('headlight', {
          diameter: 0.28,
          height: 0.2,
          tessellation: 24,
        }, scene);
        light.rotation.z = Math.PI / 2;
        light.position.set(2.8, 0.7, zPos);
        light.material = headlightMat;
        light.parent = carGroup;
        return light;
      };

      createHeadlight(0.7);  // Left headlight
      createHeadlight(-0.7); // Right headlight

      // Taillights - GT-R circular style
      const taillightMat = new BABYLON.StandardMaterial('taillightMat', scene);
      taillightMat.diffuseColor = new BABYLON.Color3(0.9, 0.05, 0.05);
      taillightMat.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
      taillightMat.specularPower = 256;

      const createTaillight = (zPos: number) => {
        const light = BABYLON.MeshBuilder.CreateCylinder('taillight', {
          diameter: 0.22,
          height: 0.15,
          tessellation: 24,
        }, scene);
        light.rotation.z = Math.PI / 2;
        light.position.set(-2.65, 0.7, zPos);
        light.material = taillightMat;
        light.parent = carGroup;
        return light;
      };

      createTaillight(0.7);  // Left taillight outer
      createTaillight(0.4);  // Left taillight inner
      createTaillight(-0.7); // Right taillight outer
      createTaillight(-0.4); // Right taillight inner

      // Windows - tinted for GT-R look
      const windowMat = new BABYLON.StandardMaterial('windowMat', scene);
      windowMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.08);
      windowMat.alpha = 0.6;
      windowMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.7);
      windowMat.specularPower = 128;

      // Front windshield
      const windshield = BABYLON.MeshBuilder.CreateBox('windshield', {
        width: 0.9,
        height: 0.75,
        depth: 1.65,
      }, scene);
      windshield.position.set(0.7, 1.45, 0);
      windshield.rotation.z = -0.18;
      windshield.material = windowMat;
      windshield.parent = carGroup;

      // Side windows
      const createSideWindow = (zPos: number) => {
        const window = BABYLON.MeshBuilder.CreateBox('sideWindow', {
          width: 1.6,
          height: 0.65,
          depth: 0.06,
        }, scene);
        window.position.set(-0.2, 1.45, zPos);
        window.material = windowMat;
        window.parent = carGroup;
        return window;
      };

      createSideWindow(0.88);  // Left window
      createSideWindow(-0.88); // Right window

      // Rear window
      const rearWindow = BABYLON.MeshBuilder.CreateBox('rearWindow', {
        width: 0.7,
        height: 0.6,
        depth: 1.65,
      }, scene);
      rearWindow.position.set(-1.4, 1.45, 0);
      rearWindow.rotation.z = 0.25;
      rearWindow.material = windowMat;
      rearWindow.parent = carGroup;

      // Exhaust pipes - GT-R quad exhaust
      const exhaustMat = new BABYLON.StandardMaterial('exhaustMat', scene);
      exhaustMat.diffuseColor = new BABYLON.Color3(0.18, 0.18, 0.2);
      exhaustMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.55);
      exhaustMat.specularPower = 64;

      const createExhaust = (xPos: number, zPos: number) => {
        const exhaust = BABYLON.MeshBuilder.CreateCylinder('exhaust', {
          diameter: 0.12,
          height: 0.35,
          tessellation: 20,
        }, scene);
        exhaust.rotation.set(0, 0, Math.PI / 2);
        exhaust.position.set(xPos, 0.28, zPos);
        exhaust.material = exhaustMat;
        exhaust.parent = carGroup;
        return exhaust;
      };

      // Quad exhaust setup
      createExhaust(-2.75, 0.6);   // Left outer
      createExhaust(-2.75, 0.35);  // Left inner
      createExhaust(-2.75, -0.6);  // Right outer
      createExhaust(-2.75, -0.35); // Right inner

      // Car material - Bayside Blue (iconic GT-R color) with purple tint
      const carMaterial = new BABYLON.StandardMaterial('carMat', scene);
      carMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.8); // Purple-blue
      carMaterial.specularColor = new BABYLON.Color3(0.9, 0.7, 1);
      carMaterial.specularPower = 64;

      mainBody.material = carMaterial;
      hood.material = carMaterial;
      hoodBulge.material = carMaterial;
      cabin.material = carMaterial;
      rearSection.material = carMaterial;
      trunk.material = carMaterial;

      // Dark parts material
      const darkMat = new BABYLON.StandardMaterial('darkMat', scene);
      darkMat.diffuseColor = new BABYLON.Color3(0.12, 0.08, 0.25);
      darkMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.4);
      darkMat.specularPower = 32;

      spoilerBase.material = darkMat;
      spoilerBase2.material = darkMat;
      spoilerWing.material = darkMat;
      frontBumper.material = darkMat;
      frontLip.material = darkMat;
      rearBumper.material = darkMat;
      rearDiffuser.material = darkMat;
      leftSkirt.material = darkMat;
      rightSkirt.material = darkMat;

      // Enhanced drift smoke particles
      const particleSystem = new BABYLON.ParticleSystem('particles', 3000, scene);
      particleSystem.particleTexture = new BABYLON.Texture(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        scene
      );

      particleSystem.emitter = mainBody;
      particleSystem.minEmitBox = new BABYLON.Vector3(-2.7, 0, -1.3);
      particleSystem.maxEmitBox = new BABYLON.Vector3(-2.7, 0.3, 1.3);

      // Subtle drift smoke (opacidade reduzida em 30%)
      particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 0.35);
      particleSystem.color2 = new BABYLON.Color4(0.98, 0.98, 0.98, 0.315);
      particleSystem.colorDead = new BABYLON.Color4(0.85, 0.85, 0.85, 0);

      particleSystem.minSize = 1.5;
      particleSystem.maxSize = 4.0;

      particleSystem.minLifeTime = 1.0;
      particleSystem.maxLifeTime = 2.5;

      particleSystem.emitRate = 300;

      particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;

      particleSystem.gravity = new BABYLON.Vector3(0, 1.2, 0);

      particleSystem.direction1 = new BABYLON.Vector3(-3.5, 0.3, -1.2);
      particleSystem.direction2 = new BABYLON.Vector3(-3.5, 1.2, 1.2);

      particleSystem.minAngularSpeed = 0;
      particleSystem.maxAngularSpeed = Math.PI;

      particleSystem.minEmitPower = 2.5;
      particleSystem.maxEmitPower = 4.5;
      particleSystem.updateSpeed = 0.012;

      return { car: carGroup, particles: particleSystem };
    };

    const { car, particles } = createSkylineGTR();

    // Animation state
    let animationTime = 0;
    const cycleDuration = 11200;
    const moveDuration = 5600;
    const waitDuration = 2800;
    let lastTime = Date.now();

    // Smooth bidirectional animation
    const animate = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      animationTime += deltaTime;

      const cycleProgress = (animationTime % cycleDuration) / cycleDuration;

      if (cycleProgress < 0.375) {
        // Moving right
        const t = cycleProgress / 0.375;
        car.position.x = -35 + (t * 70);
        car.rotation.y = 0;

        if (!particles.isStarted() && t > 0.08 && t < 0.92) {
          particles.start();
        }
      } else if (cycleProgress < 0.5) {
        // Waiting off-screen right
        car.position.x = 35;
        car.rotation.y = 0;
        if (particles.isStarted()) {
          particles.stop();
        }
      } else if (cycleProgress < 0.875) {
        // Moving left
        const t = (cycleProgress - 0.5) / 0.375;
        car.position.x = 35 - (t * 70);
        car.rotation.y = Math.PI;

        if (!particles.isStarted() && t > 0.08 && t < 0.92) {
          particles.start();
        }
      } else {
        // Waiting off-screen left
        car.position.x = -35;
        car.rotation.y = Math.PI;
        if (particles.isStarted()) {
          particles.stop();
        }
      }
    };

    // Render loop
    engine.runRenderLoop(() => {
      animate();
      scene.render();
    });

    // Handle resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="car-animation-canvas"
      className="car-animation-canvas"
      style={{
        position: 'absolute',
        top: '-120px',
        left: '-120px',
        width: 'calc(100% + 240px)',
        height: '500px',
        pointerEvents: 'none',
        zIndex: 2,
        overflow: 'visible',
      }}
    />
  );
};
