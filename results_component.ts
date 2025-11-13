import React, { useState, useEffect } from 'react';
import { useGameStore, useAuthStore, useWalletStore, useMultiplayerStore } from '../store/gameStore';

interface ResultsProps {
  onPlayAgain?: () => void;
  onBackToLobby?: () => void;
  onShare?: (results: GameResults) => void;
}

interface GameResults {
  distance: number;
  score: number;
  duration: number;
  betAmount?: number;
  winAmount?: number;
  isNewBest: boolean;
  rank?: number;
  totalPlayers?: number;
  achievements?: string[];
}

export const Results: React.FC<ResultsProps> = ({
  onPlayAgain,
  onBackToLobby,
  onShare
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState(0);

  const { user } = useAuthStore();
  const { balance, processWin } = useWalletStore();
  const { 
    distance, 
    score, 
    bestDistance, 
    gameStartTime,
    isMultiplayer,
    currentRoom
  } = useGameStore();
  
  const { players, currentRoom: room } = useMultiplayerStore();

  // Calculate game results
  const gameResults: GameResults = {
    distance: Math.floor(distance),
    score: Math.floor(score),
    duration: (Date.now() - gameStartTime) / 1000,
    betAmount: currentRoom?.betAmount || room?.betAmount,
    winAmount: calculateWinAmount(),
    isNewBest: distance > bestDistance,
    rank: isMultiplayer ? calculatePlayerRank() : undefined,
    totalPlayers: isMultiplayer ? players.length : undefined,
    achievements: calculateAchievements()
  };

  function calculateWinAmount(): number {
    if (!gameResults.betAmount || gameResults.betAmount === 0) return 0;
    
    if (isMultiplayer && room) {
      // Multiplayer payout logic
      const rank = calculatePlayerRank();
      const totalPot = room.playerCount * gameResults.betAmount;
      
      switch (rank) {
        case 1: return Math.floor(totalPot * 0.6); // Winner gets 60%
        case 2: return Math.floor(totalPot * 0.3); // Second gets 30%
        case 3: return Math.floor(totalPot * 0.1); // Third gets 10%
        default: return 0; // Others get nothing
      }
    } else {
      // Single player - simple score multiplier
      const multiplier = distance > bestDistance ? 2.5 : distance > 1000 ? 2.0 : distance > 500 ? 1.5 : 1.0;
      return Math.floor(gameResults.betAmount * multiplier);
    }
  }

  function calculatePlayerRank(): number {
    if (!isMultiplayer || players.length === 0) return 1;
    
    const userPlayer = players.find(p => p.id === user?.id);
    if (!userPlayer) return players.length;

    return players
      .sort((a, b) => b.distance - a.distance)
      .findIndex(p => p.id === user?.id) + 1;
  }

  function calculateAchievements(): string[] {
    const achievements: string[] = [];
    
    // Distance achievements
    if (gameResults.distance >= 2000) achievements.push('🏆 Distance Master');
    else if (gameResults.distance >= 1000) achievements.push('🥈 Kilometer Club');
    else if (gameResults.distance >= 500) achievements.push('🥉 Half-K Hero');

    // Score achievements
    if (gameResults.score >= 100000) achievements.push('💎 Score Legend');
    else if (gameResults.score >= 50000) achievements.push('⭐ High Scorer');

    // Special achievements
    if (gameResults.isNewBest) achievements.push('🎯 Personal Best');
    if (gameResults.duration < 60 && gameResults.distance > 300) achievements.push('⚡ Speed Demon');
    if (isMultiplayer && gameResults.rank === 1) achievements.push('👑 Victory Royale');
    
    return achievements;
  }

  // Celebration animation phases
  useEffect(() => {
    const phases = [
      { delay: 0, phase: 0 },      // Initial
      { delay: 500, phase: 1 },    // Stats appear
      { delay: 1000, phase: 2 },   // Achievements
      { delay: 1500, phase: 3 },   // Final celebration
    ];

    phases.forEach(({ delay, phase }) => {
      setTimeout(() => setCelebrationPhase(phase), delay);
    });

    // Process winnings
    if (gameResults.winAmount > 0) {
      setTimeout(() => {
        processWin(gameResults.winAmount);
      }, 2000);
    }
  }, [gameResults.winAmount, processWin]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => `R$ ${amount.toFixed(2)}`;

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#fff';
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(gameResults);
    } else {
      // Fallback sharing
      const shareText = `🏎️ Just scored ${gameResults.score.toLocaleString()} points and traveled ${gameResults.distance}m in Drift cash! ${gameResults.isNewBest ? '🎯 New personal best!' : ''} #DriftToRight`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Drift cash - Game Results',
          text: shareText,
          url: window.location.origin
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Results copied to clipboard!');
        }).catch(() => {
          alert('Unable to share results');
        });
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: gameResults.rank === 1 
        ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)'
        : gameResults.isNewBest
        ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 50%, #388e3c 100%)'
        : 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
      fontFamily: 'Arial, sans-serif',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        opacity: 0.3,
        animation: gameResults.rank === 1 ? 'celebrationFloat 3s ease-in-out infinite' : 'float 20s ease-in-out infinite'
      }} />

      {/* Confetti for winners */}
      {(gameResults.rank === 1 || gameResults.isNewBest) && celebrationPhase >= 2 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          background: `
            radial-gradient(circle at 20% 50%, transparent 20%, rgba(255,215,0,0.3) 21%, rgba(255,215,0,0.3) 29%, transparent 30%),
            radial-gradient(circle at 80% 50%, transparent 20%, rgba(255,165,0,0.3) 21%, rgba(255,165,0,0.3) 29%, transparent 30%),
            radial-gradient(circle at 50% 30%, transparent 20%, rgba(76,175,80,0.3) 21%, rgba(76,175,80,0.3) 29%, transparent 30%)
          `,
          animation: 'confetti 2s ease-out infinite'
        }} />
      )}

      {/* Main Results Container */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#333',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        textAlign: 'center',
        position: 'relative',
        transform: celebrationPhase >= 1 ? 'scale(1)' : 'scale(0.9)',
        opacity: celebrationPhase >= 1 ? 1 : 0,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>

        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          {gameResults.rank === 1 ? (
            <div>
              <div style={{ fontSize: '64px', marginBottom: '10px' }}>🏆</div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '32px', 
                background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold'
              }}>
                VICTORY!
              </h1>
              <p style={{ margin: '5px 0 0 0', fontSize: '16px', color: '#666' }}>
                Champion of the race!
              </p>
            </div>
          ) : gameResults.isNewBest ? (
            <div>
              <div style={{ fontSize: '64px', marginBottom: '10px' }}>🎯</div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '32px', 
                background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold'
              }}>
                NEW BEST!
              </h1>
              <p style={{ margin: '5px 0 0 0', fontSize: '16px', color: '#666' }}>
                Personal record achieved!
              </p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '64px', marginBottom: '10px' }}>🏎️</div>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#333', fontWeight: 'bold' }}>
                RACE COMPLETE
              </h1>
              <p style={{ margin: '5px 0 0 0', fontSize: '16px', color: '#666' }}>
                {isMultiplayer ? `Finished ${getRankEmoji(gameResults.rank || 1)}` : 'Good run!'}
              </p>
            </div>
          )}
        </div>

        {/* Main Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMultiplayer ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: '20px',
          marginBottom: '30px',
          transform: celebrationPhase >= 1 ? 'translateY(0)' : 'translateY(20px)',
          opacity: celebrationPhase >= 1 ? 1 : 0,
          transition: 'all 0.5s ease-out 0.3s'
        }}>
          
          {/* Distance */}
          <div style={{
            background: 'linear-gradient(135deg, #4CAF50, #45a049)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
              DISTANCE
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
              {gameResults.distance}m
            </div>
            {gameResults.isNewBest && (
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Previous: {Math.floor(bestDistance)}m
              </div>
            )}
          </div>

          {/* Score */}
          <div style={{
            background: 'linear-gradient(135deg, #FF9800, #F57C00)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
              SCORE
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
              {gameResults.score.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              Time: {formatTime(gameResults.duration)}
            </div>
          </div>

          {/* Rank (Multiplayer only) */}
          {isMultiplayer && (
            <div style={{
              background: gameResults.rank <= 3 
                ? `linear-gradient(135deg, ${getRankColor(gameResults.rank || 1)}, ${getRankColor(gameResults.rank || 1)}dd)`
                : 'linear-gradient(135deg, #607D8B, #455A64)',
              color: gameResults.rank <= 3 ? '#333' : 'white',
              padding: '20px',
              borderRadius: '16px',
              boxShadow: `0 4px 12px ${getRankColor(gameResults.rank || 1)}33`
            }}>
              <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px' }}>
                RANK
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
                {getRankEmoji(gameResults.rank || 1)}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                of {gameResults.totalPlayers} players
              </div>
            </div>
          )}
        </div>

        {/* Winnings */}
        {gameResults.winAmount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #4CAF50, #45a049)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '30px',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
            transform: celebrationPhase >= 2 ? 'scale(1)' : 'scale(0.95)',
            opacity: celebrationPhase >= 2 ? 1 : 0,
            transition: 'all 0.5s ease-out 0.6s'
          }}>
            <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px' }}>
              💰 WINNINGS
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
              +{formatCurrency(gameResults.winAmount)}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {gameResults.betAmount > 0 && `Bet: ${formatCurrency(gameResults.betAmount)} • `}
              New Balance: {formatCurrency(balance + gameResults.winAmount)}
            </div>
          </div>
        )}

        {/* Achievements */}
        {gameResults.achievements.length > 0 && (
          <div style={{
            marginBottom: '30px',
            transform: celebrationPhase >= 2 ? 'translateY(0)' : 'translateY(20px)',
            opacity: celebrationPhase >= 2 ? 1 : 0,
            transition: 'all 0.5s ease-out 0.9s'
          }}>
            <h3 style={{ 
              margin: '0 0 15px 0', 
              fontSize: '18px', 
              color: '#333',
              fontWeight: 'bold'
            }}>
              🏅 Achievements Unlocked
            </h3>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '10px',
              justifyContent: 'center'
            }}>
              {gameResults.achievements.map((achievement, index) => (
                <span
                  key={index}
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    color: '#333',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                    animation: `achievementPop 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  {achievement}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Multiplayer Leaderboard */}
        {isMultiplayer && players.length > 1 && (
          <div style={{
            marginBottom: '30px',
            transform: celebrationPhase >= 2 ? 'translateY(0)' : 'translateY(20px)',
            opacity: celebrationPhase >= 2 ? 1 : 0,
            transition: 'all 0.5s ease-out 1.2s'
          }}>
            <h3 style={{ 
              margin: '0 0 15px 0', 
              fontSize: '18px', 
              color: '#333',
              fontWeight: 'bold'
            }}>
              🏁 Final Results
            </h3>
            <div style={{
              background: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '12px',
              padding: '15px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {players
                .sort((a, b) => b.distance - a.distance)
                .slice(0, 8)
                .map((player, index) => (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: player.id === user?.id 
                        ? 'rgba(76, 175, 80, 0.1)' 
                        : 'transparent',
                      borderRadius: '8px',
                      marginBottom: '4px',
                      border: player.id === user?.id 
                        ? '2px solid rgba(76, 175, 80, 0.3)'
                        : '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: getRankColor(index + 1),
                        minWidth: '30px'
                      }}>
                        {getRankEmoji(index + 1)}
                      </span>
                      <span style={{ 
                        fontWeight: player.id === user?.id ? 'bold' : 'normal'
                      }}>
                        {player.name}
                        {player.id === user?.id && (
                          <span style={{
                            background: 'rgba(76, 175, 80, 0.2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            marginLeft: '8px'
                          }}>
                            YOU
                          </span>
                        )}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                        {Math.floor(player.distance)}m
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {Math.floor(player.score).toLocaleString()} pts
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '15px',
          marginTop: '30px',
          transform: celebrationPhase >= 3 ? 'translateY(0)' : 'translateY(20px)',
          opacity: celebrationPhase >= 3 ? 1 : 0,
          transition: 'all 0.5s ease-out 1.5s'
        }}>
          
          <button
            onClick={onPlayAgain}
            style={{
              padding: '14px 20px',
              background: 'linear-gradient(45deg, #4CAF50, #45a049)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
            }}
          >
            🔄 Play Again
          </button>

          <button
            onClick={handleShare}
            style={{
              padding: '14px 20px',
              background: 'linear-gradient(45deg, #2196F3, #1976D2)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
            }}
          >
            📱 Share
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              padding: '14px 20px',
              background: 'rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '12px',
              color: '#333',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
            }}
          >
            📊 {showDetails ? 'Hide' : 'Details'}
          </button>

          <button
            onClick={onBackToLobby}
            style={{
              padding: '14px 20px',
              background: 'rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '12px',
              color: '#333',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
            }}
          >
            🏠 Lobby
          </button>
        </div>

        {/* Detailed Stats (Expandable) */}
        {showDetails && (
          <div style={{
            marginTop: '25px',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 Detailed Statistics</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              fontSize: '14px'
            }}>
              <div>
                <div style={{ opacity: 0.7 }}>Average Speed</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {Math.round((gameResults.distance / gameResults.duration) * 3.6)} km/h
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.7 }}>Distance Rate</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {(gameResults.distance / gameResults.duration).toFixed(1)} m/s
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.7 }}>Score Rate</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {Math.round(gameResults.score / gameResults.duration)}/s
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.7 }}>Points per Meter</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {(gameResults.score / gameResults.distance).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes celebrationFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(2deg); }
          66% { transform: translateY(-10px) rotate(-2deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes confetti {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        
        @keyframes achievementPop {
          0% { transform: scale(0) rotate(-5deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        @keyframes slideDown {
          0% { max-height: 0; opacity: 0; transform: translateY(-10px); }
          100% { max-height: 500px; opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};