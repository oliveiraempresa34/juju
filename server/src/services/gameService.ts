import { Database } from '../database/Database';
import { logger } from '../utils/logger';
import { GAME_CONFIG } from '../../../constants';

// ================================
// TYPES & INTERFACES
// ================================

export interface GameSession {
  id: string;
  userId: string;
  betAmount: number;
  startedAt: string;
  status: 'active' | 'completed' | 'crashed';
}

export interface GameResult {
  sessionId: string;
  userId: string;
  betAmount: number;
  finalDistance: number;
  finalScore: number;
  multiplier: number;
  grossWinnings: number;
  netWinnings: number; // After house edge
  houseEdge: number;
  rank?: number;
  totalPlayers?: number;
}

// ================================
// GAME SERVICE
// ================================

/**
 * Service to handle game sessions, bets, and rewards
 * Includes House Edge application and bet validation
 */
export class GameService {
  constructor(private database: Database) {}

  // House Edge configuration
  private readonly HOUSE_EDGE = GAME_CONFIG.ECONOMY.MULTIPLAYER_PAYOUTS.HOUSE_EDGE; // 5%

  // Allowed bet amounts from constants
  private readonly ALLOWED_BETS = GAME_CONFIG.ECONOMY.BET_AMOUNTS.filter(amount => amount > 0);
  private readonly MIN_BET = GAME_CONFIG.ECONOMY.MIN_BET;
  private readonly MAX_BET = GAME_CONFIG.ECONOMY.MAX_BET;

  /**
   * Validate bet amount against allowed values
   * CRITICAL: Prevents arbitrary bet amounts
   */
  private validateBetAmount(amount: number): void {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Valor de aposta inválido');
    }

    if (amount < this.MIN_BET) {
      throw new Error(`Aposta mínima é R$ ${this.MIN_BET}`);
    }

    if (amount > this.MAX_BET) {
      throw new Error(`Aposta máxima é R$ ${this.MAX_BET}`);
    }

