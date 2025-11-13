// ================================
// user.entity.ts - User Entity
// ================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Wallet } from './wallet.entity';
import { GameSession } from './game-session.entity';
import { AffiliateLink } from './affiliate.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30, unique: true })
  username: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ length: 255, nullable: true })
  avatar?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ length: 45, nullable: true })
  lastLoginIp?: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    soundEnabled: boolean;
    musicVolume: number;
    sfxVolume: number;
    language: string;
    notifications: boolean;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalDeposited: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalWithdrawn: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalWagered: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalWon: number;

  @Column({ type: 'int', default: 0 })
  gamesPlayed: number;

  @Column({ type: 'int', default: 0 })
  bestDistance: number;

  @Column({ type: 'bigint', default: 0 })
  bestScore: number;

  @Column({ type: 'int', default: 0 })
  totalPlayTime: number; // in seconds

  @Column({ length: 255, nullable: true })
  referredBy?: string; // Affiliate code

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Wallet, (wallet) => wallet.user, { cascade: true })
  wallet: Wallet;

  @OneToMany(() => GameSession, (session) => session.user)
  gameSessions: GameSession[];

  @OneToMany(() => AffiliateLink, (link) => link.user)
  affiliateLinks: AffiliateLink[];
}

// ================================
// wallet.entity.ts - Wallet Entity
// ================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pendingDeposits: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pendingWithdrawals: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  frozenAmount: number; // Amount locked in active games

  @Column({ type: 'jsonb', nullable: true })
  pixInfo?: {
    pixKey: string;
    pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn()
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];
}

// ================================
// transaction.entity.ts - Transaction Entity
// ================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  BET = 'bet',
  WIN = 'win',
  REFUND = 'refund',
  AFFILIATE_COMMISSION = 'affiliate_commission',
  BONUS = 'bonus',
  FEE = 'fee',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
@Index(['walletId', 'createdAt'])
@Index(['type', 'status'])
@Index(['referenceId'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  walletId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fee: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ length: 255, nullable: true })
  referenceId?: string; // External payment reference

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    paymentMethod?: 'pix' | 'card';
    gameSessionId?: string;
    affiliateCode?: string;
    provider?: string;
    [key: string]: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn()
  wallet: Wallet;
}

// ================================
// game-session.entity.ts - Game Session Entity
// ================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Bet } from './bet.entity';

export enum GameMode {
  SINGLE_PLAYER = 'single_player',
  MULTIPLAYER = 'multiplayer',
}

export enum GameStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CRASHED = 'crashed',
  DISCONNECTED = 'disconnected',
}

@Entity('game_sessions')
@Index(['userId', 'createdAt'])
@Index(['gameMode', 'status'])
@Index(['roomId'])
export class GameSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: GameMode,
  })
  gameMode: GameMode;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.ACTIVE,
  })
  status: GameStatus;

  @Column({ length: 255, nullable: true })
  roomId?: string;

  @Column({ type: 'int', default: 0 })
  finalDistance: number;

  @Column({ type: 'bigint', default: 0 })
  finalScore: number;

  @Column({ type: 'int', default: 0 })
  duration: number; // in seconds

  @Column({ type: 'int', default: 0 })
  maxVelocity: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  maxDriftAngle: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  totalDriftTime: number;

  @Column({ type: 'int', nullable: true })
  rank?: number; // Position in multiplayer game

  @Column({ type: 'int', nullable: true })
  totalPlayers?: number;

  @Column({ type: 'bigint', default: 0 })
  seed: number; // Track generation seed

  @Column({ type: 'jsonb', nullable: true })
  trackData?: any;

  @Column({ type: 'jsonb', nullable: true })
  gameplayData?: {
    checkpoints: any[];
    driftChains: any[];
    crashes: any[];
    powerups?: any[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.gameSessions)
  @JoinColumn()
  user: User;

  @OneToMany(() => Bet, (bet) => bet.gameSession)
  bets: Bet[];
}

// ================================
// bet.entity.ts - Bet Entity
// ================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { GameSession } from './game-session.entity';

