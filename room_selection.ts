import React, { useState, useEffect } from 'react';
import { useGameStore, useAuthStore, useWalletStore, useMultiplayerStore } from '../store/gameStore';

interface RoomSelectionProps {
  onJoinRoom?: (roomId: string) => void;
  onBackToLobby?: () => void;
}

interface Room {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  betAmount: number;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  createdBy: string;
  isPrivate: boolean;
  password?: string;
  seed?: number;
  players?: Array<{
    id: string;
    username: string;
    avatar?: string;
    isReady: boolean;
  }>;
}

export const RoomSelection: React.FC<RoomSelectionProps> = ({
  onJoinRoom,
  onBackToLobby
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'create' | 'joined'>('browse');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'players' | 'bet' | 'status' | 'name'>('players');

  // Create room form
  const [createForm, setCreateForm] = useState({
    name: '',
    maxPlayers: 4,
    betAmount: 10,
    isPrivate: false,
    password: ''
  });
  const [createError, setCreateError] = useState('');

  // Join room states
  const [joinPassword, setJoinPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);

  const { user } = useAuthStore();
  const { balance } = useWalletStore();
  const { createRoom, joinRoom, currentRoom, players } = useMultiplayerStore();

  // Load rooms on mount and periodically
  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Apply filters when search term, filter, or sortBy changes
  useEffect(() => {
    applyFilters();
  }, [rooms, searchTerm, filter, sortBy]);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      // Mock API call - replace with actual API
      const mockRooms: Room[] = [
        {
          id: 'room1',
          name: 'Beginner Friendly',
          playerCount: 2,
          maxPlayers: 5,
          betAmount: 5,
          status: 'waiting',
          createdBy: 'NewbieFriendly',
          isPrivate: false,
          players: [
            { id: '1', username: 'NewbieFriendly', isReady: true },
            { id: '2', username: 'LearningToRace', isReady: false }
          ]
        },
        {
          id: 'room2',
          name: 'High Stakes Championship',
          playerCount: 3,
          maxPlayers: 4,
          betAmount: 100,
          status: 'waiting',
          createdBy: 'ProRacer99',
          isPrivate: false,
          players: [
            { id: '3', username: 'ProRacer99', isReady: true },
            { id: '4', username: 'SpeedDemon', isReady: true },
            { id: '5', username: 'DriftMaster', isReady: false }
          ]
        },
        {
          id: 'room3',
          name: 'Private Tournament',
          playerCount: 1,
          maxPlayers: 8,
          betAmount: 50,
          status: 'waiting',
          createdBy: 'TournamentHost',
          isPrivate: true,
          password: 'secret123'
        },
        {
          id: 'room4',
          name: 'Practice Session',
          playerCount: 4,
          maxPlayers: 6,
          betAmount: 0,
          status: 'starting',
          createdBy: 'PracticeMaster',
          isPrivate: false,
          players: [
            { id: '6', username: 'PracticeMaster', isReady: true },
            { id: '7', username: 'NewPlayer1', isReady: true },
            { id: '8', username: 'NewPlayer2', isReady: true },
            { id: '9', username: 'NewPlayer3', isReady: false }
          ]
        },
        {
          id: 'room5',
          name: 'Mid-Tier Challenge',
          playerCount: 2,
          maxPlayers: 5,
          betAmount: 25,
          status: 'waiting',
          createdBy: 'MidTierRacer',
          isPrivate: false
        }
      ];

      setRooms(mockRooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...rooms];

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Bet amount filter
    switch (filter) {
      case 'low':
        filtered = filtered.filter(room => room.betAmount <= 10);
        break;
      case 'medium':
        filtered = filtered.filter(room => room.betAmount > 10 && room.betAmount <= 50);
        break;
      case 'high':
        filtered = filtered.filter(room => room.betAmount > 50);
        break;
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'players':
          return (b.maxPlayers - b.playerCount) - (a.maxPlayers - a.playerCount);
        case 'bet':
          return a.betAmount - b.betAmount;
        case 'status':
          const statusOrder = { 'waiting': 0, 'starting': 1, 'playing': 2, 'finished': 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredRooms(filtered);
  };

  const handleCreateRoom = async () => {
    setCreateError('');

    // Validation
    if (!createForm.name.trim()) {
      setCreateError('Room name is required');
      return;
    }

    if (createForm.name.length < 3) {
      setCreateError('Room name must be at least 3 characters');
      return;
    }

    if (createForm.betAmount > balance) {
      setCreateError('Insufficient balance for this bet amount');
      return;
    }

    if (createForm.isPrivate && !createForm.password) {
      setCreateError('Password is required for private rooms');
      return;
    }

    try {
      const room = await createRoom({
        name: createForm.name,
        maxPlayers: createForm.maxPlayers,
        betAmount: createForm.betAmount,
        isPrivate: createForm.isPrivate,
        password: createForm.password
      });

      // Reset form
      setCreateForm({
        name: '',
        maxPlayers: 4,
        betAmount: 10,
        isPrivate: false,
        password: ''
      });

      setActiveTab('joined');
      
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create room');
    }
  };

  const handleJoinRoom = async (room: Room) => {
    if (room.betAmount > balance) {
      alert('Insufficient balance to join this room');
      return;
    }

    if (room.playerCount >= room.maxPlayers) {
      alert('Room is full');
      return;
    }

    if (room.status !== 'waiting') {
      alert('Room is not accepting new players');
      return;
    }

    if (room.isPrivate) {
      setShowPasswordModal(room.id);
      return;
    }

    try {
      await joinRoom(room.id);
      setActiveTab('joined');
      onJoinRoom?.(room.id);
    } catch (error) {
      alert('Failed to join room: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleJoinWithPassword = async (roomId: string) => {
    if (!joinPassword) {
      alert('Please enter the room password');
      return;
    }

    try {
      await joinRoom(roomId);
      setShowPasswordModal(null);
      setJoinPassword('');
      setActiveTab('joined');
      onJoinRoom?.(roomId);
    } catch (error) {
      alert('Failed to join room: ' + (error instanceof Error ? error.message : 'Incorrect password'));
    }
  };

  const formatCurrency = (amount: number) => `R$ ${amount.toFixed(2)}`;

  const getBetCategoryColor = (amount: number) => {
    if (amount === 0) return '#4CAF50'; // Free - Green
    if (amount <= 10) return '#2196F3'; // Low - Blue
    if (amount <= 50) return '#FF9800'; // Medium - Orange
    return '#F44336'; // High - Red
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return '#4CAF50';
      case 'starting': return '#FF9800';
      case 'playing': return '#2196F3';
      case 'finished': return '#757575';
      default: return '#757575';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
      fontFamily: 'Arial, sans-serif',
      color: 'white',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        maxWidth: '1200px',
        margin: '0 auto 30px auto'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>🏁 Game Rooms</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8 }}>
            Join or create multiplayer racing rooms
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>Balance</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {formatCurrency(balance)}
            </div>
          </div>
          
          <button
            onClick={onBackToLobby}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            ← Back to Lobby
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            { key: 'browse', label: '🔍 Browse Rooms', count: filteredRooms.length },
            { key: 'create', label: '➕ Create Room' },
            { key: 'joined', label: '🎮 Current Room', disabled: !currentRoom }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setActiveTab(tab.key as any)}
              disabled={tab.disabled}
              style={{
                flex: 1,
                padding: '12px 20px',
                background: activeTab === tab.key 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : tab.disabled 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: tab.disabled ? 'rgba(255, 255, 255, 0.5)' : 'white',
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                fontSize: '16px',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal'
              }}
            >
              {tab.label} {tab.count !== undefined && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Browse Rooms Tab */}
        {activeTab === 'browse' && (
          <>
            {/* Filters */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    Search Rooms
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name or creator..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    Bet Range
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  >
                    <option value="all">All Ranges</option>
                    <option value="low">Low (≤ R$ 10)</option>
                    <option value="medium">Medium (R$ 11-50)</option>
                    <option value="high">High (> R$ 50)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  >
                    <option value="players">Available Slots</option>
                    <option value="bet">Bet Amount</option>
                    <option value="status">Status</option>
                    <option value="name">Name</option>
                  </select>
                </div>

                <button
                  onClick={loadRooms}
                  disabled={isLoading}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {isLoading ? '🔄' : '🔄 Refresh'}
                </button>
              </div>
            </div>

            {/* Rooms List */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
                <div>Loading rooms...</div>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '50px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏁</div>
                <div style={{ fontSize: '20px', marginBottom: '10px' }}>No rooms found</div>
                <div style={{ opacity: 0.7 }}>
                  Try adjusting your filters or create a new room
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {filteredRooms.map(room => (
                  <div
                    key={room.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '20px',
                      borderRadius: '16px',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => handleJoinRoom(room)}
                  >
                    {/* Room Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '15px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '5px'
                        }}>
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                            {room.name}
                          </h3>
                          {room.isPrivate && (
                            <span style={{
                              background: 'rgba(255, 152, 0, 0.2)',
                              color: '#FF9800',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              🔒 PRIVATE
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>
                          by {room.createdBy}
                        </div>
                      </div>

                      <div style={{
                        background: getStatusColor(room.status),
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {room.status}
                      </div>
                    </div>

                    {/* Room Stats */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '15px',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                          PLAYERS
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          {room.playerCount}/{room.maxPlayers}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                          BET AMOUNT
                        </div>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold',
                          color: getBetCategoryColor(room.betAmount)
                        }}>
                          {room.betAmount === 0 ? 'FREE' : formatCurrency(room.betAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Players Preview */}
                    {room.players && room.players.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <div style={{ 
                          fontSize: '12px', 
                          opacity: 0.7, 
                          marginBottom: '8px' 
                        }}>
                          PLAYERS IN ROOM
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '6px' 
                        }}>
                          {room.players.slice(0, 4).map(player => (
                            <span
                              key={player.id}
                              style={{
                                background: player.isReady 
                                  ? 'rgba(76, 175, 80, 0.2)'
                                  : 'rgba(255, 152, 0, 0.2)',
                                color: player.isReady ? '#4CAF50' : '#FF9800',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {player.isReady ? '✓' : '⏳'} {player.username}
                            </span>
                          ))}
                          {room.players.length > 4 && (
                            <span style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              opacity: 0.7
                            }}>
                              +{room.players.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Join Button */}
                    <button
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: room.playerCount >= room.maxPlayers 
                          ? 'rgba(244, 67, 54, 0.3)'
                          : room.betAmount > balance
                          ? 'rgba(255, 152, 0, 0.3)'
                          : 'linear-gradient(45deg, #4CAF50, #45a049)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: room.playerCount >= room.maxPlayers || room.betAmount > balance
                          ? 'not-allowed' 
                          : 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      {room.playerCount >= room.maxPlayers 
                        ? '🚫 Room Full'
                        : room.betAmount > balance
                        ? '💰 Insufficient Balance'
                        : room.isPrivate
                        ? '🔒 Join with Password'
                        : '🎮 Join Room'
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Room Tab */}
        {activeTab === 'create' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '30px',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <h3 style={{ margin: '0 0 25px 0', fontSize: '24px', textAlign: 'center' }}>
              ➕ Create New Room
            </h3>

            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Room Name */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '16px', 
                  fontWeight: 'bold' 
                }}>
                  Room Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter room name..."
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Max Players */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '16px', 
                  fontWeight: 'bold' 
                }}>
                  Max Players
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[2, 3, 4, 5, 6, 8].map(count => (
                    <button
                      key={count}
                      onClick={() => setCreateForm(prev => ({ ...prev, maxPlayers: count }))}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: createForm.maxPlayers === count 
                          ? 'rgba(76, 175, 80, 0.3)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid ' + (createForm.maxPlayers === count 
                          ? 'rgba(76, 175, 80, 0.5)' 
                          : 'rgba(255, 255, 255, 0.2)'),
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bet Amount */}
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '16px', 
                  fontWeight: 'bold' 
                }}>
                  Bet Amount (Your balance: {formatCurrency(balance)})
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  {[0, 5, 10, 25, 50, 100].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setCreateForm(prev => ({ ...prev, betAmount: amount }))}
                      disabled={amount > balance}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: createForm.betAmount === amount 
                          ? 'rgba(76, 175, 80, 0.3)' 
                          : amount > balance
                          ? 'rgba(244, 67, 54, 0.2)'
                          : 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid ' + (createForm.betAmount === amount 
                          ? 'rgba(76, 175, 80, 0.5)' 
                          : amount > balance
                          ? 'rgba(244, 67, 54, 0.3)'
                          : 'rgba(255, 255, 255, 0.2)'),
                        borderRadius: '8px',
                        color: amount > balance ? 'rgba(255, 255, 255, 0.5)' : 'white',
                        cursor: amount > balance ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {amount === 0 ? 'FREE' : `R$ ${amount}`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom amount..."
                  min={0}
                  max={balance}
                  value={createForm.betAmount}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    betAmount: Math.min(parseFloat(e.target.value) || 0, balance)
                  }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Privacy Settings */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={createForm.isPrivate}
                    onChange={(e) => setCreateForm(prev => ({ 
                      ...prev, 
                      isPrivate: e.target.checked,
                      password: e.target.checked ? prev.password : ''
                    }))}
                    style={{ marginRight: '10px' }}
                  />
                  <label htmlFor="isPrivate" style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}>
                    🔒 Private Room
                  </label>
                </div>

                {createForm.isPrivate && (
                  <input
                    type="password"
                    placeholder="Room password..."
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>

              {/* Error Message */}
              {createError && (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  color: '#F44336',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  ⚠️ {createError}
                </div>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreateRoom}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🎮 Create Room
              </button>
            </div>
          </div>
        )}

        {/* Current Room Tab */}
        {activeTab === 'joined' && currentRoom && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '30px',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h3 style={{ margin: 0, fontSize: '24px' }}>
                🎮 {currentRoom.name}
              </h3>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  style={{
                    background: 'rgba(244, 67, 54, 0.2)',
                    border: '1px solid rgba(244, 67, 54, 0.3)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Leave Room
                </button>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {/* Room Info */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '20px',
                borderRadius: '12px'
              }}>
                <h4 style={{ margin: '0 0 15px 0' }}>Room Details</h4>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div><strong>Max Players:</strong> {currentRoom.maxPlayers}</div>
                  <div><strong>Bet Amount:</strong> {currentRoom.betAmount === 0 ? 'Free' : formatCurrency(currentRoom.betAmount)}</div>
                  <div><strong>Status:</strong> 
                    <span style={{ 
                      color: getStatusColor(currentRoom.status),
                      marginLeft: '8px',
                      textTransform: 'uppercase',
                      fontWeight: 'bold'
                    }}>
                      {currentRoom.status}
                    </span>
                  </div>
                  <div><strong>Created By:</strong> {currentRoom.createdBy}</div>
                </div>
              </div>

              {/* Players List */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '20px',
                borderRadius: '12px'
              }}>
                <h4 style={{ margin: '0 0 15px 0' }}>
                  Players ({players.length}/{currentRoom.maxPlayers})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {players.map((player, index) => (
                    <div
                      key={player.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: player.isAlive ? '#4CAF50' : '#F44336'
                        }} />
                        <span style={{ fontWeight: 'bold' }}>
                          #{index + 1} {player.name}
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
                      <div style={{ 
                        fontSize: '12px', 
                        color: player.ping > 150 ? '#F44336' : player.ping > 80 ? '#FF9800' : '#4CAF50'
                      }}>
                        {player.ping}ms
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots */}
                  {Array.from({ length: currentRoom.maxPlayers - players.length }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '8px',
                        opacity: 0.5
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.3)'
                        }} />
                        <span style={{ fontStyle: 'italic' }}>
                          Waiting for player...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Game Start Area */}
            {currentRoom.status === 'waiting' && (
              <div style={{
                marginTop: '25px',
                padding: '20px',
                background: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                  🏁 Ready to race?
                </div>
                <div style={{ fontSize: '14px', marginBottom: '15px', opacity: 0.8 }}>
                  Waiting for all players to be ready
                </div>
                <button
                  style={{
                    padding: '12px 30px',
                    background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Ready
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
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
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>
              🔒 Enter Room Password
            </h3>
            <input
              type="password"
              placeholder="Room password..."
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoinWithPassword(showPasswordModal);
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                marginBottom: '20px',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowPasswordModal(null);
                  setJoinPassword('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#ccc',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleJoinWithPassword(showPasswordModal)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#4CAF50',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};