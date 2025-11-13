// ================================
// wallet.module.ts - Wallet Module
// ================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';

import { Wallet } from '../../entities/wallet.entity';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { Payment } from '../../entities/payment.entity';

import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, Transaction, User, Payment]),
    BullModule.registerQueue({
      name: 'wallet-transactions',
    }),
    PaymentsModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, TransactionService],
  exports: [WalletService, TransactionService],
})
export class WalletModule {}

// ================================
// wallet.controller.ts - Wallet Controller
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransferDto } from './dto/transfer.dto';

@ApiTags('wallet')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
  ) {}

  @ApiOperation({ summary: 'Get wallet balance and info' })
  @ApiResponse({ status: 200, description: 'Wallet information retrieved' })
  @Get()
  async getWallet(@Request() req) {
    const wallet = await this.walletService.getByUserId(req.user.id);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  @ApiOperation({ summary: 'Initiate deposit' })
  @ApiResponse({ status: 201, description: 'Deposit initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid deposit data' })
  @Post('deposit')
  async deposit(@Request() req, @Body() depositDto: DepositDto) {
    try {
      const result = await this.walletService.initiateDeposit(
        req.user.id,
        depositDto.amount,
        depositDto.method,
      );
      return {
        message: 'Deposit initiated successfully',
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({ summary: 'Initiate withdrawal' })
  @ApiResponse({ status: 201, description: 'Withdrawal initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid withdrawal data' })
  @Post('withdraw')
  async withdraw(@Request() req, @Body() withdrawDto: WithdrawDto) {
    try {
      const result = await this.walletService.initiateWithdrawal(
        req.user.id,
        withdrawDto.amount,
        withdrawDto.method,
        withdrawDto.pixKey,
      );
      return {
        message: 'Withdrawal initiated successfully',
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({ summary: 'Transfer funds between users (internal)' })
  @ApiResponse({ status: 201, description: 'Transfer completed successfully' })
  @Post('transfer')
  async transfer(@Request() req, @Body() transferDto: TransferDto) {
    try {
      const result = await this.walletService.transferFunds(
        req.user.id,
        transferDto.toUserId,
        transferDto.amount,
        transferDto.description,
      );
      return {
        message: 'Transfer completed successfully',
        transaction: result,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['deposit', 'withdrawal', 'bet', 'win', 'refund'] })
  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
  ) {
    const wallet = await this.walletService.getByUserId(req.user.id);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.transactionService.getTransactionHistory(
      wallet.id,
      page,
      limit,
      type,
    );
  }

  @ApiOperation({ summary: 'Get specific transaction details' })
  @ApiResponse({ status: 200, description: 'Transaction details retrieved' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @Get('transactions/:id')
  async getTransaction(@Request() req, @Param('id') transactionId: string) {
    const transaction = await this.transactionService.getTransaction(
      transactionId,
      req.user.id,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  @ApiOperation({ summary: 'Get wallet statistics' })
  @ApiResponse({ status: 200, description: 'Wallet statistics retrieved' })
  @Get('stats')
  async getStats(@Request() req) {
    return this.walletService.getWalletStats(req.user.id);
  }
}

// ================================
// wallet.service.ts - Wallet Service
// ================================
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { Wallet } from '../../entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { Payment, PaymentMethod, PaymentType } from '../../entities/payment.entity';

import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    @InjectQueue('wallet-transactions')
    private readonly transactionQueue: Queue,
  ) {}

  async getByUserId(userId: string): Promise<Wallet | null> {
    return this.walletRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async initiateDeposit(userId: string, amount: number, method: PaymentMethod) {
    // Validate amount
    const minDeposit = this.configService.get('payment.minDeposit');
    const maxDeposit = this.configService.get('payment.maxDeposit');
    
    if (amount < minDeposit || amount > maxDeposit) {
      throw new BadRequestException(
        `Deposit amount must be between ${minDeposit} and ${maxDeposit}`,
      );
    }

    const wallet = await this.getByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Create payment record
    const payment = await this.paymentsService.createPayment({
      userId,
      type: PaymentType.DEPOSIT,
      method,
      amount,
      description: `Deposit via ${method.toUpperCase()}`,
    });

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      type: TransactionType.DEPOSIT,
      amount,
      status: TransactionStatus.PENDING,
      referenceId: payment.externalId,
      description: `Deposit via ${method.toUpperCase()}`,
      metadata: {
        paymentMethod: method,
        paymentId: payment.id,
      },
    });

    await this.transactionRepository.save(transaction);

    // Update pending deposits
    await this.walletRepository.update(wallet.id, {
      pendingDeposits: wallet.pendingDeposits + amount,
    });

    return {
      transactionId: transaction.id,
      paymentId: payment.id,
      amount,
      method,
      status: 'pending',
      paymentData: payment.providerData,
    };
  }

  async initiateWithdrawal(
    userId: string,
    amount: number,
    method: PaymentMethod,
    pixKey?: string,
  ) {
    const wallet = await this.getByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Validate amount
    const minWithdrawal = this.configService.get('payment.minWithdrawal');
    const withdrawalFee = this.configService.get('payment.withdrawalFee');
    const totalAmount = amount + (amount * withdrawalFee);

    if (amount < minWithdrawal) {
      throw new BadRequestException(`Minimum withdrawal is ${minWithdrawal}`);
    }

    if (wallet.balance < totalAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Validate PIX key if required
    if (method === PaymentMethod.PIX && !pixKey) {
      throw new BadRequestException('PIX key is required for PIX withdrawals');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create payment record
      const payment = await this.paymentsService.createPayment({
        userId,
        type: PaymentType.WITHDRAWAL,
        method,
        amount,
        fee: amount * withdrawalFee,
        description: `Withdrawal via ${method.toUpperCase()}`,
        pixKey,
      });

      // Create transaction
      const transaction = this.transactionRepository.create({
        walletId: wallet.id,
        type: TransactionType.WITHDRAWAL,
        amount,
        fee: amount * withdrawalFee,
        status: TransactionStatus.PENDING,
        referenceId: payment.externalId,
        description: `Withdrawal via ${method.toUpperCase()}`,
        metadata: {
          paymentMethod: method,
          paymentId: payment.id,
          pixKey,
        },
      });

      await queryRunner.manager.save(transaction);

      // Update wallet balances
      await queryRunner.manager.update(Wallet, wallet.id, {
        balance: wallet.balance - totalAmount,
        pendingWithdrawals: wallet.pendingWithdrawals + amount,
      });

      await queryRunner.commitTransaction();

      // Queue for processing
      await this.transactionQueue.add('process-withdrawal', {
        paymentId: payment.id,
        transactionId: transaction.id,
      });

      return {
        transactionId: transaction.id,
        paymentId: payment.id,
        amount,
        fee: amount * withdrawalFee,
        method,
        status: 'pending',
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async transferFunds(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string,
  ) {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const fromWallet = await this.getByUserId(fromUserId);
    const toWallet = await this.getByUserId(toUserId);

    if (!fromWallet || !toWallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (fromWallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create debit transaction
      const debitTransaction = this.transactionRepository.create({
        walletId: fromWallet.id,
        type: TransactionType.BET, // Using BET type for debit
        amount: -amount,
        status: TransactionStatus.COMPLETED,
        description: description || `Transfer to ${toWallet.user.username}`,
        metadata: {
          transferType: 'debit',
          toUserId,
        },
      });

      // Create credit transaction
      const creditTransaction = this.transactionRepository.create({
        walletId: toWallet.id,
        type: TransactionType.WIN, // Using WIN type for credit
        amount,
        status: TransactionStatus.COMPLETED,
        description: description || `Transfer from ${fromWallet.user.username}`,
        metadata: {
          transferType: 'credit',
          fromUserId,
        },
      });

      await queryRunner.manager.save([debitTransaction, creditTransaction]);

      // Update wallet balances
      await queryRunner.manager.update(Wallet, fromWallet.id, {
        balance: fromWallet.balance - amount,
      });

      await queryRunner.manager.update(Wallet, toWallet.id, {
        balance: toWallet.balance + amount,
      });

      await queryRunner.commitTransaction();

      return debitTransaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async addFunds(userId: string, amount: number, type: TransactionType, description?: string) {
    const wallet = await this.getByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create transaction
      const transaction = this.transactionRepository.create({
        walletId: wallet.id,
        type,
        amount,
        status: TransactionStatus.COMPLETED,
        description: description || `${type} - ${amount}`,
        processedAt: new Date(),
      });

      await queryRunner.manager.save(transaction);

      // Update wallet balance
      await queryRunner.manager.update(Wallet, wallet.id, {
        balance: wallet.balance + amount,
      });

      await queryRunner.commitTransaction();

      return transaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deductFunds(userId: string, amount: number, type: TransactionType, description?: string) {
    const wallet = await this.getByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create transaction
      const transaction = this.transactionRepository.create({
        walletId: wallet.id,
        type,
        amount: -amount, // Negative for deduction
        status: TransactionStatus.COMPLETED,
        description: description || `${type} - ${amount}`,
        processedAt: new Date(),
      });

      await queryRunner.manager.save(transaction);

      // Update wallet balance
      await queryRunner.manager.update(Wallet, wallet.id, {
        balance: wallet.balance - amount,
      });

      await queryRunner.commitTransaction();

      return transaction;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async freezeFunds(userId: string, amount: number): Promise<boolean> {
    const wallet = await this.getByUserId(userId);
    if (!wallet) {
      return false;
    }

    if (wallet.balance < amount) {
      return false;
    }

    await this.walletRepository.update(wallet.id, {
      balance: wallet.balance - amount,
      frozenAmount: wallet.frozenAmount + amount,
    });

    return true;
  }

  async unfreezeFunds(userId: string, amount: number, returnToBalance = true): Promise<void> {
    const wallet = await this.getByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const updateData: Partial<Wallet> = {
      frozenAmount: Math.max(0, wallet.frozenAmount - amount),
    };

    if (returnToBalance) {
      updateData.balance = wallet.balance + amount;
    }

    await this.walletRepository.update(wallet.id, updateData);
  }

  async getWalletStats(userId: string) {
    const wallet = await this.getByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Get transaction statistics
    const stats = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select([
        'SUM(CASE WHEN type = :deposit AND status = :completed THEN amount ELSE 0 END) as totalDeposits',
        'SUM(CASE WHEN type = :withdrawal AND status = :completed THEN amount ELSE 0 END) as totalWithdrawals',
        'SUM(CASE WHEN type = :bet THEN ABS(amount) ELSE 0 END) as totalBets',
        'SUM(CASE WHEN type = :win THEN amount ELSE 0 END) as totalWins',
        'COUNT(CASE WHEN type = :bet THEN 1 END) as totalGames',
      ])
      .where('transaction.walletId = :walletId', { walletId: wallet.id })
      .setParameters({
        deposit: TransactionType.DEPOSIT,
        withdrawal: TransactionType.WITHDRAWAL,
        bet: TransactionType.BET,
        win: TransactionType.WIN,
        completed: TransactionStatus.COMPLETED,
      })
      .getRawOne();

    return {
      currentBalance: wallet.balance,
      pendingDeposits: wallet.pendingDeposits,
      pendingWithdrawals: wallet.pendingWithdrawals,
      frozenAmount: wallet.frozenAmount,
      ...stats,
      netProfit: parseFloat(stats.totalWins || 0) - parseFloat(stats.totalBets || 0),
    };
  }
}

// ================================
// transaction.service.ts - Transaction Service
// ================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../../entities/transaction.entity';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async getTransactionHistory(
    walletId: string,
    page = 1,
    limit = 20,
    type?: string,
  ) {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.walletId = :walletId', { walletId })
      .orderBy('transaction.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (type) {
      query.andWhere('transaction.type = :type', { type });
    }

    const [transactions, total] = await query.getManyAndCount();

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTransaction(transactionId: string, userId: string) {
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.wallet', 'wallet')
      .leftJoinAndSelect('wallet.user', 'user')
      .where('transaction.id = :transactionId', { transactionId })
      .andWhere('user.id = :userId', { userId })
      .getOne();
  }
}

// ================================
// DTOs (Data Transfer Objects)
// ================================

// deposit.dto.ts
import { IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../entities/payment.entity';

export class DepositDto {
  @ApiProperty({ example: 100, description: 'Deposit amount' })
  @IsNumber()
  @Min(10)
  @Max(10000)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

// withdraw.dto.ts
import { IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../entities/payment.entity';

export class WithdrawDto {
  @ApiProperty({ example: 50, description: 'Withdrawal amount' })
  @IsNumber()
  @Min(20)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: '11999887766', description: 'PIX key (required for PIX withdrawals)', required: false })
  @IsOptional()
  @IsString()
  pixKey?: string;
}

// transfer.dto.ts
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ example: 'user-uuid', description: 'Recipient user ID' })
  @IsString()
  toUserId: string;

  @ApiProperty({ example: 25, description: 'Transfer amount' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Gift for good game', description: 'Transfer description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}