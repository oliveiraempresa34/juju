import React, { useEffect, useRef, useState } from 'react';
import { useRoomStore } from '../store/useRoom';
import { useAppStore } from '../store/useApp';
import { useGameStore } from '../store/useGame';
import { MultiplayerSync } from '../game/MultiplayerSync';

interface WaitingLobbyProps {
  onLeave: () => void;
}

export const WaitingLobby: React.FC<WaitingLobbyProps> = ({ onLeave }) => {
  const [isHost, setIsHost] = useState(false);
  const [playerAvatars, setPlayerAvatars] = useState<Record<string, string | null>>({});

  const {
    status,
    matchStatus,
    players,
    localPlayerId,
    betAmount,
    roomType,
    inviteCode,
    prizePool,
    countdown,
    winnerId,
    playerCount,
    hostId,
    error
  } = useRoomStore();

  const { setScreen } = useAppStore();
  const { multiplayerOptions, multiplayerInstance, setMultiplayerInstance } = useGameStore();

  useEffect(() => {
    setIsHost(localPlayerId === hostId);
  }, [localPlayerId, hostId]);

  // CRITICAL: Log quando players mudam para debug
  useEffect(() => {
    const playerIds = Object.keys(players);
    console.log('[WaitingLobby] 📋 Players updated:', {
      count: playerIds.length,
      playerCount: playerCount,
      ids: playerIds,
      names: Object.values(players).map(p => p.name)
    });
  }, [players, playerCount]);

  // Fetch player avatars when players change
  useEffect(() => {
    const fetchAvatars = async () => {
      for (const player of Object.values(players)) {
        if (player && player.id && !playerAvatars[player.id]) {
          try {
            const response = await fetch(`/api/users/${player.id}/avatar`);
            if (response.ok) {
              const data = await response.json();
              setPlayerAvatars(prev => ({ ...prev, [player.id]: data.avatar }));
            } else if (response.status === 404) {
              // Avatar not found - silently mark as fetched to prevent retry
              setPlayerAvatars(prev => ({ ...prev, [player.id]: null }));
            }
          } catch (error) {
            // Network error - silently ignore
            setPlayerAvatars(prev => ({ ...prev, [player.id]: null }));
          }
        }
      }
    };

    if (Object.keys(players).length > 0) {
      fetchAvatars();
    }
  }, [players]);

  // Automatically transition to game when match starts loading
  useEffect(() => {
    console.log('[WaitingLobby] 🎯 matchStatus changed:', {
      matchStatus,
      shouldTransition: matchStatus === 'loading',
      currentScreen: 'waiting'
    });

    // CRITICAL: Only transition on 'loading', not 'active'
    // If already 'active', it's too late to join the match
    if (matchStatus === 'loading') {
      console.log('[WaitingLobby] ✅ Transitioning to game screen!');
      setScreen('game');
    }
  }, [matchStatus, setScreen]);

  // Initialize multiplayer connection when component mounts
  useEffect(() => {
    if (multiplayerOptions && !multiplayerInstance) {
      console.log('[WaitingLobby] 🔌 Initializing multiplayer connection', multiplayerOptions);
      const mp = new MultiplayerSync();
      setMultiplayerInstance(mp);

      // Connect immediately
      mp.connect(multiplayerOptions)
        .then(() => {
          console.log('[WaitingLobby] ✅ Successfully connected to multiplayer');
          // Clear options after successful connection to prevent duplicate connections
          useGameStore.getState().clearMultiplayerOptions();

          // CRITICAL: Force check for players after 1 second
          setTimeout(() => {
            const { players, playerCount } = useRoomStore.getState();
            const localCount = Object.keys(players).length;
            console.log('[WaitingLobby] 📊 Player check after connection:', {
              localCount,
              serverCount: playerCount,
              playerIds: Object.keys(players)
            });
          }, 1000);
        })
        .catch((err) => {
          console.error('[WaitingLobby] ❌ Failed to connect to multiplayer:', err);
          setScreen('lobby');
          alert(`Erro ao conectar: ${err.message || 'Falha na conexão'}`);
        });
    }
  }, [multiplayerOptions, multiplayerInstance, setMultiplayerInstance, setScreen]);

  // Cleanup connection when match finishes
  useEffect(() => {
    if (matchStatus === 'finished' && multiplayerInstance) {
      console.log('[WaitingLobby] Match finished, cleaning up connection');
      const timer = setTimeout(() => {
        if (multiplayerInstance) {
          multiplayerInstance.dispose();
          setMultiplayerInstance(undefined);
        }
      }, 10000); // Wait 10s before cleanup to show results

      return () => clearTimeout(timer);
    }
  }, [matchStatus, multiplayerInstance, setMultiplayerInstance]);

  // CRITICAL: Derivar playersList de forma reativa
  const playersList = React.useMemo(() => {
    return Object.values(players).filter(player => !player.eliminated);
  }, [players]);

  const maxPlayers = 5;

  // CRITICAL: Calcular contagem real de players
  const actualPlayerCount = React.useMemo(() => {
    // Usar o maior valor entre playerCount do servidor e playersList local
    const localCount = playersList.length;
    const serverCount = playerCount || 0;
    return Math.max(localCount, serverCount);
  }, [playersList.length, playerCount]);

  const resolvedInviteCode = React.useMemo(() => {
    if (roomType !== 'private') {
      return undefined;
    }
    const trimmed = typeof inviteCode === 'string' ? inviteCode.trim().toUpperCase() : '';
    return trimmed.length >= 4 ? trimmed : undefined;
  }, [roomType, inviteCode]);

  const derivedPrizePool = React.useMemo(() => {
    if (roomType === 'private') {
      const serverValue = typeof prizePool === 'number' ? prizePool : undefined;
      if (serverValue && serverValue > 0) {
        return serverValue;
      }

      const participantCount = typeof playerCount === 'number' && playerCount >= 0
        ? playerCount
        : playersList.length;
      if (participantCount <= 1) {
        return 0;
      }
      const gross = (betAmount || 0) * Math.max(participantCount, 0);
      const net = gross * 0.9;
      return Math.max(0, Math.round(net * 100) / 100);
    }

    if (typeof prizePool === 'number' && prizePool > 0) {
      return prizePool;
    }

    return (betAmount || 0) * 4;
  }, [roomType, prizePool, betAmount, playerCount, playersList.length]);

  const handleStartMatch = () => {
    console.log('[WaitingLobby] 🚀 Start Match clicked!', {
      hasInstance: !!multiplayerInstance,
      isHost,
      roomType,
      playerCount: actualPlayerCount
    });

    if (multiplayerInstance && isHost && roomType === 'private') {
      console.log('[WaitingLobby] 📤 Sending START_MATCH to server');
      multiplayerInstance.requestStartMatch();
    } else {
      console.warn('[WaitingLobby] ⚠️ Cannot start match:', {
        hasInstance: !!multiplayerInstance,
        isHost,
        roomType
      });
    }
  };

  const handleCopyInviteCode = async () => {
    if (resolvedInviteCode) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(resolvedInviteCode);
        } else {
          console.warn('Clipboard API não disponível');
        }
      } catch (err) {
        console.warn('Não foi possível copiar o código:', err);
      }
    }
  };

  const getStatusMessage = () => {
    switch (matchStatus) {
      case 'waiting':
        return 'Aguardando jogadores';
      case 'loading':
        return 'Carregando pista...';
      case 'countdown':
        return `Iniciando em ${countdown || 0}s`;
      case 'active':
        return 'Partida em andamento';
      case 'finished':
        return 'Partida finalizada';
      default:
        return status === 'connected' ? 'Conectado' : 'Conectando...';
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (error) {
    return (
      <div className="waiting-lobby">
        <div className="waiting-lobby__container">
          <div className="waiting-lobby__error">
            <h2>❌ Erro de Conexão</h2>
            <p>{error}</p>
            <button className="button-secondary" onClick={onLeave}>
              Voltar ao Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="waiting-lobby">
      <div className="waiting-lobby__container">
        <div className="waiting-lobby__header">
          <div className="waiting-lobby__game-info">
            <h1>🏎️ Drift cash</h1>
            <div className="waiting-lobby__room-details">
              <div className="room-detail">
                <span className="room-detail__label">Tipo</span>
                <span className="room-detail__value">
                  {roomType === 'private' ? '🔒 Privada' : '🌐 Pública'}
                </span>
              </div>
              <div className="room-detail">
                <span className="room-detail__label">Aposta</span>
                <span className="room-detail__value">{formatCurrency(betAmount || 0)}</span>
              </div>
              <div className="room-detail">
                <span className="room-detail__label">Prêmio</span>
                <span className="room-detail__value prize">{formatCurrency(derivedPrizePool)}</span>
              </div>
            </div>
          </div>

          <button className="button-secondary waiting-lobby__leave-btn" onClick={onLeave}>
            Sair da Sala
          </button>
        </div>

        <div className="waiting-lobby__status">
          <div className="status-indicator">
            <div className={`status-dot status-dot--${matchStatus || 'waiting'}`}></div>
            <span className="status-text">{getStatusMessage()}</span>
          </div>

          {roomType === 'private' && (
            <div className="invite-code-section">
              <div className="invite-code">
                <span className="invite-code__label">Código da Sala</span>
                <span className="invite-code__value">
                  {resolvedInviteCode ?? 'Gerando...'}
                </span>
                <button
                  className="copy-button"
                  onClick={handleCopyInviteCode}
                  title="Copiar código"
                  disabled={!resolvedInviteCode}
                >
                  📋
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="waiting-lobby__players">
          <div className="players-header">
            <h3>Jogadores na Sala ({actualPlayerCount}/{maxPlayers})</h3>
            {isHost && roomType === 'private' && matchStatus === 'waiting' && actualPlayerCount >= 2 && (
              <button className="button-cta" onClick={handleStartMatch}>
                Iniciar Partida
              </button>
            )}
          </div>

          <div className="players-grid">
            {Array.from({ length: maxPlayers }).map((_, index) => {
              const player = playersList[index];
              return (
                <div
                  key={index}
                  className={`player-slot ${player ? 'player-slot--occupied' : 'player-slot--empty'}`}
                >
                  {player ? (
                    <>
                      <div className="player-avatar">
                        {playerAvatars[player.id] ? (
                          <img
                            src={playerAvatars[player.id]!}
                            alt={player.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '50%'
                            }}
                          />
                        ) : (
                          <span className="player-avatar__icon">
                            {player.name ? player.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        )}
                        {player.id === hostId && (
                          <div className="host-badge">👑</div>
                        )}
                      </div>
                      <div className="player-info">
                        <span className="player-name">
                          {player.name}
                          {player.id === localPlayerId && ' (Você)'}
                        </span>
                        <span className="player-status">
                          {player.eliminated ? '❌ Eliminado' : '✅ Pronto'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="player-avatar player-avatar--empty">
                        <span className="player-avatar__icon">➕</span>
                      </div>
                      <div className="player-info">
                        <span className="player-name">Aguardando...</span>
                        <span className="player-status">Slot vazio</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {matchStatus === 'finished' && winnerId && (
          <div className="match-results">
            <h3>🏆 Partida Finalizada</h3>
            <p>
              Vencedor: <strong>{players[winnerId]?.name || 'Desconhecido'}</strong>
              {winnerId === localPlayerId && ' (Você ganhou!)'}
            </p>
            <p>Prêmio: {formatCurrency(prizePool || 0)}</p>
            <button className="button-cta" onClick={onLeave}>
              Voltar ao Lobby
            </button>
          </div>
        )}
      </div>

      <style>{`
        .waiting-lobby {
          min-height: 100vh;
          background: linear-gradient(135deg, #0B0F14 0%, #111723 50%, #0B0F14 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .waiting-lobby__container {
          background: rgba(17, 23, 35, 0.95);
          border: 1px solid rgba(34, 48, 86, 0.8);
          border-radius: 24px;
          padding: 32px;
          max-width: 800px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(12, 20, 32, 0.6);
          backdrop-filter: blur(20px);
        }

        .waiting-lobby__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          gap: 24px;
        }

        .waiting-lobby__game-info h1 {
          margin: 0 0 16px 0;
          color: #E8ECF3;
          font-size: 2rem;
          font-weight: 700;
        }

        .waiting-lobby__room-details {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .room-detail {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .room-detail__label {
          font-size: 0.75rem;
          color: #A5AEBC;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .room-detail__value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #E8ECF3;
        }

        .room-detail__value.prize {
          color: #3BD6B4;
        }

        .waiting-lobby__leave-btn {
          flex-shrink: 0;
        }

        .waiting-lobby__status {
          background: rgba(14, 20, 32, 0.8);
          border: 1px solid rgba(34, 48, 86, 0.7);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-dot--waiting {
          background: #F0C674;
        }

        .status-dot--countdown {
          background: #6E8BFF;
        }

        .status-dot--active {
          background: #3BD6B4;
        }

        .status-dot--finished {
          background: #FF6B81;
        }

        .status-text {
          font-size: 1.1rem;
          font-weight: 600;
          color: #E8ECF3;
        }

        .invite-code-section {
          display: flex;
          align-items: center;
        }

        .invite-code {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(110, 139, 255, 0.1);
          border: 1px solid rgba(110, 139, 255, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
        }

        .invite-code__label {
          font-size: 0.85rem;
          color: #A5AEBC;
        }

        .invite-code__value {
          font-size: 1.2rem;
          font-weight: 700;
          color: #6E8BFF;
          font-family: monospace;
        }

        .copy-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 4px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .copy-button:hover {
          background: rgba(110, 139, 255, 0.2);
        }

        .waiting-lobby__players {
          margin-bottom: 32px;
        }

        .players-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 16px;
        }

        .players-header h3 {
          margin: 0;
          color: #E8ECF3;
          font-size: 1.4rem;
        }

        .players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .player-slot {
          background: rgba(14, 20, 32, 0.6);
          border: 1px solid rgba(34, 48, 86, 0.6);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s ease;
        }

        .player-slot--occupied {
          border-color: rgba(110, 139, 255, 0.6);
          background: rgba(110, 139, 255, 0.05);
        }

        .player-slot--empty {
          opacity: 0.5;
        }

        .player-avatar {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(110, 139, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .player-avatar--empty {
          background: rgba(34, 48, 86, 0.3);
        }

        .player-avatar__icon {
          font-size: 1.5rem;
        }

        .host-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #F0C674;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          border: 2px solid rgba(17, 23, 35, 0.9);
        }

        .player-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .player-name {
          font-weight: 600;
          color: #E8ECF3;
        }

        .player-status {
          font-size: 0.85rem;
          color: #A5AEBC;
        }

        

        .match-results {
          background: rgba(59, 214, 180, 0.1);
          border: 1px solid rgba(59, 214, 180, 0.3);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
        }

        .match-results h3 {
          margin: 0 0 12px 0;
          color: #3BD6B4;
        }

        .match-results p {
          margin: 8px 0;
          color: #E8ECF3;
        }

        .waiting-lobby__error {
          text-align: center;
          padding: 40px;
        }

        .waiting-lobby__error h2 {
          color: #FF6B81;
          margin-bottom: 16px;
        }

        .waiting-lobby__error p {
          color: #A5AEBC;
          margin-bottom: 24px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .waiting-lobby__container {
            padding: 20px;
          }

          .waiting-lobby__header {
            flex-direction: column;
            align-items: stretch;
          }

          .waiting-lobby__room-details {
            justify-content: space-between;
          }

          .waiting-lobby__status {
            flex-direction: column;
            align-items: stretch;
          }

          .players-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .players-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
