import React, { useEffect, useState, useCallback } from 'react';
import { BabylonScene } from './components/Game/BabylonScene';
import { GameUI } from './components/Game/GameUI';
import { Login } from './components/UI/Login';
import { Lobby } from './components/UI/Lobby';
import { RoomSelection } from './components/UI/RoomSelection';
import { Results } from './components/UI/Results';
import { useGameStore, useAuthStore, useWalletStore, useMultiplayerStore } from './store/gameStore';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { LoadingScreen } from './components/Common/LoadingScreen';

// Game state management
const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  // Store hooks
  const { 
    currentScreen, 
    setScreen, 
    isPlaying, 
    isPaused, 
    isGameOver,
    distance,
    score,
    gameStartTime,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    updateGameStats,
    resetGameState,
    isMultiplayer
  } = useGameStore();

  const { 
    isAuthenticated, 
    user, 
    refreshToken, 
    isLoading: authLoading 
  } = useAuthStore();

  const { 
    balance, 
    loadWallet 
  } = useWalletStore();

  const {
    currentRoom,
    players,
    leaveRoom
  } = useMultiplayerStore();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for existing authentication
        if (isAuthenticated) {
          await Promise.all([
            refreshToken(),
            loadWallet()
          ]);
        }
        
        // Set initial screen based on auth state
        if (isAuthenticated) {
          setScreen('lobby');
        } else {
          setScreen('menu');
        }
        
      } catch (error) {
        console.error('App initialization failed:', error);
        setScreen('menu');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [isAuthenticated, refreshToken, loadWallet, setScreen]);

  // Scene ready handler
  const handleSceneReady = useCallback((scene: any) => {
    console.log('🎮 Babylon.js scene ready');
    setSceneReady(true);
    setGameInitialized(true);
  }, []);

  // Game event handlers
  const handleGameOver = useCallback((finalDistance: number, finalScore: number) => {
    console.log(`🏁 Game over: ${finalDistance}m, ${finalScore} points`);
    endGame(finalDistance, finalScore);
  }, [endGame]);

  const handleStartSinglePlayer = useCallback(() => {
    console.log('🎮 Starting single player game');
    startGame(false);
    setScreen('game');
  }, [startGame, setScreen]);

  const handleStartMultiplayer = useCallback((roomId: string) => {
    console.log(`🎮 Starting multiplayer game in room ${roomId}`);
    startGame(true, roomId);
    setScreen('game');
  }, [startGame, setScreen]);

  const handleCreateRoom = useCallback(() => {
    setScreen('room');
  }, [setScreen]);

  const handleJoinRoom = useCallback((roomId: string) => {
    // Room joining is handled by the room selection component
    // This callback is for when successfully joined
    console.log(`✅ Joined room ${roomId}`);
  }, []);

  const handlePauseGame = useCallback(() => {
    if (isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
  }, [isPaused, pauseGame, resumeGame]);

  const handleQuitGame = useCallback(() => {
    if (isMultiplayer && currentRoom) {
      leaveRoom();
    }
    resetGameState();
    setScreen('lobby');
  }, [isMultiplayer, currentRoom, leaveRoom, resetGameState, setScreen]);

  const handlePlayAgain = useCallback(() => {
    resetGameState();
    
    if (isMultiplayer && currentRoom) {
      // Stay in multiplayer room for another round
      setScreen('room');
    } else {
      // Start new single player game
      handleStartSinglePlayer();
    }
  }, [isMultiplayer, currentRoom, resetGameState, setScreen, handleStartSinglePlayer]);

  const handleBackToLobby = useCallback(() => {
    if (isMultiplayer && currentRoom) {
      leaveRoom();
    }
    resetGameState();
    setScreen('lobby');
  }, [isMultiplayer, currentRoom, leaveRoom, resetGameState, setScreen]);

  const handleShareResults = useCallback((results: any) => {
    const shareText = `🏎️ Just scored ${results.score.toLocaleString()} points and traveled ${results.distance}m in Drift cash! ${results.isNewBest ? '🎯 New personal best!' : ''} #DriftToRight`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Drift cash - Game Results',
        text: shareText,
        url: window.location.origin
      }).catch(console.error);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Results copied to clipboard!');
      }).catch(() => {
        alert('Unable to share results');
      });
    }
  }, []);

  // Loading state
  if (isLoading || authLoading) {
    return <LoadingScreen message="Loading Drift cash..." />;
  }

  // Render current screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'menu':
        return (
          <Login 
            onSuccess={() => setScreen('lobby')} 
          />
        );

      case 'lobby':
        if (!isAuthenticated) {
          setScreen('menu');
          return null;
        }
        return (
          <Lobby
            onStartSinglePlayer={handleStartSinglePlayer}
            onJoinMultiplayer={handleStartMultiplayer}
            onCreateRoom={handleCreateRoom}
          />
        );

      case 'room':
        if (!isAuthenticated) {
          setScreen('menu');
          return null;
        }
        return (
          <RoomSelection
            onJoinRoom={handleJoinRoom}
            onBackToLobby={handleBackToLobby}
          />
        );

      case 'game':
        if (!isAuthenticated) {
          setScreen('menu');
          return null;
        }
        return (
          <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            {/* Babylon.js Scene */}
            <BabylonScene
              onReady={handleSceneReady}
              onGameOver={handleGameOver}
              isMultiplayer={isMultiplayer}
              roomId={currentRoom?.id}
            />
            
            {/* Game UI Overlay */}
            {sceneReady && (
              <GameUI
                gameStats={{
                  distance,
                  score,
                  gameTime: isPlaying ? (Date.now() - gameStartTime) / 1000 : 0
                }}
                multiplayer={isMultiplayer ? {
                  players: players.map((player, index) => ({
                    id: player.id,
                    name: player.name,
                    distance: player.distance,
                    ping: player.ping,
                    position: index + 1
                  })),
                  roomId: currentRoom?.id || ''
                } : undefined}
                wallet={{
                  balance,
                  betAmount: currentRoom?.betAmount
                }}
                onPause={handlePauseGame}
                onQuit={handleQuitGame}
                isPaused={isPaused}
                isGameOver={isGameOver}
              />
            )}
          </div>
        );

      case 'results':
        return (
          <Results
            onPlayAgain={handlePlayAgain}
            onBackToLobby={handleBackToLobby}
            onShare={handleShareResults}
          />
        );

      default:
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontFamily: 'Arial, sans-serif'
          }}>
            <div style={{ textAlign: 'center' }}>
              <h1>🏎️ Drift cash</h1>
              <p>Unknown screen state</p>
              <button
                onClick={() => setScreen('menu')}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Return to Menu
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className="app" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {renderCurrentScreen()}
        
        {/* Global styles */}
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            overflow: hidden;
            background: #000;
          }
          
          #root {
            width: 100vw;
            height: 100vh;
          }
          
          .app {
            position: relative;
            width: 100%;
            height: 100%;
          }
          
          /* Smooth transitions for UI elements */
          .smooth-transition {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          /* Custom scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }
          
          /* Disable text selection for game UI */
          .game-ui, .game-ui * {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
          }
          
          /* Mobile optimizations */
          @media (max-width: 768px) {
            body {
              -webkit-touch-callout: none;
              -webkit-user-select: none;
              -webkit-tap-highlight-color: transparent;
            }
          }
          
          /* High contrast mode support */
          @media (prefers-contrast: high) {
            .app {
              filter: contrast(1.2);
            }
          }
          
          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
          
          /* Print styles */
          @media print {
            .app {
              display: none;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

export default App;