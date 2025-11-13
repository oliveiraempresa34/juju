import { Router, Request, Response } from 'express';
import { Database } from '../database/Database';
import { body, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authenticate, ensureAdminSelf, ensureSelfOrAdmin, issueAuthToken } from '../middleware/authMiddleware';

const normalizeHost = (value: string) => value.trim().toLowerCase();

const createHostSet = (raw: string | undefined, fallback: string[]): Set<string> => {
  const entries = raw
    ? raw
        .split(',')
        .map(normalizeHost)
        .filter(Boolean)
    : fallback.map(normalizeHost);
  return new Set(entries);
};

const ADMIN_PANEL_HOSTS = createHostSet(process.env.ADMIN_PANEL_HOSTS, ['admin.driftcash.com']);
const CLIENT_APP_HOSTS = createHostSet(process.env.CLIENT_APP_HOSTS, [
  'driftcash.com',
  'www.driftcash.com'
]);
const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1']);

const extractRequestHost = (req: Request): string | null => {
  const origin = req.get('origin');
  if (origin) {
    try {
      return new URL(origin).hostname.toLowerCase();
    } catch (error) {
      console.warn('[users/login] failed to parse origin URL', { origin, error });
    }
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      return new URL(referer).hostname.toLowerCase();
    } catch (error) {
      console.warn('[users/login] failed to parse referer URL', { referer, error });
    }
  }

  if (req.hostname) {
    return req.hostname.toLowerCase();
  }

  const hostHeader = req.get('host');
  if (hostHeader) {
    return hostHeader.split(':')[0]?.toLowerCase() ?? null;
  }

  return null;
};

const router = Router();

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'authToken';
const DEFAULT_COOKIE_AGE = 4 * 60 * 60;
const parsedCookieAge = Number(process.env.JWT_COOKIE_MAX_AGE);
const AUTH_COOKIE_MAX_AGE_SECONDS = Number.isFinite(parsedCookieAge) && parsedCookieAge > 0
  ? parsedCookieAge
  : DEFAULT_COOKIE_AGE;
const SHOULD_SET_AUTH_COOKIE = process.env.DISABLE_AUTH_COOKIE !== 'true';

interface UserController {
  database: Database;
}

class UserControllerImpl implements UserController {
  constructor(public database: Database) {}

