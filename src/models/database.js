const mysql = require('mysql2/promise');
require('dotenv').config();

// Alternative hosts for InfinityFree MySQL (DNS fallback)
const MYSQL_HOSTS = [
    process.env.MYSQL_HOST || 'sql306.infinityfree.com',
    'sql306.epizy.com',
    'sql306.unaux.com',
    // Add IP address fallback if available
    process.env.MYSQL_HOST_IP
].filter(Boolean);

let pool = null;
let isConnected = false;

async function createResilientPool() {
    const baseConfig = {
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS,
        database: process.env.MYSQL_DB,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        acquireTimeout: 30000,
        timeout: 30000,
        reconnect: true,
        charset: 'utf8mb4',
        // Additional resilience settings
        connectTimeout: 60000,
        idleTimeout: 300000,
        maxIdle: 5,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    };

    console.log('🔍 Attempting to connect to MySQL with DNS fallback...');
    
    for (const host of MYSQL_HOSTS) {
        try {
            console.log(`🔍 Trying MySQL host: ${host}`);
            
            const testPool = mysql.createPool({
                ...baseConfig,
                host: host
            });

            // Test the connection with timeout
            const connection = await Promise.race([
                testPool.getConnection(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 15000)
                )
            ]);
            
            await connection.ping();
            connection.release();

            console.log(`✅ MySQL connected successfully to: ${host}`);
            isConnected = true;
            return testPool;

        } catch (error) {
            console.log(`❌ MySQL host failed: ${host} - ${error.code || error.message}`);
            if (error.code === 'ENOTFOUND') {
                console.log('💡 DNS resolution failed - try running: node fix-mysql.js');
            }
        }
    }

    throw new Error('All MySQL hosts failed to connect - check DNS settings');
}

// Initialize pool with comprehensive error handling
async function initializePool() {
    if (pool && isConnected) return pool;
    
    try {
        pool = await createResilientPool();
        return pool;
    } catch (error) {
        console.error('❌ Failed to create MySQL pool:', error.message);
        console.log('🔧 Quick fix: Run "bash quick-fix.sh" or "node fix-mysql.js"');
        
        // Create a graceful fallback pool
        isConnected = false;
        pool = {
            execute: async (query, params) => {
                throw new Error(`Database unavailable: ${error.message}`);
            },
            getConnection: async () => {
                throw new Error(`Database unavailable: ${error.message}`);
            },
            end: async () => {},
            // Add status check method
            isHealthy: () => false
        };
        
        return pool;
    }
}

// Get pool with automatic retry
async function getPool() {
    if (!pool || !isConnected) {
        return await initializePool();
    }
    return pool;
}

// Health check function
async function checkDatabaseHealth() {
    try {
        const currentPool = await getPool();
        if (!isConnected) return false;
        
        const connection = await currentPool.getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (error) {
        console.log('❌ Database health check failed:', error.message);
        isConnected = false;
        return false;
    }
}

module.exports = { 
    pool: getPool(),
    getPool,
    initializePool,
    checkDatabaseHealth,
    isConnected: () => isConnected
};

// Initialize database tables
async function initDatabase() {
    try {
        const connection = await getPool().getConnection();
        
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
