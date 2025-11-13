import React from 'react';
import { useScoreStore } from '../store/useScore';
import { useAppStore } from '../store/useApp';
import { useGameStore } from '../store/useGame';
import { useRoomStore } from '../store/useRoom';

export const ScoreDisplay: React.FC = () => {
  const { currentScore, bestScore } = useScoreStore();
  const { setScreen } = useAppStore();
  const { resetGame } = useGameStore();

  const handleCloseGame = () => {
    // Resetar o jogo
    resetGame();
    useRoomStore.getState().reset();
    // Navegar para o lobby
    setScreen('lobby');
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      gap: '30px',
      pointerEvents: 'auto',
      fontSize: '18px',
      fontWeight: 600,
    }}>
      {/* Pontuação Atual */}
      <div style={{
        background: 'rgba(17, 23, 35, 0.82)',
        color: 'var(--color-primary-light)',
        padding: '12px 20px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        border: '1px solid rgba(34, 48, 86, 0.7)',
        boxShadow: '0 12px 28px rgba(12, 20, 32, 0.45)',
        backdropFilter: 'blur(12px)'
      }}>
        <span style={{ fontSize: '20px' }}>🎯</span>
        <div>
          <div style={{ fontSize: '12px', opacity: 0.72, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A5AEBC' }}>PONTOS</div>
          <div style={{ fontSize: '22px', lineHeight: '1.1', fontVariantNumeric: 'tabular-nums' }}>{currentScore.toLocaleString()}</div>
        </div>
      </div>

      {/* Melhor Pontuação */}
      <div style={{
        background: 'rgba(17, 23, 35, 0.82)',
        color: '#F0C674',
        padding: '12px 20px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        border: '1px solid rgba(34, 48, 86, 0.7)',
        boxShadow: '0 12px 28px rgba(12, 20, 32, 0.45)',
        backdropFilter: 'blur(12px)'
      }}>
        <span style={{ fontSize: '20px' }}>🏆</span>
        <div>
          <div style={{ fontSize: '12px', opacity: 0.72, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A5AEBC' }}>RECORDE</div>
          <div style={{ fontSize: '22px', lineHeight: '1.1', fontVariantNumeric: 'tabular-nums' }}>{bestScore.toLocaleString()}</div>
        </div>
      </div>

      {/* Botão X para sair */}
      <button
        onClick={handleCloseGame}
        className="button-secondary button-secondary--danger"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '18px',
          fontSize: '24px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 28px rgba(12, 20, 32, 0.5)'
        }}
      >
        ×
      </button>
    </div>
  );
};
