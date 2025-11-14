import React, { useEffect, useRef } from "react";
import { Color3, Color4, Engine, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { CameraRig } from "./CameraRig";
import { CarController } from "./CarController";
import { GhostsLayer } from "./GhostsLayer";
import { InputManager } from "./InputManager";
import { MultiplayerSync, type ConnectOptions } from "./MultiplayerSync";
import { TrackGenerator } from "./TrackGenerator";
import { useRoomStore } from "../store/useRoom";
import { useGameStore } from "../store/useGame";
import { useScoreStore } from "../store/useScore";
import { useAuthStore } from "../store/useAuth";
import { usePlatformStore } from "../store/usePlatformStore";
import { useAppStore } from "../store/useApp";
import { LocalPhysics } from "./LocalPhysics";
import { GameOverModal } from "../components/GameOverModal";
import { ScoreDisplay } from "../components/ScoreDisplay";
import { SmokeSystem } from "./SmokeSystem";
import { StarField } from "./StarField";

const MATCH_CAPACITY = 5;

export const GameScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const multiplayerRef = useRef<MultiplayerSync>();
  const localPhysicsRef = useRef<LocalPhysics>();
  const trackRef = useRef<TrackGenerator>();
  const cameraRigRef = useRef<CameraRig>();
  const smokeSystemRef = useRef<SmokeSystem>();
  const starFieldRef = useRef<StarField>();
  const lastDistanceRef = useRef(0);
  const lastTimestampRef = useRef(0);
  const frameCountRef = useRef(0);
  const gameMode = useGameStore((state) => state.gameMode);
  const multiplayerOptions = useGameStore((state) => state.multiplayerOptions);
  const externalMultiplayer = useGameStore((state) => state.multiplayerInstance);
  const matchMeta = useRoomStore((state) => ({
    matchStatus: state.matchStatus,
    betAmount: state.betAmount,
    roomType: state.roomType,
    inviteCode: state.inviteCode,
    prizePool: state.prizePool,
    countdown: state.countdown,
    winnerId: state.winnerId,
    playerCount: state.playerCount,
    players: state.players,
    hostId: state.hostId
  }));
  const localPlayerId = useRoomStore((state) => state.localPlayerId);
  const matchSeed = useRoomStore((state) => state.seed);
  const authUser = useAuthStore((state) => state.user);
  const refreshAuthUser = useAuthStore((state) => state.refreshUser);
  const chargeGameTicket = useAuthStore((state) => state.chargeGameTicket);
  const rewardGameWinner = useAuthStore((state) => state.rewardGameWinner);
  const chargedMatchesRef = useRef<Set<string>>(new Set());
  const rewardedMatchesRef = useRef<Set<string>>(new Set());
  const displayName = authUser?.username ?? `Pilot-${Math.random().toString(36).slice(2, 6)}`;
  const platformUserId = authUser?.id;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    // Otimizações para mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    const engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      antialias: !isMobile, // Desabilita anti-alias em mobile para performance
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      stencil: false,
      deterministicLockstep: true,  // CRITICAL: Elimina micro-jitter
      lockstepMaxSteps: 4            // Máximo de steps de física por frame
    });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.05, 0.08, 0.12, 1); // Azul escuro em vez de preto

    // CRITICAL: Otimizações de cena para eliminar jitter
    scene.skipPointerMovePicking = true;
    scene.autoClear = false;
    scene.autoClearDepthAndStencil = false;

    // Iluminação ambiente otimizada para asfalto e neon
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 1.4; // Mais intensidade para melhor visibilidade
    light.diffuse = new Color3(0.95, 0.95, 1.0); // Luz branco-azulada (efeito noturno)
    light.specular = new Color3(0.9, 0.9, 1.0); // Especular forte para brilho
    light.groundColor = new Color3(0.2, 0.2, 0.3); // Reflexo do chão mais evidente

    const carController = new CarController(scene);

    // CORREÇÃO: Carregar e aplicar cor customizada do carro
    // Funciona em todos os modos: multiplayer, practice, demo
    if (authUser?.id) {
      const savedColor = localStorage.getItem(`carColor_${authUser.id}`) || 'blue';
      carController.setLocalCarColor(savedColor);
      console.log(`[GameScene] Cor do carro carregada: ${savedColor}`);
    }

    const cameraRig = new CameraRig(scene);
    const ghosts = new GhostsLayer(scene, carController);

    // Sistema de fumaça otimizado para mobile
    const smokeSystem = new SmokeSystem(scene);
    if (isMobile) {
      // Partículas otimizadas para performance em mobile
      smokeSystem.setMaxParticles(54); // 70% menos (180 * 0.3 = 54)
      smokeSystem.setEmissionRate(0.015); // Emissão mais espaçada
    }

    // Sistema de estrelas para fundo galáctico
    const starField = new StarField(scene, isMobile);

    // Usar seed consistente entre sessões
    const { seed } = useRoomStore.getState();
    const track = new TrackGenerator(scene, seed || Date.now());

    // Salvar referências
    trackRef.current = track;
    if (localPhysicsRef.current) {
      localPhysicsRef.current.setTrack(track);
    }
    cameraRigRef.current = cameraRig;
    smokeSystemRef.current = smokeSystem;
    starFieldRef.current = starField;

    lastTimestampRef.current = performance.now();

    scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      let deltaSeconds = (now - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = now;

      // Limitar delta para evitar spikes de física
      deltaSeconds = Math.min(deltaSeconds, 0.05); // Máximo 50ms (20fps mínimo)

      const { players, localPlayerId } = useRoomStore.getState();
      const activeIds = new Set<string>();
      const { gameMode } = useGameStore.getState();

      // TODOS OS MODOS: Usar física local para o jogador local
      const isMultiplayer = gameMode === 'multiplayer';

      if (localPhysicsRef.current && localPlayerId) {
        // Usar física local para o jogador atual
        const currentPlayer = players[localPlayerId];
        if (currentPlayer) {
          const physicsState = localPhysicsRef.current.update();

          // Atualizar pontuação baseada na distância
          useScoreStore.getState().updateCurrentScore(physicsState.distance);

          // Verificar se o jogo acabou
          if (physicsState.gameOver) {
            useGameStore.getState().setGameOver(true);
            useGameStore.getState().setInGame(false);
            useGameStore.getState().updateDistance(physicsState.distance);
            // Atualizar melhor pontuação se necessário
            useScoreStore.getState().updateBestScore();
          }

          // Atualizar estado do player com física local
          useRoomStore.getState().upsertPlayer({
            ...currentPlayer,
            x: physicsState.x,
            y: physicsState.y,
            z: physicsState.z,
            yaw: physicsState.yaw,
            pitch: physicsState.pitch,
            roll: physicsState.roll,
            distance: physicsState.distance
          });

          // MULTIPLAYER: Enviar posição atualizada para o servidor
          if (isMultiplayer && multiplayerRef.current) {
            multiplayerRef.current.sendPosition({
              x: physicsState.x,
              y: physicsState.y,
              z: physicsState.z,
              yaw: physicsState.yaw,
              distance: physicsState.distance
            });
          }

          // Reusar Vector3 para evitar alocações desnecessárias
          const position = new Vector3(physicsState.x, physicsState.y, physicsState.z);

          // Atualizar sistema de fumaça
          if (smokeSystemRef.current) {
            const localState = localPhysicsRef.current?.getState();
            smokeSystemRef.current.update(
              position,
              physicsState.yaw,
              deltaSeconds,
              localState?.turnStrength || 0,
              physicsState.pressing
            );
          }

          // Atualizar campo de estrelas
          if (starFieldRef.current) {
            starFieldRef.current.update(position);
          }

          frameCountRef.current = (frameCountRef.current + 1) % Number.MAX_SAFE_INTEGER;

          // Limpar geometria antiga da track apenas a cada 60 frames
          if (trackRef.current && frameCountRef.current % 60 === 0) {
            trackRef.current.cleanupGeometry();
          }

          // Atualizar câmera com estado suavizado
          const smoothedCameraState = localPhysicsRef.current.getSmoothedCameraState();
          cameraRig.updateCameraPosition(
            new Vector3(smoothedCameraState.x, smoothedCameraState.y, smoothedCameraState.z),
            smoothedCameraState.yaw,
            smoothedCameraState.crashed,
            deltaSeconds
          );

          // Atualizar FOV baseado na velocidade
          if (deltaSeconds > 0) {
            const distanceDelta = Math.max(0, physicsState.distance - lastDistanceRef.current);
            const speed = distanceDelta / deltaSeconds;
            cameraRig.update(speed);
            lastDistanceRef.current = physicsState.distance;
          }
        }
      } else if (isMultiplayer && localPlayerId) {
        // FALLBACK: Se física local não estiver pronta, usar estado do servidor temporariamente
        const local = players[localPlayerId];
        if (local) {
          // Atualizar pontuação do servidor
          useScoreStore.getState().updateCurrentScore(local.distance || 0);

          // Atualizar sistemas visuais baseados no estado do servidor
          const position = new Vector3(local.x, local.y, local.z);

          // Atualizar fumaça baseada no estado do servidor
          if (smokeSystemRef.current) {
            smokeSystemRef.current.update(
              position,
              local.yaw,
              deltaSeconds,
              Math.abs(local.steering || 0), // Usar steering do servidor
              local.pressing || false
            );
          }

          // Atualizar campo de estrelas
          if (starFieldRef.current) {
            starFieldRef.current.update(position);
          }

          frameCountRef.current = (frameCountRef.current + 1) % Number.MAX_SAFE_INTEGER;

          // Limpar geometria antiga da track
          if (trackRef.current && frameCountRef.current % 60 === 0) {
            trackRef.current.cleanupGeometry();
          }

          // CRITICAL: Câmera segue EXATAMENTE o estado do servidor
          cameraRig.updateCameraPosition(
            new Vector3(local.x, local.y, local.z),
            local.yaw,
            local.eliminated || false,
            deltaSeconds
          );

          // Atualizar FOV baseado na velocidade do servidor
          if (deltaSeconds > 0) {
            const distanceDelta = Math.max(0, (local.distance || 0) - lastDistanceRef.current);
            const speed = distanceDelta / deltaSeconds;
            cameraRig.update(speed);
            lastDistanceRef.current = local.distance || 0;
          }

          // Verificar game over do servidor
          if (local.eliminated) {
            useGameStore.getState().setGameOver(true);
            useGameStore.getState().setInGame(false);
          }
        }
      }

      // CRITICAL: Renderizar TODOS os jogadores primeiro
      Object.values(players).forEach((player) => {
        carController.update(player);
        activeIds.add(player.id);
      });

      carController.prune(activeIds);

      // DEPOIS configurar qual é o jogador local (para opacidade/cor)
      if (localPlayerId) {
        carController.setLocalPlayer(localPlayerId);
      }

      // Sincronizar labels dos fantasmas
      ghosts.sync(players, localPlayerId);
    });

    engine.runRenderLoop(() => {
      scene.render();
    });

    // Otimização de redimensionamento para mobile
    const resize = () => {
      engine.resize();
      // Força atualização do canvas em mobile
      if (isMobile) {
        setTimeout(() => engine.resize(), 100);
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);

    // Redimensiona inicialmente
    setTimeout(resize, 100);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      ghosts.dispose();
      carController.dispose();
      cameraRig.dispose();
      track.dispose();
      starField.dispose();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    // Wait for multiplayer to be ready in multiplayer mode
    if (gameMode === 'multiplayer' && !multiplayerRef.current) {
      console.log('[GameScene] Waiting for multiplayer to be initialized before attaching input');
      return;
    }

    const input = new InputManager();
    input.attach(canvas, (inputState) => {
      const currentMode = useGameStore.getState().gameMode;

      // TODOS OS MODOS: Aplicar inputs à física local
      if (localPhysicsRef.current) {
        localPhysicsRef.current.setInput(inputState);
      }

      // Atualizar estado visual
      const { localPlayerId } = useRoomStore.getState();
      if (localPlayerId) {
        const currentPlayer = useRoomStore.getState().players[localPlayerId];
        if (currentPlayer) {
          useRoomStore.getState().upsertPlayer({
            ...currentPlayer,
            pressing: inputState.accelerate
          });
        }
      }

      // MULTIPLAYER: Também enviar inputs para servidor (para sincronização)
      if (currentMode === 'multiplayer' && multiplayerRef.current) {
        multiplayerRef.current.sendInput(inputState);
      }
    });

    return () => {
      input.detach();
    };
  }, [gameMode, externalMultiplayer]);

  // Multiplayer mode: use ONLY the instance from store (created in WaitingLobby)
  useEffect(() => {
    if (gameMode !== 'multiplayer') {
      return;
    }

    if (!externalMultiplayer) {
      console.error('[GameScene] Multiplayer mode but no connection found, returning to lobby');
      return;
    }

    console.log('[GameScene] Using multiplayer connection from store');
    multiplayerRef.current = externalMultiplayer;
    useGameStore.getState().setConnectedToServer(true);
    useGameStore.getState().setInGame(true);

    // CRITICAL: Avisar servidor que o cliente está pronto (cena carregada)
    setTimeout(() => {
      if (externalMultiplayer) {
        externalMultiplayer.sendPlayerReady();
        console.log('[GameScene] ✅ Sent PLAYER_READY to server');
      }
    }, 500); // Pequeno delay para garantir que tudo carregou

    // MUDANÇA: Criar física local TAMBÉM para multiplayer
    // Cada cliente controla seu próprio carro, servidor apenas sincroniza posições
    if (!localPhysicsRef.current) {
      localPhysicsRef.current = new LocalPhysics(trackRef.current);
      console.log('[GameScene] ✅ Local physics created for multiplayer (client-side control)');
    }

    // Validação de segurança: verificar se players aparecem em 3 segundos
    const timeout = setTimeout(() => {
      const { players } = useRoomStore.getState();
      const playerCount = Object.keys(players).length;

      console.warn('[GameScene] Player check after 3s:', {
        playerCount,
        playerIds: Object.keys(players)
      });

      if (playerCount === 0) {
        console.error('[GameScene] No players found after 3s! Returning to lobby...');
        alert('Erro: Nenhum jogador encontrado na sala. Retornando ao lobby...');
        useAppStore.getState().setScreen('lobby');
      }
    }, 3000);

    return () => {
      clearTimeout(timeout);
      // Don't dispose here - WaitingLobby handles cleanup
      if (multiplayerRef.current === externalMultiplayer) {
        multiplayerRef.current = undefined;
      }
    };
  }, [gameMode, externalMultiplayer]);

  useEffect(() => {
    if (gameMode !== 'demo' && gameMode !== 'practice') {
      return;
    }

    if (!localPhysicsRef.current) {
      localPhysicsRef.current = new LocalPhysics(trackRef.current);
    }

    if (!useRoomStore.getState().localPlayerId) {
      const mockPlayerId = 'local_' + Math.random().toString(36).substr(2, 9);
      useRoomStore.getState().setLocalPlayerId(mockPlayerId);
      useRoomStore.getState().setSeed(Date.now());
      useRoomStore.getState().setStatus('connected');

      useScoreStore.getState().loadBestScore();
      useScoreStore.getState().resetCurrentScore();

      useRoomStore.getState().upsertPlayer({
        id: mockPlayerId,
        name: 'You',
        x: 0,
        y: 0.5,
        z: 0,
        yaw: 0,
        pressing: false,
        distance: 0,
        opacity: 1
      });
    }

    useGameStore.getState().setInGame(true);
    useGameStore.getState().setGameOver(false);
  }, [gameMode]);

  useEffect(() => () => {
    chargedMatchesRef.current.clear();
    rewardedMatchesRef.current.clear();
  }, []);

  useEffect(() => {
    if (gameMode !== 'multiplayer') {
      return;
    }

    const betAmount = matchMeta.betAmount ?? 0;
    const matchKey = `${matchMeta.roomType ?? 'public'}-${betAmount}-${matchSeed}-${localPlayerId ?? 'no-player'}`;
    const participantSnapshot = localPlayerId ? matchMeta.players?.[localPlayerId] : undefined;
    const participantCount = matchMeta.playerCount ?? Object.values(matchMeta.players ?? {}).filter((player) => !player?.eliminated).length;

    const prizeAmount = (() => {
      if (typeof matchMeta.prizePool === 'number' && matchMeta.prizePool > 0) {
        return matchMeta.prizePool;
      }

      if (matchMeta.roomType === 'private') {
        if (participantCount <= 1) {
          return 0;
        }
        const gross = betAmount * Math.max(participantCount, 0);
        const net = gross * 0.9;
        return Math.max(0, Math.round(net * 100) / 100);
      }

      return betAmount * 4;
    })();

    const handleGameTransactions = async () => {
      if (
        matchMeta.matchStatus === 'active' &&
        betAmount > 0 &&
        platformUserId &&
        participantSnapshot &&
        !chargedMatchesRef.current.has(matchKey)
      ) {
        try {
          await chargeGameTicket(betAmount, `${matchKey}-ticket`);
          chargedMatchesRef.current.add(matchKey);
          await refreshAuthUser();
        } catch (error) {
          console.error('Falha ao debitar ticket do jogo', error);
        }
      }

      if (
        matchMeta.matchStatus === 'finished' &&
        betAmount > 0 &&
        platformUserId &&
        matchMeta.winnerId === localPlayerId &&
        !rewardedMatchesRef.current.has(matchKey)
      ) {
        try {
          if (prizeAmount > 0) {
            await rewardGameWinner(prizeAmount, `${matchKey}-reward`);
            rewardedMatchesRef.current.add(matchKey);
            await refreshAuthUser();
          }
        } catch (error) {
          console.error('Falha ao creditar prêmio do vencedor', error);
        }
      }
    };

    if (matchMeta.matchStatus === 'waiting') {
      chargedMatchesRef.current.delete(matchKey);
      rewardedMatchesRef.current.delete(matchKey);
    } else {
      handleGameTransactions();
    }
  }, [
    gameMode,
    platformUserId,
    matchMeta.matchStatus,
    matchMeta.betAmount,
    matchMeta.winnerId,
    matchMeta.roomType,
    matchMeta.prizePool,
    matchMeta.playerCount,
    matchMeta.players,
    matchSeed,
    localPlayerId,
    chargeGameTicket,
    rewardGameWinner,
    refreshAuthUser
  ]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "manipulation",
          position: "absolute",
          top: 0,
          left: 0,
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          WebkitTapHighlightColor: "transparent"
        }}
      />
      <ScoreDisplay />
      <GameOverModal localPhysicsRef={localPhysicsRef} trackRef={trackRef} />
      {/* Countdown visual durante o início da partida */}
      {gameMode === 'multiplayer' && matchMeta.matchStatus === 'countdown' && (matchMeta.countdown || 0) > 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '120px',
            fontWeight: 'bold',
            color: '#6E8BFF',
            textShadow: '0 0 20px rgba(110, 139, 255, 0.8), 0 0 40px rgba(110, 139, 255, 0.5)',
            animation: 'pulse 0.5s ease-in-out'
          }}>
            {matchMeta.countdown}
          </div>
          <div style={{
            fontSize: '24px',
            color: '#E8ECF3',
            marginTop: '20px',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)'
          }}>
            Prepare-se...
          </div>
        </div>
      )}
    </>
  );
};
