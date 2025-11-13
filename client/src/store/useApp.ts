import { create } from 'zustand';

type Screen = 'login' | 'lobby' | 'waiting' | 'game' | 'results' | 'privacy';

interface AppState {
  currentScreen: Screen;
  isLoading: boolean;

  // Actions
  setScreen: (screen: Screen) => void;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'login',
  isLoading: false,

  setScreen: (screen) => set({ currentScreen: screen }),
  setLoading: (loading) => set({ isLoading: loading })
}));