    if (!this.ALLOWED_BETS.includes(amount)) {
      throw new Error(
        `Valor de aposta não permitido. Valores permitidos: ${this.ALLOWED_BETS.join(', ')}`
      );
    }
  }

  /**
   * Start a new game session
   * Deducts bet amount from user balance
   */
  async startGame(
    userId: string,
    betAmount: number,
    gameMode: 'single' | 'multiplayer',
    roomId?: string
  ): Promise<GameSession> {
    try {
      // Validate bet amount
      this.validateBetAmount(betAmount);

      // Check user balance
      const balance = this.database.getUserBalance(userId);
      if (balance < betAmount) {
        throw new Error('Saldo insuficiente para esta aposta');
      }

      // Generate unique session ID
      const sessionId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const transactionKey = `bet_${sessionId}`;

      // Check if transaction already exists (prevent double charge)
      const existingTx = this.database.getTransactionById(transactionKey);
      if (existingTx) {
        throw new Error('Sessão de jogo já iniciada');
      }

      // Deduct bet amount from balance
      this.database.updateUserBalance(
        userId,
        -betAmount,
        `Aposta de ${gameMode === 'single' ? 'single player' : 'multiplayer'}`,
        {
          transactionId: transactionKey,
          transactionType: 'bet',
          gameMode,
          sessionId,
          roomId
        }
      );

      logger.info('Game session started', {
        sessionId,
        userId,
        betAmount,
        gameMode,
        roomId
      });

      return {
        id: sessionId,
        userId,
        betAmount,
        startedAt: new Date().toISOString(),
        status: 'active'
      };
    } catch (error) {
      logger.error('Error starting game', error as Error);
      throw error;
    }
  }

  /**
   * Calculate winnings for single player mode
   * Uses multipliers from constants.ts
   */
  private calculateSinglePlayerMultiplier(
    finalDistance: number,
    betAmount: number,
    isPersonalBest: boolean
  ): number {
    const multipliers = GAME_CONFIG.ECONOMY.SINGLE_PLAYER_MULTIPLIERS;

    if (isPersonalBest && finalDistance >= 500) {
      return multipliers.PERFECT_RUN; // 2.5x
    }

    if (finalDistance >= 1000) {
      return multipliers.GREAT_RUN; // 2.0x
    }

    if (finalDistance >= 500) {
      return multipliers.GOOD_RUN; // 1.5x
    }

    // Basic completion - player gets bet back
    return multipliers.BASIC; // 1.0x
  }

  /**
   * Calculate winnings for multiplayer mode
   * Based on rank and total pot
   */
  private calculateMultiplayerWinnings(
    betAmount: number,
    rank: number,
    totalPlayers: number,
    totalPot: number
  ): { grossWinnings: number; multiplier: number } {
    const payouts = GAME_CONFIG.ECONOMY.MULTIPLAYER_PAYOUTS;

    let multiplier = 0;

    switch (rank) {
      case 1: // Winner
        multiplier = payouts.WINNER; // 60% of pot
        break;
      case 2: // Second place
        multiplier = payouts.SECOND; // 30% of pot
        break;
      case 3: // Third place
        multiplier = payouts.THIRD; // 10% of pot
        break;
      default:
        // No winnings for 4th+ place
        return { grossWinnings: 0, multiplier: 0 };
    }

    const grossWinnings = totalPot * multiplier;

    return { grossWinnings, multiplier };
  }

  /**
   * Apply house edge to winnings
   * CRITICAL: This is where the platform takes its cut
   */
  private applyHouseEdge(grossWinnings: number): number {
    return grossWinnings * (1 - this.HOUSE_EDGE);
  }

  /**
   * End a single player game session and calculate rewards
   */
  async endSinglePlayerGame(
    sessionId: string,
    userId: string,
    finalDistance: number,
    finalScore: number
  ): Promise<GameResult> {
    try {
      // Verify session exists and belongs to user
      const transactionKey = `bet_${sessionId}`;
      const betTransaction = this.database.getTransactionById(transactionKey);

      if (!betTransaction) {
        throw new Error('Sessão de jogo não encontrada');
      }

      if (betTransaction.userId !== userId) {
        throw new Error('Sessão de jogo pertence a outro usuário');
      }

      const betAmount = Math.abs(betTransaction.amount);

      // Check for duplicate reward
      const rewardKey = `reward_${sessionId}`;
      const existingReward = this.database.getTransactionById(rewardKey);
      if (existingReward) {
        throw new Error('Prêmio já foi creditado para esta sessão');
      }

      // Determine if it's a personal best
      // (In real implementation, check against user's best distance)
      const isPersonalBest = false; // TODO: Check against user stats

      // Calculate multiplier
      const multiplier = this.calculateSinglePlayerMultiplier(
        finalDistance,
        betAmount,
        isPersonalBest
      );

      // Calculate winnings
      const grossWinnings = betAmount * multiplier;
      const netWinnings = this.applyHouseEdge(grossWinnings);
      const houseEdge = grossWinnings - netWinnings;

      // Credit winnings to user
      if (netWinnings > 0) {
        this.database.updateUserBalance(
          userId,
          netWinnings,
          `Prêmio de single player (${finalDistance}m, ${multiplier.toFixed(1)}x)`,
          {
            transactionId: rewardKey,
            transactionType: 'win',
            sessionId,
            finalDistance,
            finalScore,
            multiplier,
            grossWinnings,
            netWinnings,
            houseEdge
          }
        );
      }

      logger.info('Single player game ended', {
        sessionId,
        userId,
        finalDistance,
        betAmount,
        multiplier,
        grossWinnings,
        netWinnings,
        houseEdge
      });

      return {
        sessionId,
        userId,
        betAmount,
        finalDistance,
        finalScore,
        multiplier,
        grossWinnings,
        netWinnings,
        houseEdge
      };
    } catch (error) {
      logger.error('Error ending single player game', error as Error);
      throw error;
    }
  }

  /**
   * End a multiplayer game session and calculate rewards
   */
  async endMultiplayerGame(
    sessionId: string,
    userId: string,
    finalDistance: number,
    finalScore: number,
    rank: number,
    totalPlayers: number,
    averageBet: number
  ): Promise<GameResult> {
    try {
      // Verify session exists and belongs to user
      const transactionKey = `bet_${sessionId}`;
      const betTransaction = this.database.getTransactionById(transactionKey);

      if (!betTransaction) {
        throw new Error('Sessão de jogo não encontrada');
      }

      if (betTransaction.userId !== userId) {
        throw new Error('Sessão de jogo pertence a outro usuário');
      }

      const betAmount = Math.abs(betTransaction.amount);

      // Check for duplicate reward
      const rewardKey = `reward_${sessionId}`;
      const existingReward = this.database.getTransactionById(rewardKey);
      if (existingReward) {
        throw new Error('Prêmio já foi creditado para esta sessão');
      }

      // Calculate total pot (approximate)
      const totalPot = averageBet * totalPlayers;

      // Calculate winnings based on rank
      const { grossWinnings, multiplier } = this.calculateMultiplayerWinnings(
        betAmount,
        rank,
        totalPlayers,
        totalPot
      );

      // Apply house edge
      const netWinnings = this.applyHouseEdge(grossWinnings);
      const houseEdge = grossWinnings - netWinnings;

      // Credit winnings to user
      if (netWinnings > 0) {
        this.database.updateUserBalance(
          userId,
          netWinnings,
          `Prêmio de multiplayer (Posição ${rank}/${totalPlayers})`,
          {
            transactionId: rewardKey,
            transactionType: 'win',
            sessionId,
            finalDistance,
            finalScore,
            rank,
            totalPlayers,
            multiplier,
            grossWinnings,
            netWinnings,
            houseEdge
          }
        );
      }

      logger.info('Multiplayer game ended', {
        sessionId,
        userId,
        finalDistance,
        rank,
        totalPlayers,
        betAmount,
        grossWinnings,
        netWinnings,
        houseEdge
      });

      return {
        sessionId,
        userId,
        betAmount,
        finalDistance,
        finalScore,
        multiplier,
        grossWinnings,
        netWinnings,
        houseEdge,
        rank,
        totalPlayers
      };
    } catch (error) {
      logger.error('Error ending multiplayer game', error as Error);
      throw error;
    }
  }

  /**
   * Refund a game session (if game crashed or error occurred)
   */
  async refundGame(sessionId: string, userId: string, reason: string): Promise<void> {
    try {
      // Verify session exists and belongs to user
      const transactionKey = `bet_${sessionId}`;
      const betTransaction = this.database.getTransactionById(transactionKey);

      if (!betTransaction) {
        throw new Error('Sessão de jogo não encontrada');
      }

      if (betTransaction.userId !== userId) {
        throw new Error('Sessão de jogo pertence a outro usuário');
      }

      const betAmount = Math.abs(betTransaction.amount);

      // Check for duplicate refund
      const refundKey = `refund_${sessionId}`;
      const existingRefund = this.database.getTransactionById(refundKey);
      if (existingRefund) {
        throw new Error('Reembolso já foi processado para esta sessão');
      }

      // Credit refund to user
      this.database.updateUserBalance(
        userId,
        betAmount,
        `Reembolso de partida (${reason})`,
        {
          transactionId: refundKey,
          transactionType: 'refund',
          sessionId,
          reason
        }
      );

      logger.info('Game refunded', { sessionId, userId, betAmount, reason });
    } catch (error) {
      logger.error('Error refunding game', error as Error);
      throw error;
    }
  }

  /**
   * Get allowed bet amounts
   */
  getAllowedBets(): number[] {
    return this.ALLOWED_BETS;
  }

  /**
   * Get betting limits
   */
  getBettingLimits(): { min: number; max: number } {
    return {
      min: this.MIN_BET,
      max: this.MAX_BET
    };
  }
}

export default GameService;