export enum BetStatus {
  ACTIVE = 'active',
  WON = 'won',
  LOST = 'lost',
  REFUNDED = 'refunded',
}

@Entity('bets')
@Index(['gameSessionId'])
@Index(['status', 'createdAt'])
export class Bet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  gameSessionId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 1.0 })
  multiplier: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  payout: number;

  @Column({
    type: 'enum',
    enum: BetStatus,
    default: BetStatus.ACTIVE,
  })
  status: BetStatus;

  @Column({ type: 'timestamp', nullable: true })
  settledAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => GameSession, (session) => session.bets)
  @JoinColumn()
  gameSession: GameSession;
}

// ================================
// room.entity.ts - Room Entity (for matchmaking)
// ================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RoomStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

@Entity('rooms')
@Index(['status', 'createdAt'])
@Index(['betAmount'])
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column('uuid')
  createdBy: string;

  @Column({ type: 'int', default: 4 })
  maxPlayers: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  betAmount: number;

  @Column({ default: false })
  isPrivate: boolean;

  @Column({ length: 255, nullable: true })
  password?: string;

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.WAITING,
  })
  status: RoomStatus;

  @Column({ type: 'bigint' })
  seed: number;

  @Column({ type: 'jsonb', nullable: true })
  settings?: {
    gameMode: string;
    duration?: number;
    allowSpectators: boolean;
  };

  @Column({ type: 'jsonb', default: [] })
  players: Array<{
    userId: string;
    username: string;
    isReady: boolean;
    joinedAt: string;
  }>;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ================================
// ranking.entity.ts - Ranking Entity
// ================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RankingType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

export enum RankingMetric {
  DISTANCE = 'distance',
  SCORE = 'score',
  WINS = 'wins',
  EARNINGS = 'earnings',
}

@Entity('ranking_entries')
@Index(['type', 'metric', 'rank'])
@Index(['userId', 'type'])
@Index(['periodStart', 'periodEnd'])
export class RankingEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ length: 50 })
  username: string;

  @Column({
    type: 'enum',
    enum: RankingType,
  })
  type: RankingType;

  @Column({
    type: 'enum',
    enum: RankingMetric,
  })
  metric: RankingMetric;

  @Column({ type: 'int' })
  rank: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  value: number;

  @Column({ type: 'int', default: 0 })
  gamesPlayed: number;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ================================
// affiliate.entity.ts - Affiliate Entity
// ================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum AffiliateTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

@Entity('affiliate_links')
@Index(['code'], { unique: true })
@Index(['userId'])
export class AffiliateLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: AffiliateTier,
    default: AffiliateTier.BRONZE,
  })
  tier: AffiliateTier;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.05 })
  commissionRate: number; // Percentage as decimal (0.05 = 5%)

  @Column({ type: 'int', default: 0 })
  totalReferrals: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCommissions: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalReferralVolume: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.affiliateLinks)
  @JoinColumn()
  user: User;

  @OneToMany(() => AffiliateCommission, (commission) => commission.affiliateLink)
  commissions: AffiliateCommission[];
}

@Entity('affiliate_commissions')
@Index(['affiliateLinkId', 'createdAt'])
export class AffiliateCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  affiliateLinkId: string;

  @Column('uuid')
  referredUserId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  referralVolume: number; // Volume that generated this commission

  @Column({ length: 255, nullable: true })
  transactionId?: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => AffiliateLink, (link) => link.commissions)
  @JoinColumn()
  affiliateLink: AffiliateLink;
}

// ================================
// payment.entity.ts - Payment Entity
// ================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentMethod {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
}

@Entity('payments')
@Index(['userId', 'status'])
@Index(['externalId'], { unique: true })
@Index(['createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ length: 255, unique: true })
  externalId: string; // ID from payment provider

  @Column({
    type: 'enum',
    enum: PaymentType,
  })
  type: PaymentType;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fee: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  providerData?: {
    pixKey?: string;
    pixQrCode?: string;
    cardLast4?: string;
    cardBrand?: string;
    [key: string]: any;
  };

  @Column({ type: 'jsonb', nullable: true })
  webhookData?: any;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}