const { pool } = require('../models/database');

/**
 * MySQL-based ThreatScore Management
 * Replaces the old MongoDB ThreatScore schema
 */

class ThreatScore {
    static async create(threatData) {
        try {
            const { userID, guildID, score = 0, reason = null } = threatData;
            
            const [result] = await pool.execute(
                'INSERT INTO threat_scores (userID, guildID, score, reason, lastIncrement, createdAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
                [userID, guildID, score, reason]
            );
            
            return {
                id: result.insertId,
                userID,
                guildID,
                score,
                reason,
                lastIncrement: new Date(),
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating threat score:', error);
            throw error;
        }
    }

    static async findByUserId(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM threat_scores WHERE userID = ? AND guildID = ?',
                [userID, guildID]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding threat score by user ID:', error);
            return null;
        }
    }

    static async findOrCreate(userID, guildID) {
        try {
            let threatScore = await this.findByUserId(userID, guildID);
            
            if (!threatScore) {
                threatScore = await this.create({ userID, guildID, score: 0 });
            }
            
            return threatScore;
        } catch (error) {
            console.error('Error finding or creating threat score:', error);
            return { userID, guildID, score: 0, lastIncrement: new Date() };
        }
    }

    static async updateScore(userID, guildID, newScore, reason = null) {
        try {
            const [result] = await pool.execute(
                'UPDATE threat_scores SET score = ?, reason = ?, lastIncrement = NOW() WHERE userID = ? AND guildID = ?',
                [newScore, reason, userID, guildID]
            );
            
            if (result.affectedRows === 0) {
                // Create if doesn't exist
                return await this.create({ userID, guildID, score: newScore, reason });
            }
            
            return await this.findByUserId(userID, guildID);
        } catch (error) {
            console.error('Error updating threat score:', error);
            return null;
        }
    }

    static async incrementScore(userID, guildID, amount = 1, reason = null) {
        try {
            const current = await this.findOrCreate(userID, guildID);
            const newScore = current.score + amount;
            
            return await this.updateScore(userID, guildID, newScore, reason);
        } catch (error) {
            console.error('Error incrementing threat score:', error);
            return null;
        }
    }

    static async decrementScore(userID, guildID, amount = 1, reason = null) {
        try {
            const current = await this.findOrCreate(userID, guildID);
            const newScore = Math.max(0, current.score - amount);
            
            return await this.updateScore(userID, guildID, newScore, reason);
        } catch (error) {
            console.error('Error decrementing threat score:', error);
            return null;
        }
    }

    static async resetScore(userID, guildID, reason = 'Manual reset') {
        try {
            return await this.updateScore(userID, guildID, 0, reason);
        } catch (error) {
            console.error('Error resetting threat score:', error);
            return null;
        }
    }

    static async findByGuildId(guildID, limit = 50) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM threat_scores WHERE guildID = ? ORDER BY score DESC, lastIncrement DESC LIMIT ?',
                [guildID, limit]
            );
            return rows;
        } catch (error) {
            console.error('Error finding threat scores by guild ID:', error);
            return [];
        }
    }

    static async findHighRisk(guildID, threshold = 5) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM threat_scores WHERE guildID = ? AND score >= ? ORDER BY score DESC',
                [guildID, threshold]
            );
            return rows;
        } catch (error) {
            console.error('Error finding high risk users:', error);
            return [];
        }
    }

    static async delete(userID, guildID) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM threat_scores WHERE userID = ? AND guildID = ?',
                [userID, guildID]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting threat score:', error);
            return false;
        }
    }

    static async cleanupOld(guildID, daysOld = 30) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM threat_scores WHERE guildID = ? AND score = 0 AND lastIncrement < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [guildID, daysOld]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up old threat scores:', error);
            return 0;
        }
    }

    static async getStats(guildID) {
        try {
            const [totalRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM threat_scores WHERE guildID = ?',
                [guildID]
            );

            const [avgRows] = await pool.execute(
                'SELECT AVG(score) as average FROM threat_scores WHERE guildID = ? AND score > 0',
                [guildID]
            );

            const [highRiskRows] = await pool.execute(
                'SELECT COUNT(*) as highRisk FROM threat_scores WHERE guildID = ? AND score >= 5',
                [guildID]
            );

            const [mediumRiskRows] = await pool.execute(
                'SELECT COUNT(*) as mediumRisk FROM threat_scores WHERE guildID = ? AND score >= 3 AND score < 5',
                [guildID]
            );

            return {
                total: totalRows[0].total,
                average: parseFloat(avgRows[0].average || 0).toFixed(2),
                highRisk: highRiskRows[0].highRisk,
                mediumRisk: mediumRiskRows[0].mediumRisk,
                lowRisk: totalRows[0].total - highRiskRows[0].highRisk - mediumRiskRows[0].mediumRisk
            };
        } catch (error) {
            console.error('Error getting threat score stats:', error);
            return { total: 0, average: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0 };
        }
    }
}

module.exports = ThreatScore;
