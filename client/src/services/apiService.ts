interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  withdrawAddress?: string;
}

interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'affiliate-level1' | 'affiliate-level2' | 'game-ticket' | 'game-reward';
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  description?: string;
  relatedUserId?: string;
  createdAt: string;
}

interface UserBalance {
  balance: number;
  transactions: WalletTransaction[];
}

interface LoginResponse {
  token: string;
  user: User;
  wallet: UserBalance;
}

interface ApiResponse<T> {
  success?: boolean;
  newBalance?: number;
  message?: string;
  error?: string;
  data?: T;
}

class ApiService {
  private baseURL: string;
  private tokenResolver: () => string | null = () => null;

  constructor() {
    // Em produção, usar URLs relativas; em desenvolvimento, usar localhost
    if (import.meta.env.VITE_API_URL) {
      this.baseURL = import.meta.env.VITE_API_URL;
    } else if (import.meta.env.PROD) {
      // Em produção, usar URL relativa (mesmo domínio via nginx)
      this.baseURL = '';
    } else {
      // Em desenvolvimento, usar localhost
      this.baseURL = 'http://localhost:2567';
    }
  }

  setTokenResolver(resolver: () => string | null) {
    this.tokenResolver = resolver;
  }

  private normalizeHeaders(input?: HeadersInit): Record<string, string> {
    if (!input) {
      return {};
    }

    if (Array.isArray(input)) {
      return input.reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
    }

    if (input instanceof Headers) {
      const headers: Record<string, string> = {};
      input.forEach((value, key) => {
        headers[key] = value;
      });
      return headers;
    }

    return { ...(input as Record<string, string>) };
  }

  private withAuth(init: RequestInit = {}, requireAuth = true): RequestInit {
    if (!requireAuth) {
      return init;
    }

    const token = this.tokenResolver?.() ?? null;
    if (!token) {
      return init;
    }

    const headers = {
      ...this.normalizeHeaders(init.headers),
      Authorization: `Bearer ${token}`
    };

    return {
      ...init,
      headers
    };
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/api/users/login`, this.withAuth({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    }, false));

    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao fazer login');
      }

      const payload = await response.text();
      console.error('Resposta inesperada na tentativa de login:', payload.slice(0, 200));
      throw new Error('Erro ao fazer login: resposta inválida do servidor');
    }

    if (!contentType.includes('application/json')) {
      const payload = await response.text();
      console.error('Payload inesperado recebido do login:', payload.slice(0, 200));
      throw new Error('Falha ao processar resposta do servidor de login');
    }

    return response.json();
  }

  async register(username: string, email: string, password: string, referralCode?: string): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/api/users/register`, this.withAuth({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password, referralCode }),
    }, false));

    if (!response.ok) {
      const error = await response.json();
      // Se houver detalhes de validação, mostrar a primeira mensagem
      if (error.details && error.details.length > 0) {
        throw new Error(error.details[0].msg || error.error || 'Erro ao fazer registro');
      }
      throw new Error(error.error || 'Erro ao fazer registro');
    }

    return response.json();
  }

  async getUserBalance(userId: string): Promise<UserBalance> {
    const response = await fetch(`${this.baseURL}/api/users/${userId}/balance`, this.withAuth({
      method: 'GET',
    }));

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar saldo');
    }

    return response.json();
  }

  async addBalance(userId: string, amount: number, description?: string): Promise<ApiResponse<number>> {
    const response = await fetch(`${this.baseURL}/api/users/${userId}/balance`, this.withAuth({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, description }),
    }));

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao adicionar saldo');
    }

    return response.json();
  }

  async chargeGameTicket(userId: string, amount: number, transactionKey: string): Promise<ApiResponse<number>> {
    const response = await fetch(`${this.baseURL}/api/users/charge-ticket`, this.withAuth({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, amount, transactionKey }),
    }));

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao cobrar ticket');
    }

    return response.json();
  }

  async rewardGameWinner(userId: string, amount: number, transactionKey: string): Promise<ApiResponse<number>> {
    const response = await fetch(`${this.baseURL}/api/users/reward-winner`, this.withAuth({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, amount, transactionKey }),
    }));

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao premiar vencedor');
    }

    return response.json();
  }

  async updateWithdrawAddress(userId: string, address: string): Promise<User> {
    const response = await fetch(`${this.baseURL}/api/users/${userId}/withdraw-address`, this.withAuth({
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address })
    }));

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar chave PIX');
    }

    const data: ApiResponse<User> & { user: User } = await response.json();
    return data.user;
  }

  async logout(): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/users/logout`, this.withAuth({
        method: 'POST'
      }));

      if (!response.ok) {
        // Swallow errors (session may already be invalid)
        await response.json().catch(() => undefined);
      }
    } catch (error) {
      console.warn('Falha ao deslogar usuário:', error);
    }
  }
}

export const apiService = new ApiService();
export type { User, WalletTransaction, UserBalance, LoginResponse, ApiResponse };
