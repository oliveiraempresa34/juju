/**
 * Configuration Module - Validação e Centralização de ENV vars
 *
 * Features:
 * - Validação rigorosa de JWT_SECRET em produção
 * - Verificação de variáveis obrigatórias no startup
 * - Tipagem forte para todas configs
 * - Valores default seguros para desenvolvimento
 *
 * ⚠️  O servidor ABORTARÁ se detectar configurações inseguras em produção
 *
 * @module Config
 */

import path from 'path';

// ============================================================
// TIPOS DE CONFIGURAÇÃO
// ============================================================

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test' | 'staging';
  isProduction: boolean;
  isDevelopment: boolean;
  frontendUrls: string[];
  apiBaseUrl: string;
  adminPanelHosts: string[];
  clientAppHosts: string[];
}

export interface DatabaseConfig {
  url: string;
  poolSize: number;
  connectTimeout: number;
  poolTimeout: number;
  autoMigrate: boolean;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtCookieMaxAge: number;
  authCookieName: string;
  disableAuthCookie: boolean;
  bcryptSaltRounds: number;
}

export interface UploadConfig {
  provider: 'LOCAL' | 'S3' | 'CLOUDINARY';
  maxAvatarSizeMB: number;
  allowedAvatarTypes: string[];
  aws?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3Bucket: string;
    s3AvatarPrefix: string;
    cloudFrontUrl?: string;
  };
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadPreset: string;
  };
}

export interface PaymentConfig {
  provider: 'MERCADOPAGO' | 'PAGSEGURO' | 'ASAAS' | 'CUSTOM';
  mercadoPago?: {
    accessToken: string;
    publicKey: string;
    webhookSecret: string;
  };
  pagSeguro?: {
    email: string;
    token: string;
  };
  asaas?: {
    apiKey: string;
    walletId: string;
  };
}

export interface AffiliateConfig {
  enabled: boolean;
  commissionLevel1: number;
  commissionLevel2: number;
  commissionLevel3: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  authMax: number;
  wsMaxMessagesPerSecond: number;
}

export interface LogConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  file: string | null;
  logSqlQueries: boolean;
}

export interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  upload: UploadConfig;
  payment: PaymentConfig;
  affiliate: AffiliateConfig;
  rateLimit: RateLimitConfig;
  log: LogConfig;
}

// ============================================================
// LISTA DE SECRETS INSEGUROS (BLOQUEADOS EM PRODUÇÃO)
// ============================================================

const INSECURE_SECRETS = [
  'changeme',
  'secret',
  'default',
  'password',
  'test',
  'admin',
  'root',
  'dev',
  'development',
  'CHANGE_THIS',
  'CHANGE_ME',
  'YOUR_SECRET',
  'your_secret',
  'REPLACE_THIS',
  'dev-secret-only-for-development',
  '12345',
  'abc123',
  'qwerty',
];

// ============================================================
// VALIDAÇÃO DE JWT_SECRET
// ============================================================

/**
 * Valida o JWT_SECRET e aborta o processo se inseguro em produção
 */
