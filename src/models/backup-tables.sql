-- Backup System Database Tables
-- Run this to create backup-related tables

-- Backup schedules table
CREATE TABLE IF NOT EXISTS backup_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guildID VARCHAR(255) NOT NULL,
    frequency ENUM('daily', 'weekly', 'monthly') NOT NULL,
    channelID VARCHAR(255),
    nextBackup TIMESTAMP NOT NULL,
    active BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_guild (guildID),
    INDEX idx_next_backup (nextBackup, active)
);

-- Backup history table
CREATE TABLE IF NOT EXISTS backup_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backupId VARCHAR(255) UNIQUE NOT NULL,
    guildID VARCHAR(255) NOT NULL,
    type ENUM('full', 'database', 'config', 'users', 'emergency') NOT NULL,
    filename VARCHAR(500),
    size BIGINT DEFAULT 0,
    status ENUM('created', 'uploaded', 'failed') DEFAULT 'created',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guild_date (guildID, createdAt),
    INDEX idx_backup_id (backupId)
);

-- User economy table (ensure it exists for /work command)
CREATE TABLE IF NOT EXISTS user_economy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userID VARCHAR(255) NOT NULL,
    guildID VARCHAR(255) NOT NULL,
    balance BIGINT DEFAULT 0,
    level INT DEFAULT 1,
    xp BIGINT DEFAULT 0,
    lastDaily TIMESTAMP NULL,
    lastWork TIMESTAMP NULL,
    totalEarned BIGINT DEFAULT 0,
    totalSpent BIGINT DEFAULT 0,
    streak INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_guild (userID, guildID),
    INDEX idx_balance (balance),
    INDEX idx_level (level),
    INDEX idx_guild (guildID)
);

-- Disaster recovery log
CREATE TABLE IF NOT EXISTS disaster_recovery_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guildID VARCHAR(255) NOT NULL,
    event_type ENUM('backup_created', 'backup_restored', 'migration', 'emergency_reset') NOT NULL,
    details JSON,
    performed_by VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_guild_event (guildID, event_type),
    INDEX idx_timestamp (timestamp)
);

-- Backup encryption keys (for secure backups)
CREATE TABLE IF NOT EXISTS backup_encryption (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guildID VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    UNIQUE KEY unique_guild_active (guildID, active),
    INDEX idx_guild (guildID)
);
