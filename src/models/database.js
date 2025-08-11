const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize database tables
async function initDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Punishments table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS punishments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                caseID VARCHAR(20) UNIQUE NOT NULL,
                userID VARCHAR(20) NOT NULL,
                modID VARCHAR(20) NOT NULL,
                guildID VARCHAR(20) NOT NULL,
                type VARCHAR(20) NOT NULL,
                reason TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                appealStatus VARCHAR(20) DEFAULT 'none',
                appealReason TEXT,
                appealReviewed BOOLEAN DEFAULT FALSE
            )
        `);

        // Guild configs table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS guild_configs (
                guildID VARCHAR(20) PRIMARY KEY,
                prefix VARCHAR(10) DEFAULT '!',
                modLogChannel VARCHAR(20),
                appealsChannel VARCHAR(20),
                allowedRoles JSON,
                automodLevel VARCHAR(20) DEFAULT 'medium',
                automodConfig JSON
            )
        `);

        // Tickets table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticketID VARCHAR(20) UNIQUE NOT NULL,
                userID VARCHAR(20) NOT NULL,
                guildID VARCHAR(20) NOT NULL,
                channelID VARCHAR(20) NOT NULL,
                categoryID VARCHAR(20),
                status VARCHAR(20) DEFAULT 'open',
                reason TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closedAt TIMESTAMP NULL
            )
        `);

        // User notes table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userID VARCHAR(20) NOT NULL,
                guildID VARCHAR(20) NOT NULL,
                modID VARCHAR(20) NOT NULL,
                note TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Threat scores table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS threat_scores (
                userID VARCHAR(20) NOT NULL,
                guildID VARCHAR(20) NOT NULL,
                score INT DEFAULT 0,
                lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (userID, guildID)
            )
        `);

        // Economy table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS user_economy (
                userID VARCHAR(20) NOT NULL,
                guildID VARCHAR(20) NOT NULL,
                balance BIGINT DEFAULT 100,
                bank BIGINT DEFAULT 0,
                level INT DEFAULT 1,
                xp INT DEFAULT 0,
                lastDaily TIMESTAMP NULL,
                lastWork TIMESTAMP NULL,
                PRIMARY KEY (userID, guildID)
            )
        `);

        // Verification table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS verification (
                userID VARCHAR(20) NOT NULL,
                guildID VARCHAR(20) NOT NULL,
                code VARCHAR(10),
                verified BOOLEAN DEFAULT FALSE,
                attempts INT DEFAULT 0,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (userID, guildID)
            )
        `);

        // Appeal forms configuration
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS appeal_forms (
                guildID VARCHAR(20) PRIMARY KEY,
                questions JSON,
                enabled BOOLEAN DEFAULT TRUE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        connection.release();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

module.exports = { pool, initDatabase };
