import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuth';

interface RankingEntry {
  id: string;
  username: string;
  bestDistance: number;
  matchesPlayed: number;
  wins: number;
}

export const RankingPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const baseURL = import.meta.env.PROD ? '' : 'http://localhost:2567';
      const response = await fetch(`${baseURL}/api/users/ranking?limit=10`);

      if (response.ok) {
        const data = await response.json();
        setRanking(data);
      } else {
        console.error('Failed to fetch ranking', response.status);
        setRanking([]);
      }
    } catch (error) {
      console.error('Error fetching ranking:', error);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '16px' }}>🔄</div>
          <p>Carregando ranking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {/* Header */}
      <div className="panel-tonal">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            🏆 Ranking Global
          </h2>
          <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-secondary)' }}>
            Top 10 jogadores - Apenas partidas multiplayer
          </p>
        </div>

        {ranking.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum jogador no ranking ainda.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
              Seja o primeiro a jogar uma partida multiplayer!
            </p>
          </div>
        ) : (
          <div className="list-glow">
            {ranking.map((entry, index) => {
              const isCurrentUser = user?.id === entry.id;
              const position = index + 1;
              const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}º`;

              return (
                <div
                  key={entry.id}
                  className={`list-glow__item ${isCurrentUser ? 'table-row--highlight' : ''}`}
                  style={{
                    background: isCurrentUser
                      ? 'rgba(110, 139, 255, 0.15)'
                      : position <= 3
                      ? 'rgba(65, 105, 225, 0.08)'
                      : undefined
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    {/* Position Medal */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        background: position <= 3
                          ? 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), rgba(65, 105, 225, 0.8))'
                          : 'rgba(34, 48, 86, 0.6)',
                        border: position <= 3
                          ? '2px solid rgba(110, 139, 255, 0.6)'
                          : '1px solid rgba(34, 48, 86, 0.8)',
                        color: 'var(--color-text-primary)',
                        flexShrink: 0
                      }}
                    >
                      {medal}
                    </div>

                    {/* Player Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        color: isCurrentUser ? 'var(--color-primary-light)' : 'var(--color-text-primary)',
                        marginBottom: '4px'
                      }}>
                        {entry.username}
                        {isCurrentUser && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'var(--color-primary-base)',
                            color: 'white',
                            fontWeight: '600'
                          }}>
                            VOCÊ
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-text-secondary)',
                        display: 'flex',
                        gap: '16px'
                      }}>
                        <span>
                          🎮 {entry.matchesPlayed} {entry.matchesPlayed === 1 ? 'partida' : 'partidas'}
                        </span>
                        <span>
                          ✨ {entry.wins || 0} {entry.wins === 1 ? 'vitória' : 'vitórias'}
                        </span>
                      </div>
                    </div>

                    {/* Best Distance */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.4rem',
                        fontWeight: '700',
                        color: 'var(--color-success)',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        {Math.round(entry.bestDistance)}m
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Melhor
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="panel-tonal panel-tonal--subtle">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ fontSize: '1.5rem' }}>ℹ️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Como funciona o Ranking
            </div>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              color: 'var(--color-text-secondary)',
              fontSize: '0.9rem',
              lineHeight: '1.6'
            }}>
              <li>Apenas partidas <strong>multiplayer</strong> contam para o ranking</li>
              <li>Sua melhor distância percorrida define sua posição</li>
              <li>O ranking é atualizado automaticamente após cada partida</li>
              <li>Os 3 primeiros colocados recebem destaque especial</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