function validateJwtSecret(secret: string | undefined, nodeEnv: string): string {
  const isProduction = nodeEnv === 'production';

  if (!secret) {
    if (isProduction) {
      console.error('\n❌ ERRO CRÍTICO DE SEGURANÇA\n');
      console.error('JWT_SECRET não foi definido no arquivo .env');
      console.error('\nPara gerar um secret seguro, execute:\n');
      console.error('  openssl rand -base64 64');
      console.error('  # OU');
      console.error('  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'base64\'))"\n');
      console.error('Depois adicione ao .env:\n');
      console.error('  JWT_SECRET=<secret_gerado>\n');
      process.exit(1);
    }

    // Em desenvolvimento, permitir secret default mas AVISAR
    console.warn('\n⚠️  AVISO: Usando JWT_SECRET padrão de desenvolvimento');
    console.warn('⚠️  NÃO USE ESTE SECRET EM PRODUÇÃO!\n');
    return 'dev-secret-only-for-development-DO-NOT-USE-IN-PRODUCTION';
  }

  // Verificar se é muito curto
  if (secret.length < 32) {
    if (isProduction) {
      console.error('\n❌ ERRO CRÍTICO DE SEGURANÇA\n');
      console.error(`JWT_SECRET muito curto (${secret.length} caracteres)`);
      console.error('Mínimo recomendado: 32 caracteres\n');
      console.error('Para gerar um secret seguro, execute:\n');
      console.error('  openssl rand -base64 64\n');
      process.exit(1);
    } else {
      console.warn(`\n⚠️  AVISO: JWT_SECRET muito curto (${secret.length} caracteres)`);
      console.warn('⚠️  Recomendado: mínimo 32 caracteres\n');
    }
  }

  // Verificar se está na lista de secrets inseguros
  const secretLower = secret.toLowerCase();
  const isInsecure = INSECURE_SECRETS.some(insecure => secretLower.includes(insecure));

  if (isInsecure) {
    if (isProduction) {
      console.error('\n❌ ERRO CRÍTICO DE SEGURANÇA\n');
      console.error('JWT_SECRET contém palavras inseguras ou default!');
      console.error(`Secret detectado: ${secret.substring(0, 20)}...`);
      console.error('\nPalavras proibidas:', INSECURE_SECRETS.join(', '));
      console.error('\nPara gerar um secret seguro, execute:\n');
      console.error('  openssl rand -base64 64\n');
      process.exit(1);
    } else {
      console.warn('\n⚠️  AVISO: JWT_SECRET parece ser um valor default/inseguro');
      console.warn('⚠️  ALTERE ANTES DE IR PARA PRODUÇÃO!\n');
    }
  }

  // Verificar entropia (básico: deve ter letras, números e símbolos)
  const hasLetters = /[a-zA-Z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSymbols = /[^a-zA-Z0-9]/.test(secret);

  if (isProduction && (!hasLetters || !hasNumbers)) {
    console.error('\n❌ ERRO CRÍTICO DE SEGURANÇA\n');
    console.error('JWT_SECRET deve conter letras E números para maior segurança');
    console.error('\nPara gerar um secret seguro, execute:\n');
    console.error('  openssl rand -base64 64\n');
    process.exit(1);
  }

  return secret;
}

// ============================================================
// VALIDAÇÃO DE DATABASE_URL
// ============================================================

function validateDatabaseUrl(url: string | undefined, nodeEnv: string): string {
  const isProduction = nodeEnv === 'production';

  if (!url) {
    console.error('\n❌ ERRO: DATABASE_URL não foi definido\n');
    console.error('Adicione ao .env:\n');
    console.error('  DATABASE_URL=postgresql://user:password@host:port/database\n');
    process.exit(1);
  }

  // Verificar se é PostgreSQL (obrigatório em produção)
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    if (isProduction) {
      console.error('\n❌ ERRO: DATABASE_URL deve usar PostgreSQL em produção\n');
      console.error('Formato esperado: postgresql://user:password@host:port/database\n');
      process.exit(1);
    } else {
      console.warn('\n⚠️  AVISO: Recomendado usar PostgreSQL (DATABASE_URL deve começar com postgresql://)\n');
    }
  }

  // Verificar credenciais inseguras em produção
  if (isProduction) {
    const insecurePatterns = [
      'postgres:postgres@',
      'postgres:password@',
      'user:password@',
      'admin:admin@',
      'root:root@',
      '@localhost',
      '@127.0.0.1',
    ];

    const hasInsecurePattern = insecurePatterns.some(pattern => url.includes(pattern));

    if (hasInsecurePattern) {
      console.error('\n❌ ERRO CRÍTICO DE SEGURANÇA\n');
      console.error('DATABASE_URL contém credenciais ou hosts inseguros para produção!');
      console.error('Padrões detectados:', insecurePatterns.filter(p => url.includes(p)).join(', '));
      console.error('\nUse credenciais fortes e um host de produção\n');
      process.exit(1);
    }
  }

  return url;
}

// ============================================================
// CARREGAR E VALIDAR CONFIGURAÇÕES
// ============================================================

