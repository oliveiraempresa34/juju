import { Router, Request, Response } from 'express';
import { Database } from '../database/Database';
import { GameService } from '../services/gameService';
import { authenticate, ensureSelfOrAdmin } from '../middleware/authMiddleware';
import { body, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Create game routes
 * These routes handle game sessions, bets, and rewards
 */
export function createGameRoutes(database: Database): Router {
  const router = Router();
  const gameService = new GameService(database);

  // Rate limiter for game operations
  const gameLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 games per minute max
    message: { error: 'Muitas partidas iniciadas. Aguarde um momento.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
  });

  /**
   * Get allowed bet amounts and limits
   */
  router.get('/betting-config', (req: Request, res: Response) => {
    try {
      const allowedBets = gameService.getAllowedBets();
      const limits = gameService.getBettingLimits();

      res.json({
        allowedBets,
        limits
      });
    } catch (error) {
      logger.error('Error getting betting config', error as Error);
      res.status(500).json({ error: 'Erro ao obter configuração de apostas' });
    }
  });

  /**
   * Start a new game session
   */
  router.post(
    '/start',
    authenticate(),
    gameLimiter,
    [
      body('userId').isString().notEmpty(),
      body('betAmount').isNumeric(),
      body('gameMode').isIn(['single', 'multiplayer']),
      body('roomId').optional().isString()
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
        }

        const { userId, betAmount, gameMode, roomId } = req.body;

        // Ensure user can only start their own games
        if (!ensureSelfOrAdmin(req, res, userId)) {
          return;
        }

        const session = await gameService.startGame(userId, betAmount, gameMode, roomId);

        res.json({
          success: true,
          session
        });
      } catch (error) {
        logger.error('Error starting game', error as Error);
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Erro ao iniciar partida'
        });
      }
    }
  );

  /**
   * End a single player game session
   */
  router.post(
    '/end/single',
    authenticate(),
    gameLimiter,
    [
      body('sessionId').isString().notEmpty(),
      body('userId').isString().notEmpty(),
      body('finalDistance').isNumeric(),
      body('finalScore').isNumeric()
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
        }

        const { sessionId, userId, finalDistance, finalScore } = req.body;

        // Ensure user can only end their own games
        if (!ensureSelfOrAdmin(req, res, userId)) {
          return;
        }

        const result = await gameService.endSinglePlayerGame(
          sessionId,
          userId,
          finalDistance,
          finalScore
        );

        res.json({
          success: true,
          result
        });
      } catch (error) {
        logger.error('Error ending single player game', error as Error);
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Erro ao finalizar partida'
        });
      }
    }
  );

  /**
   * End a multiplayer game session
   */
  router.post(
    '/end/multiplayer',
    authenticate(),
    gameLimiter,
    [
      body('sessionId').isString().notEmpty(),
      body('userId').isString().notEmpty(),
      body('finalDistance').isNumeric(),
      body('finalScore').isNumeric(),
      body('rank').isInt({ min: 1 }),
      body('totalPlayers').isInt({ min: 2 }),
      body('averageBet').isNumeric()
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
        }

        const { sessionId, userId, finalDistance, finalScore, rank, totalPlayers, averageBet } = req.body;

        // Ensure user can only end their own games
        if (!ensureSelfOrAdmin(req, res, userId)) {
          return;
        }

        const result = await gameService.endMultiplayerGame(
          sessionId,
          userId,
          finalDistance,
          finalScore,
          rank,
          totalPlayers,
          averageBet
        );

        res.json({
          success: true,
          result
        });
      } catch (error) {
        logger.error('Error ending multiplayer game', error as Error);
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Erro ao finalizar partida'
        });
      }
    }
  );

  /**
   * Refund a game session
   */
  router.post(
    '/refund',
    authenticate(),
    gameLimiter,
    [
      body('sessionId').isString().notEmpty(),
      body('userId').isString().notEmpty(),
      body('reason').isString().notEmpty()
    ],
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ error: 'Dados inválidos', details: errors.array() });
        }

        const { sessionId, userId, reason } = req.body;

        // Ensure user can only refund their own games
        if (!ensureSelfOrAdmin(req, res, userId)) {
          return;
        }

        await gameService.refundGame(sessionId, userId, reason);

        res.json({
          success: true,
          message: 'Reembolso processado com sucesso'
        });
      } catch (error) {
        logger.error('Error refunding game', error as Error);
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Erro ao processar reembolso'
        });
      }
    }
  );

  // Legacy endpoints for backward compatibility
  // These map to the old charge-ticket and reward-winner endpoints

  router.post(
    '/charge-ticket',
    authenticate(),
    gameLimiter,
    async (req: Request, res: Response) => {
      try {
        const { userId, amount, transactionKey } = req.body;

        if (!userId || !amount || !transactionKey) {
          return res.status(400).json({ error: 'UserId, amount e transactionKey são obrigatórios' });
        }

        if (!ensureSelfOrAdmin(req, res, userId)) {
          return;
        }

        // Start game using the new service
        const session = await gameService.startGame(userId, amount, 'multiplayer');

        const newBalance = database.getUserBalance(userId);

        res.json({
          success: true,
          newBalance,
          sessionId: session.id,
          message: 'Ticket cobrado com sucesso'
        });
      } catch (error) {
        logger.error('Error charging ticket', error as Error);
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Erro ao cobrar ticket'
        });
      }
    }
  );

  router.post(
    '/reward-winner',
    authenticate(),
    gameLimiter,
    async (req: Request, res: Response) => {
      try {
        const { userId, amount, transactionKey } = req.body;

        if (!userId || !amount || !transactionKey) {
          return res.status(400).json({ error: 'UserId, amount e transactionKey são obrigatórios' });
        }

        if (!ensureSelfOrAdmin(req, res, userId)) {
          return;
        }

        // Check for duplicate
        const existing = database.getTransactionById(transactionKey);
        if (existing) {
          if (existing.userId !== userId) {
            return res.status(409).json({ error: 'TransactionKey já utilizado por outro usuário' });
          }

          const balance = database.getUserBalance(userId);
          return res.json({ success: true, message: 'Prêmio já creditado', newBalance: balance });
        }

        // Credit reward
        const newBalance = database.updateUserBalance(
          userId,
          amount,
          'Prêmio de partida multiplayer',
          {
            transactionId: transactionKey,
            transactionType: 'win'
          }
        );

        res.json({
          success: true,
          newBalance,
          message: 'Prêmio creditado com sucesso'
        });
      } catch (error) {
        logger.error('Error rewarding winner', error as Error);
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Erro ao creditar prêmio'
        });
      }
    }
  );

  return router;
}