  async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const details = errors.array();
        const message = details[0]?.msg || 'Dados inválidos';
        console.warn('[users/register] validation failed', details);
        return res.status(400).json({ error: message, details });
      }

      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username e password são obrigatórios' });
      }

      const user = await this.database.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Check if user is banned
      const isBanned = await this.database.isUserBanned(user.id);
      if (isBanned) {
        return res.status(403).json({ error: 'Usuário banido' });
      }

      // Verify password using bcrypt
      const isPasswordValid = await this.database.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const requestHost = extractRequestHost(req);
      const isAdminHost = requestHost ? ADMIN_PANEL_HOSTS.has(requestHost) : false;
      const isClientHost = requestHost ? CLIENT_APP_HOSTS.has(requestHost) : false;
      const isLocalHost = requestHost ? LOCAL_DEV_HOSTS.has(requestHost) : false;

      if (user.role === 'admin') {
        const allowAdminLogin = isAdminHost || isLocalHost;
        if (!allowAdminLogin) {
          const reason = isClientHost
            ? 'aqui não pico pico'
            : 'Credenciais administrativas só podem ser usadas no painel admin.';
          return res.status(403).json({ error: reason });
        }
      } else if (isAdminHost && !isLocalHost) {
        return res.status(403).json({ error: 'Painel administrativo restrito a contas com permissão.' });
      }

      if (user.role !== 'admin' && isClientHost === false && isAdminHost === false && !isLocalHost) {
        console.warn('[users/login] login from unrecognized host', { userId: user.id, requestHost });
      }

      const balance = await this.database.getUserBalance(user.id);
      const transactions = await this.database.getUserTransactions(user.id, 10);
      const token = issueAuthToken({ userId: user.id, role: user.role });
      const cookieMaxAge = Math.max(60, AUTH_COOKIE_MAX_AGE_SECONDS) * 1000;

      if (SHOULD_SET_AUTH_COOKIE) {
        res.cookie(AUTH_COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // strict in production for better CSRF protection
          secure: process.env.NODE_ENV === 'production',
          maxAge: cookieMaxAge
        });
      }

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          withdrawAddress: user.withdrawAddress
        },
        wallet: {
          balance,
          transactions
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      if (SHOULD_SET_AUTH_COOKIE) {
        res.clearCookie(AUTH_COOKIE_NAME, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      }
      const detail = error instanceof Error ? error.message : 'Erro desconhecido';
      res.status(500).json({ error: 'Erro interno do servidor', detail });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      if (SHOULD_SET_AUTH_COOKIE) {
        res.clearCookie(AUTH_COOKIE_NAME, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Erro ao finalizar sessão' });
    }
  }

  async getUserBalance(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await this.database.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const balance = await this.database.getUserBalance(userId);
      const transactions = await this.database.getUserTransactions(userId, 20);

      res.json({
        balance,
        transactions
      });
    } catch (error) {
      console.error('Get balance error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async addBalance(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { amount, description } = req.body;

      if (!amount || typeof amount !== 'number') {
        return res.status(400).json({ error: 'Valor é obrigatório e deve ser um número' });
      }

      const user = await this.database.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const newBalance = await this.database.updateUserBalance(
        userId,
        amount,
        description || (amount > 0 ? 'Depósito' : 'Saque')
      );

      res.json({
        success: true,
        newBalance,
        message: `${amount > 0 ? 'Depósito' : 'Saque'} realizado com sucesso`
      });
    } catch (error) {
      console.error('Add balance error:', error);
      if (error instanceof Error && error.message === 'Saldo insuficiente') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async chargeGameTicket(req: Request, res: Response) {
    try {
      const { userId, amount, transactionKey } = req.body;

      if (!userId || !amount || !transactionKey) {
        return res.status(400).json({ error: 'UserId, amount e transactionKey são obrigatórios' });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Amount deve ser um número positivo' });
      }

      const user = await this.database.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const existing = await this.database.getTransactionById(transactionKey);
      if (existing) {
        if (existing.userId !== userId) {
          return res.status(409).json({ error: 'TransactionKey já utilizado por outro usuário' });
        }

        const balance = await this.database.getUserBalance(userId);
        return res.json({ success: true, message: 'Transação já processada', newBalance: balance });
      }

      const newBalance = await this.database.updateUserBalance(
        userId,
        -amount,
        'Entrada em partida multiplayer',
        {
          transactionId: transactionKey,
          transactionType: 'game-ticket'
        }
      );

      res.json({
        success: true,
        newBalance,
        message: 'Ticket cobrado com sucesso'
      });
    } catch (error) {
      console.error('Charge ticket error:', error);
      if (error instanceof Error && error.message === 'Saldo insuficiente') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async rewardGameWinner(req: Request, res: Response) {
    try {
      const { userId, amount, transactionKey } = req.body;

      if (!userId || !amount || !transactionKey) {
        return res.status(400).json({ error: 'UserId, amount e transactionKey são obrigatórios' });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Amount deve ser um número positivo' });
      }

      const user = await this.database.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const existing = await this.database.getTransactionById(transactionKey);
      if (existing) {
        if (existing.userId !== userId) {
          return res.status(409).json({ error: 'TransactionKey já utilizado por outro usuário' });
        }

        const balance = await this.database.getUserBalance(userId);
        return res.json({ success: true, message: 'Prêmio já creditado', newBalance: balance });
      }

      const newBalance = await this.database.updateUserBalance(
        userId,
        amount,
        'Prêmio de partida multiplayer',
        {
          transactionId: transactionKey,
          transactionType: 'game-reward'
        }
      );

      res.json({
        success: true,
        newBalance,
        message: 'Prêmio creditado com sucesso'
      });
    } catch (error) {
      console.error('Reward winner error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateWithdrawAddress(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { address } = req.body as { address?: string };

      const user = await this.database.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const sanitized = typeof address === 'string' ? address.trim() : '';
      if (sanitized.length > 140) {
        return res.status(400).json({ error: 'Chave PIX muito longa' });
      }

      await this.database.updateUserWithdrawAddress(userId, sanitized.length ? sanitized : null);
      const updatedUser = await this.database.getUserById(userId);

      res.json({
        success: true,
        user: {
          id: updatedUser!.id,
          username: updatedUser!.username,
          email: updatedUser!.email,
          role: updatedUser!.role,
          withdrawAddress: updatedUser!.withdrawAddress
        }
      });
    } catch (error) {
      console.error('Update withdraw address error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
      }

      const { username, email, password, referralCode } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email e password são obrigatórios' });
      }

      // Password length validation (minimum 8 characters)
      if (password.length < 8) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
      }

      // Verificar se usuário já existe
      const existingUserByUsername = await this.database.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(409).json({ error: 'Nome de usuário já existe' });
      }

      const existingUserByEmail = await this.database.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(409).json({ error: 'Email já está cadastrado' });
      }

      // Criar novo usuário
      const userId = `user_${username.toLowerCase()}_${Date.now()}`;

      // Generate referral code for this new user
      const newUserReferralCode = await this.database.generateReferralCode(username);

      // Check if this user was referred by someone (using referralCode from request)
      let referredBy: string | undefined;
      if (referralCode) {
        const referrer = await this.database.getUserByReferralCode(referralCode);
        if (referrer) {
          referredBy = referrer.id;
        }
      }

      // Hash the password
      const hashedPassword = await this.database.hashPassword(password);

      const userData = {
        id: userId,
        username,
        email,
        password: hashedPassword,
        role: 'user' as const,
        withdrawAddress: undefined,
        referralCode: newUserReferralCode,
        referredBy
      };

      await this.database.createUser(userData);

      // Criar saldo inicial
      await this.database.updateUserBalance(userId, 10, 'Bônus de boas-vindas');

      // Process affiliate commissions if user was referred
      if (referredBy) {
        try {
          // Level 1 commission (5% of welcome bonus)
          await this.database.processAffiliateCommission(referredBy, 10, 1);

          // Check for level 2 commission
          const referrer = await this.database.getUserById(referredBy);
          if (referrer?.referredBy) {
            await this.database.processAffiliateCommission(referrer.referredBy, 10, 2);
          }
        } catch (commissionError) {
          console.error('Error processing affiliate commissions:', commissionError);
          // Don't fail registration if commission fails
        }
      }

      const balance = await this.database.getUserBalance(userId);
      const transactions = await this.database.getUserTransactions(userId, 10);

      const token = issueAuthToken({ userId: userData.id, role: userData.role });
      const cookieMaxAge = Math.max(60, AUTH_COOKIE_MAX_AGE_SECONDS) * 1000;

      if (SHOULD_SET_AUTH_COOKIE) {
        res.cookie(AUTH_COOKIE_NAME, token, {
          httpOnly: true,
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // strict in production for better CSRF protection
          secure: process.env.NODE_ENV === 'production',
          maxAge: cookieMaxAge
        });
      }

      res.json({
        token,
        user: {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
          withdrawAddress: userData.withdrawAddress
        },
        wallet: {
          balance,
          transactions
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      if (SHOULD_SET_AUTH_COOKIE) {
        res.clearCookie(AUTH_COOKIE_NAME, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getAffiliateStats(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await this.database.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const stats = await this.database.getAffiliateStats(userId);
      const referralTree = await this.database.getReferralTree(userId);

      // Use only the first URL from FRONTEND_URL for referral links
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();

      res.json({
        stats,
        referralTree,
        referralCode: user.referralCode,
        referralUrl: `${frontendUrl}?invite=${user.referralCode}` // Use environment variable instead of hardcoded URL
      });
    } catch (error) {
      console.error('Get affiliate stats error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await this.database.getUserById(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      }

      const users = await this.database.getAllUsersForAdmin();
      const usersWithStats = await Promise.all(
        users.map(async (u) => {
          const balance = await this.database.getUserBalance(u.id);
          const affiliateStats = await this.database.getAffiliateStats(u.id);
          return {
            ...u,
            balance,
            affiliateStats
          };
        })
      );

      res.json({
        users: usersWithStats,
        totalUsers: users.length,
        adminUser: user.username
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async updateUserRole(req: Request, res: Response) {
    try {
      const { adminId, targetUserId } = req.params;
      const { role } = req.body;

      const admin = await this.database.getUserById(adminId);
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      }

      const targetUser = await this.database.getUserById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role inválido' });
      }

      await this.database.updateUserRole(targetUserId, role as 'user' | 'admin');
      const updatedUser = await this.database.getUserById(targetUserId);

      res.json({
        success: true,
        user: {
          id: updatedUser!.id,
          username: updatedUser!.username,
          email: updatedUser!.email,
          role: updatedUser!.role,
          createdAt: updatedUser!.createdAt,
          updatedAt: updatedUser!.updatedAt
        },
        message: `Role do usuário ${targetUser.username} atualizado para ${role}`
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async createPayment(req: Request, res: Response) {
    try {
      const { userId, type, amount, pixCode } = req.body;

      if (!userId || !type || !amount) {
        return res.status(400).json({ error: 'UserId, type e amount são obrigatórios' });
      }

      const user = await this.database.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const paymentId = await this.database.createPayment(userId, type, amount, pixCode);

      res.json({
        success: true,
        paymentId,
        message: 'Pagamento criado com sucesso'
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async approvePayment(req: Request, res: Response) {
    try {
      const { adminId } = req.params;
      const { paymentId, transactionId } = req.body;

      const admin = await this.database.getUserById(adminId);
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      }

      await this.database.approvePayment(paymentId, transactionId);

      res.json({
        success: true,
        message: 'Pagamento aprovado com sucesso'
      });
    } catch (error) {
      console.error('Approve payment error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getPendingPayments(req: Request, res: Response) {
    try {
      const { adminId } = req.params;
      const { type } = req.query;

      const admin = await this.database.getUserById(adminId);
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      }

      const payments = await this.database.getPendingPayments(type as 'deposit' | 'withdrawal');

      res.json({
        payments,
        total: payments.length
      });
    } catch (error) {
      console.error('Get pending payments error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async banUser(req: Request, res: Response) {
    try {
      const { adminId, targetUserId } = req.params;
      const { reason, expiresAt } = req.body;

      const admin = await this.database.getUserById(adminId);
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      }

      const targetUser = await this.database.getUserById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      await this.database.banUser(targetUserId, adminId, reason, expiresAt);

      res.json({
        success: true,
        message: `Usuário ${targetUser.username} foi banido`
      });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async unbanUser(req: Request, res: Response) {
    try {
      const { adminId, targetUserId } = req.params;

      const admin = await this.database.getUserById(adminId);
      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      }

      const targetUser = await this.database.getUserById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      await this.database.unbanUser(targetUserId);

      res.json({
        success: true,
        message: `Usuário ${targetUser.username} foi desbanido`
      });
    } catch (error) {
      console.error('Unban user error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async verifyPayment(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;

      const result = await this.database.verifyPayment(transactionId);

      res.json(result);
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async uploadAvatar(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { avatar } = req.body;

      const user = await this.database.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Validate avatar (base64 PNG/JPEG/WebP, max 2.5MB)
      if (!avatar || typeof avatar !== 'string') {
        return res.status(400).json({ error: 'Avatar é obrigatório' });
      }

      if (!avatar.startsWith('data:image/png;base64,') &&
          !avatar.startsWith('data:image/jpeg;base64,') &&
          !avatar.startsWith('data:image/jpg;base64,') &&
          !avatar.startsWith('data:image/webp;base64,')) {
        return res.status(400).json({ error: 'Avatar deve ser uma imagem PNG, JPEG ou WebP em base64' });
      }

      // Check size (base64 is ~1.37x larger than original)
      // Reduced limit from 2.5MB to 1MB for better security
      const base64Size = avatar.length * 0.75;
      if (base64Size > 1 * 1024 * 1024) {
        return res.status(400).json({ error: 'Avatar muito grande. Máximo 1MB' });
      }

      // Warning: Storing large images in database can cause performance issues
      // Consider using a file storage service (S3, Cloudinary, etc.) for production

      await this.database.updateUserAvatar(userId, avatar);

      res.json({
        success: true,
        message: 'Avatar atualizado com sucesso'
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getAvatar(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await this.database.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const avatar = await this.database.getUserAvatar(userId);

      res.json({
        avatar: avatar || null
      });
    } catch (error) {
      console.error('Get avatar error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

export function createUserRoutes(database: Database): Router {
  const controller = new UserControllerImpl(database);

  // Rate limiters - Reduced attempts for better security
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased for testing - reduce to 5 in production
    message: { error: 'Muitas tentativas de login/registro. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute (relaxed for multiplayer)
    message: { error: 'Muitas requisições. Tente novamente em um minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });

  // Wallet/Transaction limiter - stricter for financial operations
  const walletLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 requests per 5 minutes
    message: { error: 'Muitas operações financeiras. Aguarde alguns minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });

  // Affiliate limiter - prevent enumeration attacks
  const affiliateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 requests per 5 minutes
    message: { error: 'Muitas requisições de afiliado. Aguarde alguns minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });

  // Validation middleware
  const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username é obrigatório').isLength({ min: 3, max: 20 }),
    body('password').notEmpty().withMessage('Password é obrigatório')
  ];

  const registerValidation = [
    body('username')
      .trim()
      .notEmpty()
      .isLength({ min: 3, max: 20 })
      .matches(/^[\p{L}\p{N}_\.\-]+$/u)
      .withMessage('Username deve conter apenas letras, números, ponto, hífen ou underline'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8, max: 100 }).withMessage('Senha deve ter entre 8 e 100 caracteres'),
    body('referralCode').optional().trim().isLength({ max: 20 })
  ];

  const balanceValidation = [
    body('amount').isNumeric().withMessage('Valor deve ser numérico'),
    body('description').optional().trim().isLength({ max: 200 })
  ];

  // Auth routes
  router.post('/login', authLimiter, loginValidation, (req: Request, res: Response) => controller.login(req, res));
  router.post('/register', authLimiter, registerValidation, (req: Request, res: Response) => controller.register(req, res));
  router.post('/logout', authenticate(), (req: Request, res: Response) => controller.logout(req, res));

  // User routes
  router.get(
    '/:userId/balance',
    authenticate(),
    apiLimiter,
    param('userId').trim().notEmpty(),
    (req: Request, res: Response) => {
      const { userId } = req.params;
      if (!ensureSelfOrAdmin(req, res, userId)) {
        return;
      }
      controller.getUserBalance(req, res);
    }
  );

  router.post(
    '/:userId/balance',
    authenticate(),
    apiLimiter,
    balanceValidation,
    (req: Request, res: Response) => {
      const { userId } = req.params;
      if (!ensureSelfOrAdmin(req, res, userId)) {
        return;
      }
      controller.addBalance(req, res);
    }
  );

  router.put(
    '/:userId/withdraw-address',
    authenticate(),
    apiLimiter,
    body('address').optional().trim().isLength({ max: 140 }),
    (req: Request, res: Response) => {
      const { userId } = req.params;
      if (!ensureSelfOrAdmin(req, res, userId)) {
        return;
      }
      controller.updateWithdrawAddress(req, res);
    }
  );

  // Game routes
  router.post(
    '/charge-ticket',
    authenticate(),
    walletLimiter,
    (req: Request, res: Response) => {
      const userId = typeof req.body?.userId === 'string' ? req.body.userId : String(req.body?.userId || '');
      if (!userId) {
        return controller.chargeGameTicket(req, res);
      }
      if (!ensureSelfOrAdmin(req, res, userId)) {
        return;
      }
      controller.chargeGameTicket(req, res);
    }
  );

  router.post(
    '/reward-winner',
    authenticate(),
    walletLimiter,
    (req: Request, res: Response) => {
      const userId = typeof req.body?.userId === 'string' ? req.body.userId : String(req.body?.userId || '');
      if (!userId) {
        return controller.rewardGameWinner(req, res);
      }
      if (!ensureSelfOrAdmin(req, res, userId)) {
        return;
      }
      controller.rewardGameWinner(req, res);
    }
  );

  // Affiliate routes
  router.get(
    '/:userId/affiliate',
    authenticate(),
    affiliateLimiter,
    (req: Request, res: Response) => {
      const { userId } = req.params;
      if (!ensureSelfOrAdmin(req, res, userId)) {
        return;
      }
      controller.getAffiliateStats(req, res);
    }
  );

  // Admin routes
  router.get(
    '/:userId/admin/users',
    authenticate('admin'),
    apiLimiter,
    (req: Request, res: Response) => {
      const { userId } = req.params;
      if (!ensureAdminSelf(req, res, userId)) {
        return;
      }
      controller.getAllUsers(req, res);
    }
  );

  router.put(
    '/:adminId/admin/users/:targetUserId/role',
    authenticate('admin'),
    apiLimiter,
    (req: Request, res: Response) => {
      const { adminId } = req.params;
      if (!ensureAdminSelf(req, res, adminId)) {
        return;
      }
      controller.updateUserRole(req, res);
    }
  );

  // Payment routes
  router.post(
    '/payments',
    authenticate(),
    apiLimiter,
    (req: Request, res: Response) => {
      const userId = typeof req.body?.userId === 'string' ? req.body.userId : String(req.body?.userId || '');
      if (!userId) {
        return controller.createPayment(req, res);
      }
      if (!ensureSelfOrAdmin(req, res, userId)) {
        return;
      }
      controller.createPayment(req, res);
    }
  );

  router.post(
    '/:adminId/admin/payments/approve',
    authenticate('admin'),
    apiLimiter,
    (req: Request, res: Response) => {
      const { adminId } = req.params;
      if (!ensureAdminSelf(req, res, adminId)) {
        return;
      }
      controller.approvePayment(req, res);
    }
  );

  router.get(
    '/:adminId/admin/payments/pending',
    authenticate('admin'),
    apiLimiter,
    (req: Request, res: Response) => {
      const { adminId } = req.params;
      if (!ensureAdminSelf(req, res, adminId)) {
        return;
      }
      controller.getPendingPayments(req, res);
    }
  );

  router.get(
    '/payments/verify/:transactionId',
    authenticate(),
    apiLimiter,
    (req: Request, res: Response) => {
      controller.verifyPayment(req, res);
    }
  );

  // Ban routes
  router.post(
    '/:adminId/admin/users/:targetUserId/ban',
    authenticate('admin'),
    apiLimiter,
    (req: Request, res: Response) => {
      const { adminId } = req.params;
      if (!ensureAdminSelf(req, res, adminId)) {
        return;
      }
      controller.banUser(req, res);
    }
  );

  router.delete(
    '/:adminId/admin/users/:targetUserId/ban',
    authenticate('admin'),
    apiLimiter,
    (req: Request, res: Response) => {
      const { adminId } = req.params;
      if (!ensureAdminSelf(req, res, adminId)) {
        return;
      }
      controller.unbanUser(req, res);
    }
  );

  // Avatar routes
  router.put(
    '/:userId/avatar',
    authenticate(),
    apiLimiter,
    (req: Request, res: Response) => {
      const { userId } = req.params;
      if (!ensureSelfOrAdmin(req, res, userId)) {
        return;
      }
      controller.uploadAvatar(req, res);
    }
  );

  router.get(
    '/:userId/avatar',
    authenticate(),
    // No rate limiter on GET avatar - it's just image retrieval
    (req: Request, res: Response) => {
      const { userId } = req.params;
      if (!ensureSelfOrAdmin(req, res, userId)) {
        return;
      }
      controller.getAvatar(req, res);
    }
  );

  // Car color routes
  router.post(
    '/update-car-color',
    authenticate(),
    apiLimiter,
    async (req: Request, res: Response) => {
      try {
        const { userId, carColor } = req.body as { userId?: string; carColor?: string };

        if (!userId || !ensureSelfOrAdmin(req, res, userId)) {
          if (!userId) {
            return res.status(400).json({ error: 'userId e carColor são obrigatórios' });
          }
          return;
        }

        if (!carColor) {
          return res.status(400).json({ error: 'userId e carColor são obrigatórios' });
        }

        const validColors = ['blue', 'green', 'yellow', 'pink'];
        if (!validColors.includes(carColor)) {
          return res.status(400).json({ error: 'Cor inválida' });
        }

        await controller.database.updateUserCarColor(userId, carColor);
        res.json({ success: true, carColor });
      } catch (error) {
        console.error('Error updating car color:', error);
        res.status(500).json({ error: 'Erro ao atualizar cor do carro' });
      }
    }
  );

  router.get(
    '/:userId/car-color',
    authenticate(),
    apiLimiter,
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        if (!ensureSelfOrAdmin(req, res, userId)) {
          return;
        }
        const carColor = await controller.database.getUserCarColor(userId);
        res.json({ carColor });
      } catch (error) {
        console.error('Error fetching car color:', error);
        res.status(500).json({ error: 'Erro ao buscar cor do carro' });
      }
    }
  );

  // Get ranking
  router.get('/ranking', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const ranking = await controller.database.getRanking(limit);
      res.json(ranking);
    } catch (error) {
      console.error('Error fetching ranking:', error);
      res.status(500).json({ error: 'Erro ao buscar ranking' });
    }
  });

  return router;
}