export function loadConfig(): Config {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test' | 'staging';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';

  console.info(`\n🚀 Carregando configurações (NODE_ENV=${nodeEnv})\n`);

  // ============================================================
  // 1. SERVER CONFIG
  // ============================================================
  const server: ServerConfig = {
    port: parseInt(process.env.PORT || '2567', 10),
    nodeEnv,
    isProduction,
    isDevelopment,
    frontendUrls: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
      : ['http://localhost:5173'],
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:2567/api',
    adminPanelHosts: process.env.ADMIN_PANEL_HOSTS
      ? process.env.ADMIN_PANEL_HOSTS.split(',').map(h => h.trim())
      : ['admin.driftcash.com'],
    clientAppHosts: process.env.CLIENT_APP_HOSTS
      ? process.env.CLIENT_APP_HOSTS.split(',').map(h => h.trim())
      : ['driftcash.com', 'www.driftcash.com'],
  };

  // ============================================================
  // 2. DATABASE CONFIG (com validação)
  // ============================================================
  const databaseUrl = validateDatabaseUrl(process.env.DATABASE_URL, nodeEnv);

  const database: DatabaseConfig = {
    url: databaseUrl,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000', 10),
    poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '10000', 10),
    autoMigrate: process.env.AUTO_MIGRATE === 'true',
  };

  // ============================================================
  // 3. AUTH CONFIG (com validação JWT_SECRET)
  // ============================================================
  const jwtSecret = validateJwtSecret(process.env.JWT_SECRET, nodeEnv);

  const auth: AuthConfig = {
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '4h',
    jwtCookieMaxAge: parseInt(process.env.JWT_COOKIE_MAX_AGE || '14400', 10),
    authCookieName: process.env.AUTH_COOKIE_NAME || 'authToken',
    disableAuthCookie: process.env.DISABLE_AUTH_COOKIE === 'true',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  };

  // ============================================================
  // 4. UPLOAD CONFIG
  // ============================================================
  const uploadProvider = (process.env.UPLOAD_PROVIDER || 'LOCAL') as 'LOCAL' | 'S3' | 'CLOUDINARY';

  const upload: UploadConfig = {
    provider: uploadProvider,
    maxAvatarSizeMB: parseFloat(process.env.MAX_AVATAR_SIZE_MB || '5'),
    allowedAvatarTypes: process.env.ALLOWED_AVATAR_TYPES
      ? process.env.ALLOWED_AVATAR_TYPES.split(',').map(t => t.trim())
      : ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  };

  // AWS S3
  if (uploadProvider === 'S3') {
    upload.aws = {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      s3Bucket: process.env.AWS_S3_BUCKET || '',
      s3AvatarPrefix: process.env.AWS_S3_AVATAR_PREFIX || 'avatars/',
      cloudFrontUrl: process.env.AWS_CLOUDFRONT_URL,
    };

    if (isProduction && (!upload.aws.accessKeyId || !upload.aws.s3Bucket)) {
      console.error('\n❌ ERRO: AWS S3 configurado mas credenciais faltando\n');
      console.error('Configure: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET\n');
      process.exit(1);
    }
  }

  // Cloudinary
  if (uploadProvider === 'CLOUDINARY') {
    upload.cloudinary = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'drift_avatars',
    };

    if (isProduction && (!upload.cloudinary.cloudName || !upload.cloudinary.apiKey)) {
      console.error('\n❌ ERRO: Cloudinary configurado mas credenciais faltando\n');
      console.error('Configure: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET\n');
      process.exit(1);
    }
  }

  // ============================================================
  // 5. PAYMENT CONFIG
  // ============================================================
  const paymentProvider = (process.env.PAYMENT_PROVIDER || 'MERCADOPAGO') as 'MERCADOPAGO' | 'PAGSEGURO' | 'ASAAS' | 'CUSTOM';

  const payment: PaymentConfig = {
    provider: paymentProvider,
  };

  if (paymentProvider === 'MERCADOPAGO') {
    payment.mercadoPago = {
      accessToken: process.env.MP_ACCESS_TOKEN || '',
      publicKey: process.env.MP_PUBLIC_KEY || '',
      webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
    };
  }

  // ============================================================
  // 6. AFFILIATE CONFIG
  // ============================================================
  const affiliate: AffiliateConfig = {
    enabled: process.env.AFFILIATE_ENABLED !== 'false',
    commissionLevel1: parseFloat(process.env.AFFILIATE_COMMISSION_LEVEL_1 || '5.0'),
    commissionLevel2: parseFloat(process.env.AFFILIATE_COMMISSION_LEVEL_2 || '3.0'),
    commissionLevel3: parseFloat(process.env.AFFILIATE_COMMISSION_LEVEL_3 || '1.0'),
  };

  // ============================================================
  // 7. RATE LIMIT CONFIG
  // ============================================================
  const rateLimit: RateLimitConfig = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '20', 10),
    wsMaxMessagesPerSecond: parseInt(process.env.WS_MAX_MESSAGES_PER_SECOND || '60', 10),
  };

  // ============================================================
  // 8. LOG CONFIG
  // ============================================================
  const log: LogConfig = {
    level: (process.env.LOG_LEVEL || 'info') as 'error' | 'warn' | 'info' | 'debug',
    file: process.env.LOG_FILE || null,
    logSqlQueries: process.env.LOG_SQL_QUERIES === 'true',
  };

  // ============================================================
  // VALIDAÇÃO FINAL
  // ============================================================
  if (isProduction) {
    console.info('✅ Todas validações de segurança passaram\n');
  }

  return {
    server,
    database,
    auth,
    upload,
    payment,
    affiliate,
    rateLimit,
    log,
  };
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

export default getConfig;
