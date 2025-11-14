import { Router, Request, Response } from 'express';
import { Database } from '../database/Database';
import WebhookService from '../services/webhookService';
import { logger } from '../utils/logger';

/**
 * Create webhook routes
 * These routes handle payment confirmations from PIX and Card providers
 */
export function createWebhookRoutes(database: Database): Router {
  const router = Router();
  const webhookService = new WebhookService(database);

  /**
   * PIX webhook endpoint
   * Called by PIX provider when payment status changes
   */
  router.post('/pix', async (req: Request, res: Response) => {
    try {
      const signature = req.get('x-pix-signature') || req.get('x-signature') || '';
      const body = req.body;

      // Convert body to Buffer if it's not already
      const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));

      await webhookService.handlePixWebhook(bodyBuffer, signature);

      res.status(200).json({ status: 'ok' });
    } catch (error) {
      logger.error('PIX webhook error', error as Error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  /**
   * Card webhook endpoint
   * Called by Card provider when payment status changes
   */
  router.post('/card', async (req: Request, res: Response) => {
    try {
      const signature = req.get('x-card-signature') || req.get('x-signature') || '';
      const body = req.body;

      // Convert body to Buffer if it's not already
      const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));

      await webhookService.handleCardWebhook(bodyBuffer, signature);

      res.status(200).json({ status: 'ok' });
    } catch (error) {
      logger.error('Card webhook error', error as Error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  /**
   * Test webhook endpoint (for development only)
   * Allows manual testing of the webhook system
   */
  if (process.env.NODE_ENV === 'development') {
    router.post('/test', async (req: Request, res: Response) => {
      try {
        const { userId, amount, type, status, provider } = req.body;

        if (!userId || !amount || !type || !status || !provider) {
          return res.status(400).json({
            error: 'Missing required fields: userId, amount, type, status, provider'
          });
        }

        const externalId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const transactionId = `txn_${Date.now()}`;

        const payload = Buffer.from(JSON.stringify({
          externalId,
          status,
          transactionId,
          amount,
          userId,
          type
        }));

        // Generate test signature
        const crypto = require('crypto');
        const secret = provider === 'pix'
          ? (process.env.PIX_WEBHOOK_SECRET || 'default_pix_secret')
          : (process.env.CARD_WEBHOOK_SECRET || 'default_card_secret');

        const signature = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');

        if (provider === 'pix') {
          await webhookService.handlePixWebhook(payload, signature);
        } else {
          await webhookService.handleCardWebhook(payload, signature);
        }

        res.status(200).json({
          message: 'Test webhook processed successfully',
          externalId,
          transactionId
        });
      } catch (error) {
        logger.error('Test webhook error', error as Error);
        res.status(500).json({ error: 'Test webhook processing failed' });
      }
    });
  }

  return router;
}
