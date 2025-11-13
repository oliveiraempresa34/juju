import { create } from "zustand";

interface ScoreState {
  currentScore: number;
  bestScore: number;

  updateCurrentScore: (distance: number) => void;
  updateBestScore: () => void;
  resetCurrentScore: () => void;
  loadBestScore: () => void;
  saveBestScore: () => void;
}

export const useScoreStore = create<ScoreState>((set, get) => ({
  currentScore: 0,
  bestScore: 0,

  updateCurrentScore: (distance: number) => {
    // Pontuação baseada na distância (arredondada)
    const score = Math.floor(distance);
    set({ currentScore: score });
  },

  updateBestScore: () => {
    const { currentScore, bestScore } = get();
    if (currentScore > bestScore) {
      set({ bestScore: currentScore });
      get().saveBestScore();
    }
  },

  resetCurrentScore: () => {
    set({ currentScore: 0 });
  },

  loadBestScore: () => {
    try {
      const saved = localStorage.getItem('drift-game-best-score');
      if (saved) {
        const bestScore = parseInt(saved, 10);
        if (!isNaN(bestScore)) {
          set({ bestScore });
        }
      }
    } catch (error) {
      console.warn('Failed to load best score:', error);
    }
  },

  saveBestScore: () => {
    try {
      const { bestScore } = get();
      localStorage.setItem('drift-game-best-score', bestScore.toString());
    } catch (error) {
      console.warn('Failed to save best score:', error);
    }
  },
}));