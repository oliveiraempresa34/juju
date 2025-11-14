import crypto from 'crypto';
import { Database } from '../database/Database';
import { logger } from '../utils/logger';

// ================================
// WEBHOOK SERVICE
// ================================

/**
 * Service to handle payment webhooks from PIX and Card providers
 * Integrates with the 3-level affiliate system
 */
export class WebhookService {
  constructor(private database: Database) {}

  /**
   * Verify webhook signature for security
   */
  private verifySignature(body: Buffer, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Handle PIX webhook
   */
  async handlePixWebhook(body: Buffer, signature: string): Promise<void> {
    try {
      // Verify signature
      const secret = process.env.PIX_WEBHOOK_SECRET || 'default_pix_secret';

      if (!this.verifySignature(body, signature, secret)) {
        logger.warn('PIX webhook signature verification failed');
        throw new Error('Invalid webhook signature');
      }

      const payload = JSON.parse(body.toString());
      await this.processPaymentWebhook(payload, 'pix');

      logger.info('PIX webhook processed successfully', { externalId: payload.externalId });
    } catch (error) {
      logger.error('PIX webhook processing failed', error as Error);
      throw error;
    }
  }

  /**
   * Handle Card webhook
   */
  async handleCardWebhook(body: Buffer, signature: string): Promise<void> {
    try {
      // Verify signature
      const secret = process.env.CARD_WEBHOOK_SECRET || 'default_card_secret';

      if (!this.verifySignature(body, signature, secret)) {
        logger.warn('Card webhook signature verification failed');
        throw new Error('Invalid webhook signature');
      }

      const payload = JSON.parse(body.toString());
      await this.processPaymentWebhook(payload, 'card');

      logger.info('Card webhook processed successfully', { externalId: payload.externalId });
    } catch (error) {
      logger.error('Card webhook processing failed', error as Error);
      throw error;
    }
  }

  /**
   * Process payment webhook and trigger affiliate commissions
   * CRITICAL: This is where deposits get integrated with the 3-level affiliate system
   */
  private async processPaymentWebhook(
    payload: {
      externalId: string;
      status: string;
      transactionId: string;
      amount: number;
      userId: string;
      type: 'deposit' | 'withdrawal';
    },
    provider: 'pix' | 'card'
  ): Promise<void> {
    const { externalId, status, transactionId, amount, userId, type } = payload;

    logger.info('Processing payment webhook', {
      externalId,
      status,
      provider,
      userId,
      type,
      amount
    });

    // Check if payment was already processed
    const existingTransaction = this.database.getTransactionById(externalId);
    if (existingTransaction) {
      logger.info('Payment already processed', { externalId });
      return;
    }

    // Process based on status
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'approved':
        await this.handlePaymentSuccess(userId, type, amount, externalId, transactionId, provider);
        break;

      case 'failed':
      case 'cancelled':
      case 'declined':
        await this.handlePaymentFailure(userId, type, amount, externalId, payload.status);
        break;

      case 'pending':
      case 'processing':
        logger.info('Payment still pending', { externalId, status });
        break;

      default:
        logger.warn('Unknown payment status', { externalId, status });
    }
  }

  /**
   * Handle successful payment
   * For deposits: Credits user balance AND processes 3-level affiliate commissions
   */
  private async handlePaymentSuccess(
    userId: string,
    type: 'deposit' | 'withdrawal',
    amount: number,
    externalId: string,
    transactionId: string,
    provider: string
  ): Promise<void> {
    try {
      if (type === 'deposit') {
        // Credit user balance
        this.database.updateUserBalance(
          userId,
          amount,
          `Depósito via ${provider.toUpperCase()} aprovado`,
          {
            transactionId: externalId,
            transactionType: 'deposit',
            provider,
            providerTransactionId: transactionId
          }
        );

        // CRITICAL: Process 3-level affiliate commissions for deposit
        await this.processDepositAffiliateCommissions(userId, amount);

        logger.info('Deposit processed successfully with affiliate commissions', {
          userId,
          amount,
          externalId
        });
      } else {
        // Withdrawal - just mark as completed (balance was already deducted)
        logger.info('Withdrawal processed successfully', {
          userId,
          amount,
          externalId
        });
      }
    } catch (error) {
      logger.error('Error handling payment success', error as Error);
      throw error;
    }
  }

  /**
   * Process all 3 levels of affiliate commissions for a deposit
   * Level 1: 10% commission
   * Level 2: 5% commission
   * Level 3: 2% commission
   */
  private async processDepositAffiliateCommissions(
    userId: string,
    depositAmount: number
  ): Promise<void> {
    try {
      const user = this.database.getUserById(userId);
      if (!user || !user.referredBy) {
        logger.debug('No affiliate to credit for this deposit', { userId });
        return;
      }

      // Level 1 commission (10%)
      await this.database.processAffiliateDepositCommission(
        user.referredBy,
        userId,
        depositAmount,
        1
      );

      logger.info('Level 1 affiliate commission processed', {
        affiliateUserId: user.referredBy,
        referredUserId: userId,
        depositAmount,
        commission: depositAmount * 0.10
      });

      // Level 2 commission (5%)
      const level1Referrer = this.database.getUserById(user.referredBy);
      if (level1Referrer?.referredBy) {
        await this.database.processAffiliateDepositCommission(
          level1Referrer.referredBy,
          userId,
          depositAmount,
          2
        );

        logger.info('Level 2 affiliate commission processed', {
          affiliateUserId: level1Referrer.referredBy,
          referredUserId: userId,
          depositAmount,
          commission: depositAmount * 0.05
        });

        // Level 3 commission (2%)
        const level2Referrer = this.database.getUserById(level1Referrer.referredBy);
        if (level2Referrer?.referredBy) {
          await this.database.processAffiliateDepositCommission(
            level2Referrer.referredBy,
            userId,
            depositAmount,
            3
          );

          logger.info('Level 3 affiliate commission processed', {
            affiliateUserId: level2Referrer.referredBy,
            referredUserId: userId,
            depositAmount,
            commission: depositAmount * 0.02
          });
        }
      }

      logger.info('All affiliate commissions processed successfully', {
        userId,
        depositAmount
      });
    } catch (error) {
      logger.error('Error processing deposit affiliate commissions', error as Error);
      // Don't throw - commissions failing shouldn't fail the deposit
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(
    userId: string,
    type: string,
    amount: number,
    externalId: string,
    reason: string
  ): Promise<void> {
    logger.warn('Payment failed', {
      userId,
      type,
      amount,
      externalId,
      reason
    });

    // If it was a withdrawal that failed, we should credit back the user
    // (in a real system with pending withdrawals)
    // For now, just log it
  }
}

export default WebhookService;
