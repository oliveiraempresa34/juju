// ================================
// payments.module.ts - Payments Module
// ================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PixService } from './providers/pix.service';
import { CardService } from './providers/card.service';
import { WebhookService } from './webhook.service';

import { Payment } from '../../entities/payment.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Transaction, Wallet, User]),
    HttpModule,
    BullModule.registerQueue({
      name: 'payment-processing',
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PixService, CardService, WebhookService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

// ================================
// payments.controller.ts - Payments Controller
// ================================
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { WebhookService } from './webhook.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly webhookService: WebhookService,
  ) {}

  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post()
  async createPayment(@Request() req, @Body() createPaymentDto: CreatePaymentDto) {
    try {
      const payment = await this.paymentsService.createPayment({
        ...createPaymentDto,
        userId: req.user.id,
      });
      return {
        message: 'Payment created successfully',
        payment,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get(':paymentId')
  async getPayment(@Request() req, @Param('paymentId') paymentId: string) {
    const payment = await this.paymentsService.getPayment(paymentId, req.user.id);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  @ApiOperation({ summary: 'Get payment history' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get()
  async getPaymentHistory(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.paymentsService.getPaymentHistory(req.user.id, page, limit, type, status);
  }

  @ApiOperation({ summary: 'Cancel a pending payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post(':paymentId/cancel')
  async cancelPayment(@Request() req, @Param('paymentId') paymentId: string) {
    try {
      await this.paymentsService.cancelPayment(paymentId, req.user.id);
      return {
        message: 'Payment cancelled successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Webhook endpoints (no auth required)
  @ApiExcludeEndpoint()
  @Post('webhooks/pix')
  async pixWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: any,
  ) {
    const signature = headers['x-pix-signature'];
    const body = req.rawBody;
    
    await this.webhookService.handlePixWebhook(body, signature);
    return { status: 'ok' };
  }

  @ApiExcludeEndpoint()
  @Post('webhooks/card')
  async cardWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: any,
  ) {
    const signature = headers['x-card-signature'];
    const body = req.rawBody;
    
    await this.webhookService.handleCardWebhook(body, signature);
    return { status: 'ok' };
  }
}

// ================================
// payments.service.ts - Payments Service
// ================================
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { Payment, PaymentMethod, PaymentType, PaymentStatus } from '../../entities/payment.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';

import { PixService } from './providers/pix.service';
import { CardService } from './providers/card.service';

export interface CreatePaymentData {
  userId: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  fee?: number;
  description?: string;
  pixKey?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly pixService: PixService,
    private readonly cardService: CardService,
    @InjectQueue('payment-processing')
    private readonly paymentQueue: Queue,
  ) {}

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    // Validate configuration
    if (data.method === PaymentMethod.PIX && !this.configService.get('payment.pix.enabled')) {
      throw new BadRequestException('PIX payments are currently disabled');
    }

    if (data.method === PaymentMethod.CREDIT_CARD && !this.configService.get('payment.card.enabled')) {
      throw new BadRequestException('Card payments are currently disabled');
    }

    // Generate external ID
    const externalId = this.generateExternalId();

    // Create payment record
    const payment = this.paymentRepository.create({
      userId: data.userId,
      externalId,
      type: data.type,
      method: data.method,
      amount: data.amount,
      fee: data.fee || 0,
      status: PaymentStatus.PENDING,
      description: data.description,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    const savedPayment = await this.paymentRepository.save(payment);

    try {
      // Process with appropriate provider
      let providerResponse;
      
      if (data.method === PaymentMethod.PIX) {
        if (data.type === PaymentType.DEPOSIT) {
          providerResponse = await this.pixService.createDeposit(savedPayment);
        } else {
          providerResponse = await this.pixService.createWithdrawal(savedPayment, data.pixKey!);
        }
      } else {
        if (data.type === PaymentType.DEPOSIT) {
          providerResponse = await this.cardService.createDeposit(savedPayment);
        } else {
          throw new BadRequestException('Card withdrawals not supported');
        }
      }

      // Update payment with provider data
      savedPayment.providerData = providerResponse;
      savedPayment.status = PaymentStatus.PROCESSING;
      
      return this.paymentRepository.save(savedPayment);

    } catch (error) {
      // Mark payment as failed
      savedPayment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(savedPayment);
      
      throw new BadRequestException(`Payment creation failed: ${error.message}`);
    }
  }

  async getPayment(paymentId: string, userId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: {
        id: paymentId,
        userId,
      },
    });
  }

  async getPaymentHistory(
    userId: string,
    page = 1,
    limit = 20,
    type?: string,
    status?: string,
  ) {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.userId = :userId', { userId })
      .orderBy('payment.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (type) {
      query.andWhere('payment.type = :type', { type });
    }

    if (status) {
      query.andWhere('payment.status = :status', { status });
    }

    const [payments, total] = await query.getManyAndCount();

    return {
      payments: payments.map(payment => ({
        id: payment.id,
        type: payment.type,
        method: payment.method,
        amount: payment.amount,
        fee: payment.fee,
        status: payment.status,
        description: payment.description,
        createdAt: payment.createdAt,
        processedAt: payment.processedAt,
        expiresAt: payment.expiresAt,
        // Only include safe provider data
        paymentData: this.sanitizeProviderData(payment.providerData),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async cancelPayment(paymentId: string, userId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: {
        id: paymentId,
        userId,
        status: PaymentStatus.PENDING,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pending payment not found');
    }

    // Cancel with provider if needed
    try {
      if (payment.method === PaymentMethod.PIX) {
        await this.pixService.cancelPayment(payment);
      } else {
        await this.cardService.cancelPayment(payment);
      }
    } catch (error) {
      // Log error but don't fail the cancellation
      console.error('Provider cancellation failed:', error);
    }

    // Update payment status
    payment.status = PaymentStatus.CANCELLED;
    await this.paymentRepository.save(payment);

    // If it was a withdrawal, return funds to wallet
    if (payment.type === PaymentType.WITHDRAWAL) {
      const wallet = await this.walletRepository.findOne({
        where: { userId },
      });

      if (wallet) {
        await this.walletRepository.update(wallet.id, {
          balance: wallet.balance + payment.amount + payment.fee,
          pendingWithdrawals: Math.max(0, wallet.pendingWithdrawals - payment.amount),
        });
      }
    }
  }

  async processPaymentSuccess(payment: Payment): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update payment status
      payment.status = PaymentStatus.COMPLETED;
      payment.processedAt = new Date();
      await queryRunner.manager.save(payment);

      // Find related transaction
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { referenceId: payment.externalId },
      });

      if (transaction) {
        transaction.status = TransactionStatus.COMPLETED;
        transaction.processedAt = new Date();
        await queryRunner.manager.save(transaction);

        // Update wallet if deposit
        if (payment.type === PaymentType.DEPOSIT) {
          const wallet = await queryRunner.manager.findOne(Wallet, {
            where: { userId: payment.userId },
          });

          if (wallet) {
            await queryRunner.manager.update(Wallet, wallet.id, {
              balance: wallet.balance + payment.amount,
              pendingDeposits: Math.max(0, wallet.pendingDeposits - payment.amount),
            });
          }
        } else {
          // Withdrawal - update pending withdrawals
          const wallet = await queryRunner.manager.findOne(Wallet, {
            where: { userId: payment.userId },
          });

          if (wallet) {
            await queryRunner.manager.update(Wallet, wallet.id, {
              pendingWithdrawals: Math.max(0, wallet.pendingWithdrawals - payment.amount),
            });
          }
        }
      }

      await queryRunner.commitTransaction();

      // Queue for additional processing (notifications, etc.)
      await this.paymentQueue.add('payment-completed', {
        paymentId: payment.id,
        userId: payment.userId,
        type: payment.type,
        amount: payment.amount,
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async processPaymentFailure(payment: Payment, reason?: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update payment status
      payment.status = PaymentStatus.FAILED;
      payment.processedAt = new Date();
      await queryRunner.manager.save(payment);

      // Find related transaction
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: { referenceId: payment.externalId },
      });

      if (transaction) {
        transaction.status = TransactionStatus.FAILED;
        transaction.processedAt = new Date();
        await queryRunner.manager.save(transaction);
      }

      // If withdrawal failed, return funds to wallet
      if (payment.type === PaymentType.WITHDRAWAL) {
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { userId: payment.userId },
        });

        if (wallet) {
          await queryRunner.manager.update(Wallet, wallet.id, {
            balance: wallet.balance + payment.amount + payment.fee,
            pendingWithdrawals: Math.max(0, wallet.pendingWithdrawals - payment.amount),
          });
        }
      } else {
        // Deposit failed - remove from pending
        const wallet = await queryRunner.manager.findOne(Wallet, {
          where: { userId: payment.userId },
        });

        if (wallet) {
          await queryRunner.manager.update(Wallet, wallet.id, {
            pendingDeposits: Math.max(0, wallet.pendingDeposits - payment.amount),
          });
        }
      }

      await queryRunner.commitTransaction();

      // Queue for notification
      await this.paymentQueue.add('payment-failed', {
        paymentId: payment.id,
        userId: payment.userId,
        type: payment.type,
        amount: payment.amount,
        reason,
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private generateExternalId(): string {
    return `DTR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeProviderData(providerData: any): any {
    if (!providerData) return null;

    // Remove sensitive information
    const safe = { ...providerData };
    delete safe.apiKey;
    delete safe.secretKey;
    delete safe.internalData;
    
    return safe;
  }
}

// ================================
// webhook.service.ts - Webhook Service
// ================================
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { Payment } from '../../entities/payment.entity';
import { PaymentsService } from './payments.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  async handlePixWebhook(body: Buffer, signature: string): Promise<void> {
    try {
      // Verify signature
      const secret = this.configService.get('payment.pix.webhook.secret');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn('PIX webhook signature verification failed');
        return;
      }

      const payload = JSON.parse(body.toString());
      await this.processPixWebhook(payload);

    } catch (error) {
      this.logger.error('PIX webhook processing failed:', error);
      throw error;
    }
  }

  async handleCardWebhook(body: Buffer, signature: string): Promise<void> {
    try {
      // Verify signature
      const secret = this.configService.get('payment.card.webhook.secret');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn('Card webhook signature verification failed');
        return;
      }

      const payload = JSON.parse(body.toString());
      await this.processCardWebhook(payload);

    } catch (error) {
      this.logger.error('Card webhook processing failed:', error);
      throw error;
    }
  }

  private async processPixWebhook(payload: any): Promise<void> {
    const { externalId, status, transactionId } = payload;

    const payment = await this.paymentRepository.findOne({
      where: { externalId },
    });

    if (!payment) {
      this.logger.warn(`PIX payment not found: ${externalId}`);
      return;
    }

    // Update webhook data
    payment.webhookData = payload;
    await this.paymentRepository.save(payment);

    // Process based on status
    switch (status) {
      case 'paid':
      case 'completed':
        await this.paymentsService.processPaymentSuccess(payment);
        this.logger.log(`PIX payment completed: ${externalId}`);
        break;

      case 'failed':
      case 'cancelled':
        await this.paymentsService.processPaymentFailure(payment, payload.reason);
        this.logger.log(`PIX payment failed: ${externalId}`);
        break;

      default:
        this.logger.log(`PIX payment status update: ${externalId} -> ${status}`);
    }
  }

  private async processCardWebhook(payload: any): Promise<void> {
    const { externalId, status, transactionId } = payload;

    const payment = await this.paymentRepository.findOne({
      where: { externalId },
    });

    if (!payment) {
      this.logger.warn(`Card payment not found: ${externalId}`);
      return;
    }

    // Update webhook data
    payment.webhookData = payload;
    await this.paymentRepository.save(payment);

    // Process based on status
    switch (status) {
      case 'approved':
      case 'completed':
        await this.paymentsService.processPaymentSuccess(payment);
        this.logger.log(`Card payment completed: ${externalId}`);
        break;

      case 'declined':
      case 'failed':
        await this.paymentsService.processPaymentFailure(payment, payload.reason);
        this.logger.log(`Card payment failed: ${externalId}`);
        break;

      default:
        this.logger.log(`Card payment status update: ${externalId} -> ${status}`);
    }
  }
}

// ================================
// Payment Provider Services
// ================================

// providers/pix.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Payment } from '../../../entities/payment.entity';

@Injectable()
export class PixService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createDeposit(payment: Payment): Promise<any> {
    const apiKey = this.configService.get('payment.pix.apiKey');
    const baseUrl = this.configService.get('payment.pix.baseUrl');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/deposits`,
          {
            externalId: payment.externalId,
            amount: payment.amount,
            description: payment.description,
            expiresIn: 1800, // 30 minutes
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        pixKey: response.data.pixKey,
        pixQrCode: response.data.qrCode,
        transactionId: response.data.transactionId,
        expiresAt: response.data.expiresAt,
      };

    } catch (error) {
      throw new BadRequestException(`PIX deposit creation failed: ${error.message}`);
    }
  }

  async createWithdrawal(payment: Payment, pixKey: string): Promise<any> {
    const apiKey = this.configService.get('payment.pix.apiKey');
    const baseUrl = this.configService.get('payment.pix.baseUrl');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/withdrawals`,
          {
            externalId: payment.externalId,
            amount: payment.amount,
            pixKey,
            description: payment.description,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        transactionId: response.data.transactionId,
        estimatedCompletionTime: response.data.estimatedTime,
      };

    } catch (error) {
      throw new BadRequestException(`PIX withdrawal creation failed: ${error.message}`);
    }
  }

  async cancelPayment(payment: Payment): Promise<void> {
    const apiKey = this.configService.get('payment.pix.apiKey');
    const baseUrl = this.configService.get('payment.pix.baseUrl');

    try {
      await firstValueFrom(
        this.httpService.delete(
          `${baseUrl}/payments/${payment.externalId}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          },
        ),
      );
    } catch (error) {
      throw new BadRequestException(`PIX payment cancellation failed: ${error.message}`);
    }
  }
}

// providers/card.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Payment } from '../../../entities/payment.entity';

@Injectable()
export class CardService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createDeposit(payment: Payment): Promise<any> {
    const apiKey = this.configService.get('payment.card.apiKey');
    const baseUrl = this.configService.get('payment.card.baseUrl');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/charges`,
          {
            externalId: payment.externalId,
            amount: payment.amount * 100, // Convert to cents
            currency: 'BRL',
            description: payment.description,
            paymentMethod: 'credit_card',
            returnUrl: `${this.configService.get('FRONTEND_URL')}/payment/return`,
            webhookUrl: `${this.configService.get('API_URL')}/payments/webhooks/card`,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        checkoutUrl: response.data.checkoutUrl,
        transactionId: response.data.transactionId,
        expiresAt: response.data.expiresAt,
      };

    } catch (error) {
      throw new BadRequestException(`Card payment creation failed: ${error.message}`);
    }
  }

  async cancelPayment(payment: Payment): Promise<void> {
    const apiKey = this.configService.get('payment.card.apiKey');
    const baseUrl = this.configService.get('payment.card.baseUrl');

    try {
      await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/charges/${payment.externalId}/cancel`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          },
        ),
      );
    } catch (error) {
      throw new BadRequestException(`Card payment cancellation failed: ${error.message}`);
    }
  }
}

// ================================
// DTOs
// ================================

// create-payment.dto.ts
import { IsEnum, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentType } from '../../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentType, description: 'Payment type' })
  @IsEnum(PaymentType)
  type: PaymentType;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 100, description: 'Payment amount' })
  @IsNumber()
  @Min(1)
  @Max(10000)
  amount: number;

  @ApiProperty({ example: 'Deposit to wallet', description: 'Payment description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '11999887766', description: 'PIX key for withdrawals', required: false })
  @IsOptional()
  @IsString()
  pixKey?: string;
}