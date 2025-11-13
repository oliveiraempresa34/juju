// ================================
// games.module.ts - Games Module
// ================================
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { GameSessionService } from './game-session.service';
import { BetService } from './bet.service';

import { GameSession } from '../../entities/game-session.entity';
import { Bet } from '../../entities/bet.entity';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';

import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameSession, Bet, User, Wallet]),
    BullModule.registerQueue({
      name: 'game-processing',
    }),
    WalletModule,
  ],
  controllers: [GamesController],
  providers: [GamesService, GameSessionService, BetService],
  exports: [GamesService, GameSessionService, BetService],
})
export class GamesModule {}

// ================================
// games.controller.ts - Games Controller
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
import { GamesService } from './games.service';
import { GameSessionService } from './game-session.service';
import { BetService } from './bet.service';
import { StartGameDto } from './dto/start-game.dto';
import { EndGameDto } from './dto/end-game.dto';
import { PlaceBetDto } from './dto/place-bet.dto';

@ApiTags('games')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('games')
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly gameSessionService: GameSessionService,
    private readonly betService: BetService,
  ) {}

  @ApiOperation({ summary: 'Start a new game session' })
  @ApiResponse({ status: 201, description: 'Game session started successfully' })
  @Post('start')
  async startGame(@Request() req, @Body() startGameDto: StartGameDto) {
    try {
      const gameSession = await this.gamesService.startGame(req.user.id, startGameDto);
      return {
        message: 'Game session started successfully',
        gameSession,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({ summary: 'End a game session' })
  @ApiResponse({ status: 200, description: 'Game session ended successfully' })
  @Post(':sessionId/end')
  async endGame(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Body() endGameDto: EndGameDto,
  ) {
    try {
      const result = await this.gamesService.endGame(req.user.id, sessionId, endGameDto);
      return {
        message: 'Game session ended successfully',
        ...result,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({ summary: 'Place a bet on current game' })
  @ApiResponse({ status: 201, description: 'Bet placed successfully' })
  @Post(':sessionId/bet')
  async placeBet(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Body() placeBetDto: PlaceBetDto,
  ) {
    try {
      const bet = await this.betService.placeBet(req.user.id, sessionId, placeBetDto.amount);
      return {
        message: 'Bet placed successfully',
        bet,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({ summary: 'Get current active game session' })
  @ApiResponse({ status: 200, description: 'Active game session retrieved' })
  @Get('active')
  async getActiveSession(@Request() req) {
    const session = await this.gameSessionService.getActiveSession(req.user.id);
    return {
      session,
    };
  }

  @ApiOperation({ summary: 'Get game session history' })
  @ApiResponse({ status: 200, description: 'Game history retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'mode', required: false, enum: ['single_player', 'multiplayer'] })
  @Get('history')
  async getGameHistory(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('mode') mode?: string,
  ) {
    return this.gameSessionService.getGameHistory(req.user.id, page, limit, mode);
  }

  @ApiOperation({ summary: 'Get specific game session details' })
  @ApiResponse({ status: 200, description: 'Game session details retrieved' })
  @Get(':sessionId')
  async getGameSession(@Request() req, @Param('sessionId') sessionId: string) {
    const session = await this.gameSessionService.getGameSession(sessionId, req.user.id);
    if (!session) {
      throw new NotFoundException('Game session not found');
    }
    return session;
  }

  @ApiOperation({ summary: 'Get player statistics' })
  @ApiResponse({ status: 200, description: 'Player statistics retrieved' })
  @Get('stats/player')
  async getPlayerStats(@Request() req) {
    return this.gamesService.getPlayerStats(req.user.id);
  }

  @ApiOperation({ summary: 'Get leaderboard for best distances' })
  @ApiResponse({ status: 200, description: 'Distance leaderboard retrieved' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly', 'all_time'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('leaderboard/distance')
  async getDistanceLeaderboard(
    @Query('period') period = 'all_time',
    @Query('limit') limit = 10,
  ) {
    return this.gamesService.getDistanceLeaderboard(period, limit);
  }

  @ApiOperation({ summary: 'Get leaderboard for best scores' })
  @ApiResponse({ status: 200, description: 'Score leaderboard retrieved' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly', 'all_time'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('leaderboard/score')
  async getScoreLeaderboard(
    @Query('period') period = 'all_time',
    @Query('limit') limit = 10,
  ) {
    return this.gamesService.getScoreLeaderboard(period, limit);
  }
}

// ================================
// games.service.ts - Games Service
// ================================
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { GameSession, GameMode, GameStatus } from '../../entities/game-session.entity';
import { User } from '../../entities/user.entity';
import { Bet, BetStatus } from '../../entities/bet.entity';

import { WalletService } from '../wallet/wallet.service';
import { TransactionType } from '../../entities/transaction.entity';
import { StartGameDto } from './dto/start-game.dto';
import { EndGameDto } from './dto/end-game.dto';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    @InjectQueue('game-processing')
    private readonly gameQueue: Queue,
  ) {}

  async startGame(userId: string, startGameDto: StartGameDto): Promise<GameSession> {
    // Check if user has active session
    const activeSession = await this.gameSessionRepository.findOne({
      where: {
        userId,
        status: GameStatus.ACTIVE,
      },
    });

    if (activeSession) {
      throw new BadRequestException('You already have an active game session');
    }

    // Create new game session
    const gameSession = this.gameSessionRepository.create({
      userId,
      gameMode: startGameDto.gameMode,
      roomId: startGameDto.roomId,
      seed: startGameDto.seed || Date.now(),
      trackData: startGameDto.trackData,
      status: GameStatus.ACTIVE,
    });

    return this.gameSessionRepository.save(gameSession);
  }

  async endGame(userId: string, sessionId: string, endGameDto: EndGameDto) {
    const session = await this.gameSessionRepository.findOne({
      where: {
        id: sessionId,
        userId,
        status: GameStatus.ACTIVE,
      },
      relations: ['bets'],
    });

    if (!session) {
      throw new NotFoundException('Active game session not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update game session
      session.status = GameStatus.COMPLETED;
      session.finalDistance = endGameDto.finalDistance;
      session.finalScore = endGameDto.finalScore;
      session.duration = endGameDto.duration;
      session.maxVelocity = endGameDto.maxVelocity || 0;
      session.maxDriftAngle = endGameDto.maxDriftAngle || 0;
      session.totalDriftTime = endGameDto.totalDriftTime || 0;
      session.rank = endGameDto.rank;
      session.totalPlayers = endGameDto.totalPlayers;
      session.gameplayData = endGameDto.gameplayData;

      await queryRunner.manager.save(session);

      // Update user statistics
      await this.updateUserStats(userId, endGameDto, queryRunner.manager);

      // Process bets
      let totalWinnings = 0;
      for (const bet of session.bets) {
        if (bet.status === BetStatus.ACTIVE) {
          const winnings = this.calculateWinnings(bet, endGameDto, session.gameMode);
          
          if (winnings > 0) {
            bet.status = BetStatus.WON;
            bet.payout = winnings;
            totalWinnings += winnings;

            // Add winnings to wallet
            await this.walletService.addFunds(
              userId,
              winnings,
              TransactionType.WIN,
              `Game win - Session ${sessionId}`,
            );
          } else {
            bet.status = BetStatus.LOST;
          }
          
          bet.settledAt = new Date();
          await queryRunner.manager.save(bet);
        }
      }

      await queryRunner.commitTransaction();

      // Queue for additional processing (rankings, achievements, etc.)
      await this.gameQueue.add('process-game-end', {
        sessionId,
        userId,
        finalDistance: endGameDto.finalDistance,
        finalScore: endGameDto.finalScore,
      });

      return {
        session,
        totalWinnings,
        newPersonalBest: endGameDto.finalDistance > (await this.getUserBestDistance(userId)),
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private calculateWinnings(bet: Bet, endGameDto: EndGameDto, gameMode: GameMode): number {
    let multiplier = bet.multiplier;

    // Calculate multiplier based on performance
    if (gameMode === GameMode.SINGLE_PLAYER) {
      if (endGameDto.finalDistance >= 2000) {
        multiplier = 2.5; // Excellent run
      } else if (endGameDto.finalDistance >= 1000) {
        multiplier = 2.0; // Good run
      } else if (endGameDto.finalDistance >= 500) {
        multiplier = 1.5; // Decent run
      } else {
        multiplier = 0; // Poor run, no winnings
      }
    } else {
      // Multiplayer payouts based on rank
      if (endGameDto.rank === 1) {
        multiplier = 2.5; // Winner
      } else if (endGameDto.rank === 2) {
        multiplier = 1.5; // Second place
      } else if (endGameDto.rank === 3) {
        multiplier = 1.2; // Third place
      } else {
        multiplier = 0; // No winnings for 4th+ place
      }
    }

    return bet.amount * multiplier;
  }

  private async updateUserStats(userId: string, endGameDto: EndGameDto, manager: any) {
    const user = await manager.findOne(User, { where: { id: userId } });
    
    user.gamesPlayed += 1;
    user.totalPlayTime += endGameDto.duration;
    
    if (endGameDto.finalDistance > user.bestDistance) {
      user.bestDistance = endGameDto.finalDistance;
    }
    
    if (endGameDto.finalScore > user.bestScore) {
      user.bestScore = endGameDto.finalScore;
    }

    await manager.save(user);
  }

  private async getUserBestDistance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.bestDistance || 0;
  }

  async getPlayerStats(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get detailed statistics
    const stats = await this.gameSessionRepository
      .createQueryBuilder('session')
      .select([
        'COUNT(*) as totalGames',
        'AVG(session.finalDistance) as avgDistance',
        'AVG(session.finalScore) as avgScore',
        'AVG(session.duration) as avgDuration',
        'MAX(session.finalDistance) as bestDistance',
        'MAX(session.finalScore) as bestScore',
        'SUM(CASE WHEN session.rank = 1 THEN 1 ELSE 0 END) as wins',
        'SUM(CASE WHEN session.gameMode = :singlePlayer THEN 1 ELSE 0 END) as singlePlayerGames',
        'SUM(CASE WHEN session.gameMode = :multiplayer THEN 1 ELSE 0 END) as multiplayerGames',
      ])
      .where('session.userId = :userId', { userId })
      .andWhere('session.status = :completed', { completed: GameStatus.COMPLETED })
      .setParameters({
        singlePlayer: GameMode.SINGLE_PLAYER,
        multiplayer: GameMode.MULTIPLAYER,
      })
      .getRawOne();

    // Get recent performance (last 10 games)
    const recentGames = await this.gameSessionRepository.find({
      where: {
        userId,
        status: GameStatus.COMPLETED,
      },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      profile: {
        username: user.username,
        gamesPlayed: user.gamesPlayed,
        bestDistance: user.bestDistance,
        bestScore: user.bestScore,
        totalPlayTime: user.totalPlayTime,
      },
      statistics: {
        ...stats,
        winRate: stats.multiplayerGames > 0 ? (stats.wins / stats.multiplayerGames) * 100 : 0,
      },
      recentGames: recentGames.map(game => ({
        id: game.id,
        date: game.createdAt,
        distance: game.finalDistance,
        score: game.finalScore,
        duration: game.duration,
        mode: game.gameMode,
        rank: game.rank,
      })),
    };
  }

  async getDistanceLeaderboard(period = 'all_time', limit = 10) {
    return this.getLeaderboard('bestDistance', period, limit);
  }

  async getScoreLeaderboard(period = 'all_time', limit = 10) {
    return this.getLeaderboard('bestScore', period, limit);
  }

  private async getLeaderboard(metric: string, period: string, limit: number) {
    let query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.avatar',
        `user.${metric} as value`,
        'user.gamesPlayed',
      ])
      .where(`user.${metric} > 0`)
      .orderBy(`user.${metric}`, 'DESC')
      .limit(limit);

    // For time-based periods, we'd need to query game sessions
    if (period !== 'all_time') {
      const dateFilter = this.getPeriodDateFilter(period);
      query = this.gameSessionRepository
        .createQueryBuilder('session')
        .select([
          'user.id',
          'user.username',
          'user.avatar',
          `MAX(session.${metric === 'bestDistance' ? 'finalDistance' : 'finalScore'}) as value`,
          'COUNT(session.id) as gamesPlayed',
        ])
        .leftJoin('session.user', 'user')
        .where('session.createdAt >= :dateFilter', { dateFilter })
        .andWhere('session.status = :completed', { completed: GameStatus.COMPLETED })
        .groupBy('user.id, user.username, user.avatar')
        .orderBy('value', 'DESC')
        .limit(limit);
    }

    const results = await query.getRawMany();
    
    return results.map((result, index) => ({
      rank: index + 1,
      userId: result.user_id || result.id,
      username: result.user_username || result.username,
      avatar: result.user_avatar || result.avatar,
      value: parseInt(result.value),
      gamesPlayed: parseInt(result.gamesPlayed || result.user_gamesPlayed),
    }));
  }

  private getPeriodDateFilter(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(0); // Beginning of time
    }
  }
}

// ================================
// game-session.service.ts - Game Session Service
// ================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSession, GameMode, GameStatus } from '../../entities/game-session.entity';

@Injectable()
export class GameSessionService {
  constructor(
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
  ) {}

  async getActiveSession(userId: string): Promise<GameSession | null> {
    return this.gameSessionRepository.findOne({
      where: {
        userId,
        status: GameStatus.ACTIVE,
      },
      relations: ['bets'],
    });
  }

  async getGameSession(sessionId: string, userId: string): Promise<GameSession | null> {
    return this.gameSessionRepository.findOne({
      where: {
        id: sessionId,
        userId,
      },
      relations: ['bets'],
    });
  }

  async getGameHistory(userId: string, page = 1, limit = 20, mode?: string) {
    const query = this.gameSessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .andWhere('session.status = :completed', { completed: GameStatus.COMPLETED })
      .orderBy('session.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (mode) {
      query.andWhere('session.gameMode = :mode', { mode });
    }

    const [sessions, total] = await query.getManyAndCount();

    return {
      sessions: sessions.map(session => ({
        id: session.id,
        gameMode: session.gameMode,
        finalDistance: session.finalDistance,
        finalScore: session.finalScore,
        duration: session.duration,
        rank: session.rank,
        totalPlayers: session.totalPlayers,
        createdAt: session.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

// ================================
// bet.service.ts - Bet Service
// ================================
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet, BetStatus } from '../../entities/bet.entity';
import { GameSession, GameStatus } from '../../entities/game-session.entity';
import { WalletService } from '../wallet/wallet.service';
import { TransactionType } from '../../entities/transaction.entity';

@Injectable()
export class BetService {
  constructor(
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
    @InjectRepository(GameSession)
    private readonly gameSessionRepository: Repository<GameSession>,
    private readonly walletService: WalletService,
  ) {}

  async placeBet(userId: string, sessionId: string, amount: number): Promise<Bet> {
    if (amount <= 0) {
      throw new BadRequestException('Bet amount must be positive');
    }

    // Validate game session
    const session = await this.gameSessionRepository.findOne({
      where: {
        id: sessionId,
        userId,
        status: GameStatus.ACTIVE,
      },
    });

    if (!session) {
      throw new BadRequestException('Active game session not found');
    }

    // Check if bet already exists for this session
    const existingBet = await this.betRepository.findOne({
      where: {
        gameSessionId: sessionId,
        status: BetStatus.ACTIVE,
      },
    });

    if (existingBet) {
      throw new BadRequestException('Bet already placed for this session');
    }

    // Deduct amount from wallet
    await this.walletService.deductFunds(
      userId,
      amount,
      TransactionType.BET,
      `Game bet - Session ${sessionId}`,
    );

    // Create bet
    const bet = this.betRepository.create({
      gameSessionId: sessionId,
      amount,
      multiplier: 1.0, // Will be calculated at game end
      status: BetStatus.ACTIVE,
    });

    return this.betRepository.save(bet);
  }
}

// ================================
// DTOs (Data Transfer Objects)
// ================================

// start-game.dto.ts
import { IsEnum, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GameMode } from '../../entities/game-session.entity';

export class StartGameDto {
  @ApiProperty({ enum: GameMode, description: 'Game mode' })
  @IsEnum(GameMode)
  gameMode: GameMode;

  @ApiProperty({ example: 'room-uuid', description: 'Room ID for multiplayer games', required: false })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiProperty({ example: 1234567890, description: 'Track generation seed', required: false })
  @IsOptional()
  @IsNumber()
  seed?: number;

  @ApiProperty({ description: 'Track data object', required: false })
  @IsOptional()
  @IsObject()
  trackData?: any;
}

// end-game.dto.ts
import { IsNumber, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EndGameDto {
  @ApiProperty({ example: 1250, description: 'Final distance reached in meters' })
  @IsNumber()
  @Min(0)
  finalDistance: number;

  @ApiProperty({ example: 87500, description: 'Final score achieved' })
  @IsNumber()
  @Min(0)
  finalScore: number;

  @ApiProperty({ example: 180, description: 'Game duration in seconds' })
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiProperty({ example: 35, description: 'Maximum velocity reached', required: false })
  @IsOptional()
  @IsNumber()
  maxVelocity?: number;

  @ApiProperty({ example: 45.5, description: 'Maximum drift angle in degrees', required: false })
  @IsOptional()
  @IsNumber()
  maxDriftAngle?: number;

  @ApiProperty({ example: 25.3, description: 'Total drift time in seconds', required: false })
  @IsOptional()
  @IsNumber()
  totalDriftTime?: number;

  @ApiProperty({ example: 2, description: 'Final rank in multiplayer game', required: false })
  @IsOptional()
  @IsNumber()
  rank?: number;

  @ApiProperty({ example: 4, description: 'Total players in multiplayer game', required: false })
  @IsOptional()
  @IsNumber()
  totalPlayers?: number;

  @ApiProperty({ description: 'Additional gameplay data', required: false })
  @IsOptional()
  @IsObject()
  gameplayData?: any;
}

// place-bet.dto.ts
import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceBetDto {
  @ApiProperty({ example: 25, description: 'Bet amount' })
  @IsNumber()
  @Min(1)
  @Max(1000)
  amount: number;
}