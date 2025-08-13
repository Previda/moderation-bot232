const { pool } = require('./database');

/**
 * Initialize all MySQL tables for the bot
 * Run this once to set up the database structure
 */

async function initializeDatabase() {
    try {
        console.log('🗄️ Initializing MySQL database tables...');

        // Tickets table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticketID VARCHAR(255) UNIQUE NOT NULL,
                userID VARCHAR(255) NOT NULL,
                guildID VARCHAR(255) NOT NULL,
                channelID VARCHAR(255),
                category VARCHAR(100) DEFAULT 'general',
                reason TEXT,
                status ENUM('open', 'closed', 'archived') DEFAULT 'open',
                participants JSON,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                closedAt TIMESTAMP NULL,
                closedBy VARCHAR(255),
                closeReason TEXT,
                INDEX idx_user_guild (userID, guildID),
                INDEX idx_guild_status (guildID, status),
                INDEX idx_channel (channelID)
            )
        `);

        // Notes table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userID VARCHAR(255) NOT NULL,
                guildID VARCHAR(255) NOT NULL,
                modID VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                type ENUM('note', 'warning', 'commendation') DEFAULT 'note',
                private BOOLEAN DEFAULT false,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_guild (userID, guildID),
                INDEX idx_mod (modID),
                INDEX idx_type (type)
            )
        `);

        // Strikes table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS strikes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userID VARCHAR(255) NOT NULL,
                guildID VARCHAR(255) NOT NULL,
                modID VARCHAR(255) NOT NULL,
                reason TEXT NOT NULL,
                severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                active BOOLEAN DEFAULT true,
                expiresAt TIMESTAMP NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_guild (userID, guildID),
                INDEX idx_active (active),
                INDEX idx_expires (expiresAt)
            )
        `);

        // Invites table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS invites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inviteCode VARCHAR(255) UNIQUE NOT NULL,
                guildID VARCHAR(255) NOT NULL,
                inviterID VARCHAR(255) NOT NULL,
                channelID VARCHAR(255),
                uses INT DEFAULT 0,
                maxUses INT DEFAULT 0,
                maxAge INT DEFAULT 0,
                temporary BOOLEAN DEFAULT false,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                expiresAt TIMESTAMP NULL,
                INDEX idx_guild (guildID),
                INDEX idx_inviter (inviterID),
                INDEX idx_code (inviteCode)
            )
        `);

        // Threat Scores table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS threat_scores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userID VARCHAR(255) NOT NULL,
                guildID VARCHAR(255) NOT NULL,
                score INT DEFAULT 0,
                lastIncrement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reasons JSON,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_guild (userID, guildID),
                INDEX idx_score (score),
                INDEX idx_guild (guildID)
            )
        `);

        // Automod Configs table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS automod_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guildID VARCHAR(255) UNIQUE NOT NULL,
                antiSpam BOOLEAN DEFAULT true,
                antiInvite BOOLEAN DEFAULT true,
                antiNSFW BOOLEAN DEFAULT true,
                capsFlood BOOLEAN DEFAULT true,
                emojiFlood BOOLEAN DEFAULT false,
                warnThreshold INT DEFAULT 3,
                muteThreshold INT DEFAULT 5,
                muteDuration INT DEFAULT 600,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_guild (guildID)
            )
        `);

        // Appeal Questions table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS appeal_questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guildID VARCHAR(255) NOT NULL,
                question TEXT NOT NULL,
                type ENUM('text', 'textarea', 'select', 'radio', 'checkbox') DEFAULT 'text',
                required BOOLEAN DEFAULT true,
                options JSON,
                order_num INT DEFAULT 1,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_guild_order (guildID, order_num)
            )
        `);

        // Appeals table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS appeals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userID VARCHAR(255) NOT NULL,
                guildID VARCHAR(255) NOT NULL,
                caseID VARCHAR(255),
                reason TEXT,
                status ENUM('pending', 'approved', 'denied', 'cancelled') DEFAULT 'pending',
                responses JSON,
                submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewedBy VARCHAR(255),
                reviewNote TEXT,
                reviewedAt TIMESTAMP NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_guild (userID, guildID),
                INDEX idx_case (caseID),
                INDEX idx_status (status)
            )
        `);

        // Pi Runners table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS pi_runners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guildID VARCHAR(255) NOT NULL,
                userID VARCHAR(255) NOT NULL,
                command VARCHAR(500) NOT NULL,
                args JSON,
                status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
                output TEXT,
                error TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                completedAt TIMESTAMP NULL,
                INDEX idx_guild_user (guildID, userID),
                INDEX idx_status (status)
            )
        `);

        // Punishments table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS punishments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userID VARCHAR(255) NOT NULL,
                guildID VARCHAR(255) NOT NULL,
                modID VARCHAR(255) NOT NULL,
                type ENUM('warn', 'mute', 'kick', 'ban', 'softban', 'timeout') NOT NULL,
                reason TEXT,
                caseID VARCHAR(255) UNIQUE,
                duration INT,
                active BOOLEAN DEFAULT true,
                evidence TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_guild (userID, guildID),
                INDEX idx_mod (modID),
                INDEX idx_type (type),
                INDEX idx_case (caseID),
                INDEX idx_active (active)
            )
        `);

        // Verifications table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS verifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userID VARCHAR(255) NOT NULL,
                guildID VARCHAR(255) NOT NULL,
                code VARCHAR(50) NOT NULL,
                type ENUM('email', 'phone', 'captcha') DEFAULT 'email',
                status ENUM('pending', 'verified', 'expired', 'failed') DEFAULT 'pending',
                attempts INT DEFAULT 0,
                maxAttempts INT DEFAULT 3,
                email VARCHAR(255),
                phone VARCHAR(50),
                expiresAt TIMESTAMP,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_guild (userID, guildID),
                INDEX idx_code (code),
                INDEX idx_status (status)
            )
        `);

        // Guild Configs table (for general bot settings)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS guild_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guildID VARCHAR(255) UNIQUE NOT NULL,
                modLogChannel VARCHAR(255),
                appealsChannel VARCHAR(255),
                welcomeChannel VARCHAR(255),
                rulesChannel VARCHAR(255),
                muteRole VARCHAR(255),
                prefix VARCHAR(10) DEFAULT '!',
                automod BOOLEAN DEFAULT true,
                logActions BOOLEAN DEFAULT true,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_guild (guildID)
            )
        `);

        console.log('✅ Database tables initialized successfully!');
        console.log('📊 Created tables: tickets, notes, strikes, invites, threat_scores, automod_configs, appeal_questions, appeals, pi_runners, punishments, verifications, guild_configs');
        
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        throw error;
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('🎉 Database initialization complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase };
