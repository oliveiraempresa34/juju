import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiService } from '../services/apiService';
import type { User, UserBalance } from '../services/apiService';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  withdrawAddress?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  wallet: UserBalance | null;

  // Actions
  login: (credentials: { username: string; password: string }) => Promise<void>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
    referralCode?: string;
  }) => Promise<void>;
  logout: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  chargeGameTicket: (amount: number, transactionKey: string) => Promise<void>;
  rewardGameWinner: (amount: number, transactionKey: string) => Promise<void>;
  updateWithdrawAddress: (address: string) => Promise<void>;
}

const authStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      wallet: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiService.login(credentials.username, credentials.password);

          set({
            user: response.user,
            token: response.token,
            wallet: response.wallet || { balance: 0, transactions: [] },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Falha ao realizar login',
            isLoading: false,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiService.register(
            userData.username,
            userData.email,
            userData.password,
            userData.referralCode
          );

          set({
            user: response.user,
            token: response.token,
            wallet: response.wallet || { balance: 0, transactions: [] },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Falha ao realizar cadastro',
            isLoading: false,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      logout: () => {
        void apiService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          wallet: null
        });
      },

      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      refreshUser: async () => {
        const current = get().user;
        if (!current) {
          return;
        }
        try {
          const wallet = await apiService.getUserBalance(current.id);
          set({ wallet });
        } catch (error) {
          console.error('Erro ao atualizar dados do usuário:', error);
          if (error instanceof Error && /Não autenticado|Sessão expirada/i.test(error.message)) {
            set({ token: null, isAuthenticated: false, user: null, wallet: null });
          }
        }
      },

      refreshWallet: async () => {
        const current = get().user;
        if (!current) {
          return;
        }

        let retries = 3;
        while (retries > 0) {
          try {
            const wallet = await apiService.getUserBalance(current.id);
            set({ wallet });
            return;
          } catch (error) {
            retries--;
            if (retries === 0) {
              console.error('Erro ao atualizar carteira após 3 tentativas:', error);
              if (error instanceof Error && /Não autenticado|Sessão expirada/i.test(error.message)) {
                set({ token: null, isAuthenticated: false, user: null, wallet: null });
                return;
              }
              // Em caso de erro, manter o saldo anterior se existir
              const currentWallet = get().wallet;
              if (!currentWallet) {
                set({ wallet: { balance: 0, transactions: [] } });
              }
            } else {
              // Aguardar 1 segundo antes de tentar novamente
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      },

      chargeGameTicket: async (amount: number, transactionKey: string) => {
        const current = get().user;
        if (!current) {
          throw new Error('Usuário não autenticado');
        }
        try {
          await apiService.chargeGameTicket(current.id, amount, transactionKey);
          await get().refreshWallet();
        } catch (error) {
          console.error('Erro ao cobrar ticket:', error);
          if (error instanceof Error && /Não autenticado|Sessão expirada/i.test(error.message)) {
            set({ token: null, isAuthenticated: false, user: null, wallet: null });
          }
          throw error;
        }
      },

      rewardGameWinner: async (amount: number, transactionKey: string) => {
        const current = get().user;
        if (!current) {
          throw new Error('Usuário não autenticado');
        }
        try {
          await apiService.rewardGameWinner(current.id, amount, transactionKey);
          await get().refreshWallet();
        } catch (error) {
          console.error('Erro ao premiar vencedor:', error);
          if (error instanceof Error && /Não autenticado|Sessão expirada/i.test(error.message)) {
            set({ token: null, isAuthenticated: false, user: null, wallet: null });
          }
          throw error;
        }
      },

      updateWithdrawAddress: async (address: string) => {
        const current = get().user;
        if (!current) {
          throw new Error('Usuário não autenticado');
        }
        try {
          const updatedUser = await apiService.updateWithdrawAddress(current.id, address);
          set({
            user: {
              ...current,
              withdrawAddress: updatedUser.withdrawAddress,
            },
            error: null,
          });
        } catch (error) {
          console.error('Erro ao atualizar chave PIX:', error);
          set({ error: error instanceof Error ? error.message : 'Erro ao atualizar chave PIX' });
          if (error instanceof Error && /Não autenticado|Sessão expirada/i.test(error.message)) {
            set({ token: null, isAuthenticated: false, user: null, wallet: null });
          }
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        wallet: state.wallet
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.user && !state.wallet) {
            state.wallet = { balance: 0, transactions: [] };
          }
          if (!state.token || !state.user) {
            state.isAuthenticated = false;
            state.token = null;
          }
        }
      }
    }
  )
);

apiService.setTokenResolver(() => authStore.getState().token);

export const useAuthStore = authStore;
