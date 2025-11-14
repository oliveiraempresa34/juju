-- Migration: 001_affiliate_3_levels
-- Description: Add 3-level affiliate system support
-- Date: 2025-11-14

-- ========================================
-- 1. ADD AFFILIATE COMMISSIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id TEXT PRIMARY KEY,
  affiliateUserId TEXT NOT NULL,
  referredUserId TEXT NOT NULL,
  level INTEGER NOT NULL,
  amount REAL NOT NULL,
  baseAmount REAL NOT NULL,
  commissionRate REAL NOT NULL,
  type TEXT NOT NULL,
  transactionId TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (affiliateUserId) REFERENCES users(id),
  FOREIGN KEY (referredUserId) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliateUserId);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referred ON affiliate_commissions(referredUserId);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_level ON affiliate_commissions(level);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_type ON affiliate_commissions(type);

-- ========================================
-- 2. ADD REFERRAL CODE TO EXISTING USERS
-- ========================================

-- Check if referralCode column exists
-- If not, add it (for existing databases)

-- NOTE: SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS
-- Run this manually if upgrading from old schema:
-- ALTER TABLE users ADD COLUMN referralCode TEXT;
-- ALTER TABLE users ADD COLUMN referredBy TEXT;

-- Generate referral codes for existing users (run after adding columns)
-- UPDATE users SET referralCode = UPPER(SUBSTR(username, 1, 4) || SUBSTR(HEX(RANDOMBLOB(3)), 1, 6))
-- WHERE referralCode IS NULL OR referralCode = '';

-- ========================================
-- 3. ADD SETTINGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- ========================================
-- 4. ADD USER BANS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS user_bans (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  bannedBy TEXT NOT NULL,
  reason TEXT,
  expiresAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (bannedBy) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_bans_userId ON user_bans(userId);
CREATE INDEX IF NOT EXISTS idx_user_bans_expiresAt ON user_bans(expiresAt);

-- ========================================
-- 5. UPDATE TRANSACTION TYPES
-- ========================================

-- Ensure transaction table supports affiliate_commission type
-- (No action needed if using TEXT type for transactions.type)

-- ========================================
-- ROLLBACK (if needed)
-- ========================================

-- DROP TABLE IF EXISTS affiliate_commissions;
-- DROP TABLE IF EXISTS settings;
-- DROP TABLE IF EXISTS user_bans;
-- ALTER TABLE users DROP COLUMN referralCode; (not supported in SQLite)
-- ALTER TABLE users DROP COLUMN referredBy; (not supported in SQLite)

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check affiliate_commissions table
-- SELECT * FROM affiliate_commissions LIMIT 10;

-- Check users have referral codes
-- SELECT id, username, referralCode, referredBy FROM users LIMIT 10;

-- Check commission stats
-- SELECT
--   level,
--   COUNT(*) as total_commissions,
--   SUM(amount) as total_amount,
--   AVG(amount) as avg_amount
-- FROM affiliate_commissions
-- GROUP BY level
-- ORDER BY level;
