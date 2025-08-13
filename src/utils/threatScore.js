const { pool } = require('../models/database');

/**
 * MySQL-based Threat Score Management
 * Replaces the old MongoDB ThreatScore schema
 */

async function getThreatScore(userID, guildID) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM threat_scores WHERE userID = ? AND guildID = ?',
            [userID, guildID]
        );
        
        if (rows.length === 0) {
            // Create new threat score record
            await pool.execute(
                'INSERT INTO threat_scores (userID, guildID, score, lastIncrement) VALUES (?, ?, ?, NOW())',
                [userID, guildID, 0]
            );
            return { userID, guildID, score: 0, lastIncrement: new Date() };
        }
        
        return rows[0];
    } catch (error) {
        console.error('Error getting threat score:', error);
        return { userID, guildID, score: 0, lastIncrement: new Date() };
    }
}

async function incrementThreatScore(userID, guildID, amount = 1) {
    try {
        const currentScore = await getThreatScore(userID, guildID);
        const newScore = currentScore.score + amount;
        
        await pool.execute(
            'UPDATE threat_scores SET score = ?, lastIncrement = NOW() WHERE userID = ? AND guildID = ?',
            [newScore, userID, guildID]
        );
        
        return newScore;
    } catch (error) {
        console.error('Error incrementing threat score:', error);
        return 0;
    }
}

async function resetThreatScore(userID, guildID) {
    try {
        await pool.execute(
            'UPDATE threat_scores SET score = 0, lastIncrement = NOW() WHERE userID = ? AND guildID = ?',
            [userID, guildID]
        );
        return true;
    } catch (error) {
        console.error('Error resetting threat score:', error);
        return false;
    }
}

async function getAllThreatScores(guildID) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM threat_scores WHERE guildID = ? ORDER BY score DESC',
            [guildID]
        );
        return rows;
    } catch (error) {
        console.error('Error getting all threat scores:', error);
        return [];
    }
}

async function cleanupOldThreatScores(guildID, daysOld = 30) {
    try {
        await pool.execute(
            'DELETE FROM threat_scores WHERE guildID = ? AND lastIncrement < DATE_SUB(NOW(), INTERVAL ? DAY)',
            [guildID, daysOld]
        );
        return true;
    } catch (error) {
        console.error('Error cleaning up threat scores:', error);
        return false;
    }
}

module.exports = {
    getThreatScore,
    incrementThreatScore,
    resetThreatScore,
    getAllThreatScores,
    cleanupOldThreatScores
};
