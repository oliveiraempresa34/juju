import React, { useState, useEffect } from 'react';
import { useGameStore, useAuthStore, useWalletStore } from '../store/gameStore';

interface LobbyProps {
  onStartSinglePlayer?: () => void;
  onJoinMultiplayer?: (roomId: string) => void;
  onCreateRoom?: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  onStartSinglePlayer,
  onJoinMultiplayer,
  onCreateRoom
}) => {
  const [activeTab, setActiveTab] = useState<'play' | 'leaderboard' | 'history' | 'profile'>('play');
  const [showWallet, setShowWallet] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [quickPlayBet, setQuickPlayBet] = useState(10);

  const { user, logout } = useAuthStore();
  const { 
    balance, 
    transactions, 
    loadWallet, 
    deposit, 
    withdraw,
    pendingDeposits,
    pendingWithdrawals 
  } = useWalletStore();
  
  const {
    bestDistance,
    loadGameHistory,
    startGame,
    setScreen
  } = useGameStore();

  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadWallet();
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [history, leaderboardData, rooms] = await Promise.all([
        loadGameHistory(),
        fetchLeaderboard(),
        fetchAvailableRooms()
      ]);
      
      setGameHistory(history);
      setLeaderboard(leaderboardData);
      setAvailableRooms(rooms);
    } catch (error) {
      console.error('Failed to load lobby data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    // Mock leaderboard data - replace with actual API call
    return [
      { rank: 1, username: 'DriftKing', distance: 2847, score: 156230 },
      { rank: 2, username: 'SpeedDemon', distance: 2654, score: 142890 },
      { rank: 3, username: 'Curvemaster', distance: 2431, score: 134560 },
      { rank: 4, username: user?.username || 'You', distance: bestDistance, score: bestDistance * 45 },
      { rank: 5, username: 'NitroRacer', distance: 2287, score: 128900 }
    ].sort((a, b) => b.distance - a.distance).map((player, index) => ({ ...player, rank: index + 1 }));
  };

  const fetchAvailableRooms = async () => {
    // Mock room data - replace with actual API call
    return [
      { id: 'room1', name: 'Beginners Only', players: 3, maxPlayers: 5, bet: 5, status: 'waiting' },
      { id: 'room2', name: 'High Stakes', players: 2, maxPlayers: 4, bet: 50, status: 'waiting' },
      { id: 'room3', name: 'Practice Room', players: 1, maxPlayers: 8, bet: 0, status: 'waiting' },
      { id: 'room4', name: 'Pro League', players: 4, maxPlayers: 5, bet: 100, status: 'starting' }
    ];
  };

  const handleQuickPlay = () => {
    if (quickPlayBet > balance) {
      alert('Insufficient balance for this bet amount');
      return;
    }
    
    startGame(false);
    onStartSinglePlayer?.();
  };

  const handleDeposit = async (method: 'pix' | 'card') => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await deposit(amount, method);
      setDepositAmount('');
      alert(`${method.toUpperCase()} deposit of R$ ${amount.toFixed(2)} initiated`);
    } catch (error) {
      alert('Deposit failed. Please try again.');
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      alert('Insufficient balance');
      return;
    }

    try {
      await withdraw(amount, 'pix');
      setWithdrawAmount('');
      alert(`PIX withdrawal of R$ ${amount.toFixed(2)} initiated`);
    } catch (error) {
      alert('Withdrawal failed. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => `R$ ${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
      fontFamily: 'Arial, sans-serif',
      color: 'white'
    }}>
      {/* Header */}
      <header style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '24px' }}>🏎️ DRIFT CASH</h1>
            <span style={{
              background: 'rgba(76, 175, 80, 0.2)',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              border: '1px solid rgba(76, 175, 80, 0.3)'
            }}>
              LOBBY
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Wallet Display */}
            <div 
              onClick={() => setShowWallet(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '8px 16px',
                borderRadius: '12px',
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              <div style={{ fontSize: '14px', opacity: 0.8 }}>Balance</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {formatCurrency(balance)}
              </div>
            </div>

            {/* User Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Welcome, {user?.username}!</span>
              <button
                onClick={logout}
                style={{
                  background: 'rgba(244, 67, 54, 0.2)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '30px 20px' 
      }}>
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '5px',
          marginBottom: '30px',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '5px',
          borderRadius: '12px'
        }}>
          {[
            { key: 'play', label: '🎮 Play', icon: '🎮' },
            { key: 'leaderboard', label: '🏆 Leaderboard', icon: '🏆' },
            { key: 'history', label: '📊 History', icon: '📊' },
            { key: 'profile', label: '👤 Profile', icon: '👤' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: activeTab === tab.key 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '16px',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'play' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Quick Play */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '25px',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>🚀 Quick Play</h3>
              <p style={{ margin: '0 0 20px 0', opacity: 0.8 }}>
                Jump straight into action with a single-player game
              </p>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Bet Amount
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  {[5, 10, 25, 50].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setQuickPlayBet(amount)}
                      style={{
                        padding: '8px 16px',
                        background: quickPlayBet === amount 
                          ? 'rgba(76, 175, 80, 0.3)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid ' + (quickPlayBet === amount 
                          ? 'rgba(76, 175, 80, 0.5)' 
                          : 'rgba(255, 255, 255, 0.2)'),
                        color: 'white',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      R$ {amount}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  Your best: {bestDistance}m
                </div>
              </div>
              
              <button
                onClick={handleQuickPlay}
                disabled={quickPlayBet > balance}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: quickPlayBet > balance 
                    ? 'rgba(244, 67, 54, 0.3)' 
                    : 'linear-gradient(45deg, #4CAF50, #45a049)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: quickPlayBet > balance ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {quickPlayBet > balance ? '💰 Insufficient Balance' : '🎮 Start Game'}
              </button>
            </div>

            {/* Multiplayer */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '25px',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>👥 Multiplayer</h3>
              <p style={{ margin: '0 0 20px 0', opacity: 0.8 }}>
                Compete with other players in real-time
              </p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  onClick={onCreateRoom}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(45deg, #2196F3, #1976D2)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Create Room
                </button>
                <button
                  onClick={() => setScreen('room')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '10px',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🔍 Browse Rooms
                </button>
              </div>

              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                Active Rooms ({availableRooms.length})
              </div>
              
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {availableRooms.slice(0, 3).map(room => (
                  <div
                    key={room.id}
                    onClick={() => onJoinMultiplayer?.(room.id)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {room.name}
                        </div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>
                          {room.players}/{room.maxPlayers} players • {formatCurrency(room.bet)} bet
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: room.status === 'waiting' 
                          ? 'rgba(76, 175, 80, 0.2)' 
                          : 'rgba(255, 152, 0, 0.2)',
                        color: room.status === 'waiting' ? '#4CAF50' : '#FF9800'
                      }}>
                        {room.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '25px',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>🏆 Global Leaderboard</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Rank</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Player</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Best Distance</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>High Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player, index) => (
                    <tr 
                      key={player.username}
                      style={{
                        background: player.username === user?.username 
                          ? 'rgba(76, 175, 80, 0.1)' 
                          : index % 2 === 0 
                          ? 'rgba(255, 255, 255, 0.02)' 
                          : 'transparent',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: index < 3 
                            ? ['#FFD700', '#C0C0C0', '#CD7F32'][index]
                            : 'rgba(255, 255, 255, 0.1)',
                          color: index < 3 ? '#000' : '#FFF',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          #{player.rank}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>
                        {player.username}
                        {player.username === user?.username && (
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
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '16px' }}>
                        {player.distance}m
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '16px' }}>
                        {player.score.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '25px',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>📊 Game History</h3>
            
            {gameHistory.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                opacity: 0.7 
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
                <div>No games played yet</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>
                  Start playing to build your history!
                </div>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '15px' 
              }}>
                {gameHistory.slice(0, 6).map((session, index) => (
                  <div
                    key={session.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <span style={{ fontWeight: 'bold' }}>
                        Game #{gameHistory.length - index}
                      </span>
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>
                        {formatDate(session.timestamp)}
                      </span>
                    </div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '12px',
                      fontSize: '14px'
                    }}>
                      <div>
                        <div style={{ opacity: 0.7 }}>Distance</div>
                        <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>
                          {session.distance}m
                        </div>
                      </div>
                      <div>
                        <div style={{ opacity: 0.7 }}>Score</div>
                        <div style={{ fontWeight: 'bold', color: '#FF9800' }}>
                          {session.score.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ opacity: 0.7 }}>Duration</div>
                        <div style={{ fontWeight: 'bold' }}>
                          {Math.floor(session.duration / 60)}:{(session.duration % 60).toFixed(0).padStart(2, '0')}
                        </div>
                      </div>
                      <div>
                        <div style={{ opacity: 0.7 }}>Result</div>
                        <div style={{ 
                          fontWeight: 'bold',
                          color: session.winAmount ? '#4CAF50' : '#F44336'
                        }}>
                          {session.winAmount 
                            ? `+${formatCurrency(session.winAmount)}`
                            : session.betAmount 
                            ? `-${formatCurrency(session.betAmount)}`
                            : 'Practice'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '25px',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>👤 Player Profile</h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px' 
            }}>
              <div>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Account Info</h4>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div><strong>Username:</strong> {user?.username}</div>
                  <div><strong>Email:</strong> {user?.email}</div>
                  <div><strong>Member since:</strong> {formatDate(user?.createdAt || '')}</div>
                </div>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Game Stats</h4>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div><strong>Best Distance:</strong> {bestDistance}m</div>
                  <div><strong>Games Played:</strong> {gameHistory.length}</div>
                  <div><strong>Total Playtime:</strong> {Math.floor(gameHistory.reduce((sum, game) => sum + game.duration, 0) / 3600)}h</div>
                </div>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Wallet</h4>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div><strong>Balance:</strong> {formatCurrency(balance)}</div>
                  <div><strong>Pending Deposits:</strong> {formatCurrency(pendingDeposits)}</div>
                  <div><strong>Pending Withdrawals:</strong> {formatCurrency(pendingWithdrawals)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Modal */}
      {showWallet && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#333',
            padding: '30px',
            borderRadius: '20px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, fontSize: '24px' }}>💰 Wallet</h3>
              <button
                onClick={() => setShowWallet(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <div style={{ 
                background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                color: 'white',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Current Balance</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '5px 0' }}>
                  {formatCurrency(balance)}
                </div>
                {(pendingDeposits > 0 || pendingWithdrawals > 0) && (
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                    {pendingDeposits > 0 && `+${formatCurrency(pendingDeposits)} pending`}
                    {pendingWithdrawals > 0 && ` • -${formatCurrency(pendingWithdrawals)} withdrawing`}
                  </div>
                )}
              </div>
            </div>

            {/* Deposit Section */}
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 15px 0' }}>💳 Deposit</h4>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="number"
                  placeholder="Amount (R$)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleDeposit('pix')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#32CD32',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  📱 PIX
                </button>
                <button
                  onClick={() => handleDeposit('card')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#2196F3',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  💳 Card
                </button>
              </div>
            </div>

            {/* Withdraw Section */}
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ margin: '0 0 15px 0' }}>💸 Withdraw</h4>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input
                  type="number"
                  placeholder="Amount (R$)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  max={balance}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) > balance}
                  style={{
                    padding: '12px 20px',
                    background: (!withdrawAmount || parseFloat(withdrawAmount) > balance) 
                      ? '#ccc' 
                      : '#FF9800',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: (!withdrawAmount || parseFloat(withdrawAmount) > balance) 
                      ? 'not-allowed' 
                      : 'pointer'
                  }}
                >
                  📱 PIX
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <h4 style={{ margin: '0 0 15px 0' }}>📋 Recent Transactions</h4>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '10px'
              }}>
                {transactions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                    No transactions yet
                  </div>
                ) : (
                  transactions.slice(0, 5).map(transaction => (
                    <div
                      key={transaction.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid #eee'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          {transaction.type.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {formatDate(transaction.timestamp)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontWeight: 'bold',
                          color: transaction.type === 'deposit' || transaction.type === 'win' 
                            ? '#4CAF50' 
                            : '#F44336'
                        }}>
                          {transaction.type === 'deposit' || transaction.type === 'win' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: transaction.status === 'completed' 
                            ? '#4CAF50' 
                            : transaction.status === 'pending'
                            ? '#FF9800'
                            : '#F44336'
                        }}>
                          {transaction.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};