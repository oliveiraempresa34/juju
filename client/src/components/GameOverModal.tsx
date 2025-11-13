import React from 'react';
import { useGameStore } from '../store/useGame';
import { useRoomStore } from '../store/useRoom';
import { useAppStore } from '../store/useApp';
import { useAuthStore } from '../store/useAuth';

interface GameOverModalProps {
  localPhysicsRef: React.MutableRefObject<any>;
  trackRef?: React.MutableRefObject<any>;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ localPhysicsRef, trackRef }) => {
  const { isGameOver, currentDistance, startNewGame, resetGame, gameMode, multiplayerInstance } = useGameStore();
  const { setScreen } = useAppStore();
  const { refreshUser } = useAuthStore();
  const isMultiplayer = gameMode === 'multiplayer';

  const handleStartNewGame = () => {
    // APENAS para demo/practice - multiplayer não permite restart
    if (isMultiplayer) {
      handleCloseGame();
      return;
    }

    // Resetar física local
    if (localPhysicsRef.current) {
      localPhysicsRef.current.reset();
    }

    // Resetar pista completamente
    if (trackRef?.current) {
      trackRef.current.resetTrack();
    }

    // Resetar jogador para posição inicial
    const { localPlayerId } = useRoomStore.getState();
    if (localPlayerId) {
      useRoomStore.getState().upsertPlayer({
        id: localPlayerId,
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

    // Iniciar novo jogo
    startNewGame();
  };

  const handleCloseGame = async () => {
    // Resetar física local
    if (localPhysicsRef.current) {
      localPhysicsRef.current.reset();
    }

    // Resetar pista completamente
    if (trackRef?.current) {
      trackRef.current.resetTrack();
    }

    // CRITICAL: Limpar conexão multiplayer se existir
    if (isMultiplayer && multiplayerInstance) {
      console.log('[GameOverModal] Disposing multiplayer connection');
      multiplayerInstance.dispose();
      useGameStore.getState().setMultiplayerInstance(undefined);
    }

    // Resetar estados
    resetGame();
    useRoomStore.getState().reset();

    // CRITICAL: Atualizar saldo do usuário
    try {
      await refreshUser();
      console.log('[GameOverModal] User balance updated');
    } catch (error) {
      console.error('[GameOverModal] Failed to refresh user:', error);
    }

    // Navegar para o lobby
    setScreen('lobby');
  };

  if (!isGameOver) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(11, 15, 20, 0.88)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      color: 'var(--color-text-primary)',
      backdropFilter: 'blur(12px)'
    }}>
      <div style={{
        background: 'rgba(17, 23, 35, 0.9)',
        padding: '40px',
        borderRadius: '18px',
        border: '1px solid rgba(34, 48, 86, 0.8)',
        textAlign: 'center',
        boxShadow: '0 24px 48px rgba(12, 20, 32, 0.6)',
        minWidth: 'min(90vw, 420px)'
      }}>
        <h1 style={{
          fontSize: '48px',
          margin: '0 0 20px 0',
          background: 'linear-gradient(140deg, #6E8BFF, #4169E1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.04em'
        }}>
          GAME OVER
        </h1>

        <p style={{
          fontSize: '24px',
          margin: '20px 0',
          color: 'var(--color-text-secondary)'
        }}>
          Você saiu da pista!
        </p>

        <p style={{
          fontSize: '18px',
          margin: '20px 0',
          color: 'var(--color-text-primary)'
        }}>
          Distância percorrida: <span style={{ color: 'var(--color-primary-light)', fontWeight: 'bold' }}>
            {Math.round(currentDistance)}m
          </span>
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={handleStartNewGame}
            className="button-cta"
            style={{ flex: 1 }}
          >
            NOVA PARTIDA
          </button>
          <button
            onClick={handleCloseGame}
            className="button-secondary"
            style={{ flex: 1 }}
          >
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
};
