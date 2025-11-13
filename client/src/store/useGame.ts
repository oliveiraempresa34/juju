import { create } from 'zustand';
import type { ConnectOptions, MultiplayerSync } from '../game/MultiplayerSync';

export type GameMode = 'demo' | 'multiplayer' | 'practice';

interface GameState {
  gameMode: GameMode;
  isConnectedToServer: boolean;
  isInGame: boolean;
  isGameOver: boolean;
  currentScore: number;
  currentDistance: number;
  multiplayerOptions?: ConnectOptions;
  multiplayerInstance?: MultiplayerSync;

  // Actions
  setGameMode: (mode: GameMode) => void;
  setConnectedToServer: (connected: boolean) => void;
  setInGame: (inGame: boolean) => void;
  setGameOver: (gameOver: boolean) => void;
  updateScore: (score: number) => void;
  updateDistance: (distance: number) => void;
  configureMultiplayer: (options: ConnectOptions) => void;
  clearMultiplayerOptions: () => void;
  setMultiplayerInstance: (instance?: MultiplayerSync) => void;
  resetGame: () => void;
  startNewGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  gameMode: 'demo',
  isConnectedToServer: false,
  isInGame: false,
  isGameOver: false,
  currentScore: 0,
  currentDistance: 0,
  multiplayerOptions: undefined,
  multiplayerInstance: undefined,

  setGameMode: (mode) => set({ gameMode: mode }),
  setConnectedToServer: (connected) => set({ isConnectedToServer: connected }),
  setInGame: (inGame) => set({ isInGame: inGame }),
  setGameOver: (gameOver) => set({ isGameOver: gameOver }),
  updateScore: (score) => set({ currentScore: score }),
  updateDistance: (distance) => set({ currentDistance: distance }),
  configureMultiplayer: (options) => set({ multiplayerOptions: options }),
  clearMultiplayerOptions: () => set({ multiplayerOptions: undefined }),
  setMultiplayerInstance: (instance) => set({ multiplayerInstance: instance }),
  resetGame: () => {
    const instance = get().multiplayerInstance;
    if (instance) {
      instance.dispose();
    }
    set({
      currentScore: 0,
      currentDistance: 0,
      isInGame: false,
      isGameOver: false,
      isConnectedToServer: false,
      multiplayerOptions: undefined,
      multiplayerInstance: undefined
    });
  },
  startNewGame: () => set({
    currentScore: 0,
    currentDistance: 0,
    isInGame: true,
    isGameOver: false
  })
}));
