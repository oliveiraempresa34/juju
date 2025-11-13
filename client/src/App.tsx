import React, { useEffect } from 'react';
import { ErrorBoundary } from "./ErrorBoundary";
import { Login } from "./pages/Login";
import { Lobby } from "./pages/Lobby";
import GamePage from "./pages/Game";
import { LoadingScreen } from "./components/LoadingScreen";
import { WaitingLobby } from "./components/WaitingLobby";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { useAppStore } from "./store/useApp";
import { useAuthStore } from "./store/useAuth";
import { useGameStore } from "./store/useGame";
import { soundEffects } from "./utils/soundEffects";

const App = () => {
  const { currentScreen, setScreen } = useAppStore();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { gameMode, resetGame } = useGameStore();

  // Add global click sounds to all buttons
  useEffect(() => {
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        soundEffects.click();
      }
    };

    document.addEventListener('click', handleButtonClick, true);
    return () => document.removeEventListener('click', handleButtonClick, true);
  }, []);

  // Auto-navigate based on auth state
  useEffect(() => {
    if (isAuthenticated && currentScreen === 'login') {
      setScreen('lobby');
    } else if (!isAuthenticated && currentScreen !== 'login') {
      setScreen('login');
    }
  }, [isAuthenticated, currentScreen, setScreen]);

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  const handleLeaveWaiting = () => {
    resetGame();
    setScreen('lobby');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <Login />;
      case 'lobby':
        return <Lobby />;
      case 'waiting':
        return <WaitingLobby onLeave={handleLeaveWaiting} />;
      case 'game':
        return <GamePage />;
      case 'privacy':
        return <PrivacyPolicy />;
      default:
        return <Login />;
    }
  };

  return (
    <ErrorBoundary>
      {renderScreen()}
    </ErrorBoundary>
  );
};

export default App;