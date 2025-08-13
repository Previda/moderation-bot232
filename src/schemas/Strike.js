const { pool } = require('../models/database');

/**
 * MySQL-based Strike Management
 * Replaces the old MongoDB Strike schema
 */

class Strike {
    static async create(strikeData) {
        try {
            const { userID, guildID, modID, reason, type = 'manual', expiresAt = null } = strikeData;
            
            const [result] = await pool.execute(
                'INSERT INTO user_strikes (userID, guildID, modID, reason, type, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [userID, guildID, modID, reason, type, expiresAt]
            );
            
            return {
                id: result.insertId,
                userID,
                guildID,
                modID,
                reason,
                type,
                expiresAt,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating strike:', error);
            throw error;
        }
    }

    static async findById(strikeId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM user_strikes WHERE id = ?',
                [strikeId]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding strike by ID:', error);
            return null;
        }
    }

    static async findByUserId(userID, guildID, includeExpired = false) {
        try {
            let query = 'SELECT * FROM user_strikes WHERE userID = ? AND guildID = ?';
            const params = [userID, guildID];
            
            if (!includeExpired) {
                query += ' AND (expiresAt IS NULL OR expiresAt > NOW())';
            }
            
            query += ' ORDER BY createdAt DESC';
            
            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error finding strikes by user ID:', error);
            return [];
        }
    }

    static async getActiveCount(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_strikes WHERE userID = ? AND guildID = ? AND (expiresAt IS NULL OR expiresAt > NOW())',
                [userID, guildID]
            );
            return rows[0].count;
        } catch (error) {
            console.error('Error getting active strike count:', error);
            return 0;
        }
    }

    static async findByGuildId(guildID, limit = 50) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM user_strikes WHERE guildID = ? ORDER BY createdAt DESC LIMIT ?',
                [guildID, limit]
            );
            return rows;
        } catch (error) {
            console.error('Error finding strikes by guild ID:', error);
            return [];
        }
    }

    static async findByType(guildID, type) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM user_strikes WHERE guildID = ? AND type = ? ORDER BY createdAt DESC',
                [guildID, type]
            );
            return rows;
        } catch (error) {
            console.error('Error finding strikes by type:', error);
            return [];
        }
    }

    static async delete(strikeId) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM user_strikes WHERE id = ?',
                [strikeId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting strike:', error);
            return false;
        }
    }

    static async deleteByUserId(userID, guildID, count = null) {
        try {
            let query = 'DELETE FROM user_strikes WHERE userID = ? AND guildID = ? ORDER BY createdAt DESC';
            const params = [userID, guildID];
            
            if (count) {
                query += ' LIMIT ?';
                params.push(count);
            }
            
            const [result] = await pool.execute(query, params);
            return result.affectedRows;
        } catch (error) {
            console.error('Error deleting strikes by user ID:', error);
            return 0;
        }
    }

    static async expire(strikeId) {
        try {
            const [result] = await pool.execute(
                'UPDATE user_strikes SET expiresAt = NOW() WHERE id = ?',
                [strikeId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error expiring strike:', error);
            return false;
        }
    }

    static async cleanupExpired(guildID = null) {
        try {
            let query = 'DELETE FROM user_strikes WHERE expiresAt IS NOT NULL AND expiresAt <= NOW()';
            const params = [];
            
            if (guildID) {
                query += ' AND guildID = ?';
                params.push(guildID);
            }
            
            const [result] = await pool.execute(query, params);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up expired strikes:', error);
            return 0;
        }
    }

    static async getStats(guildID) {
        try {
            const [totalRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM user_strikes WHERE guildID = ?',
                [guildID]
            );

            const [activeRows] = await pool.execute(
                'SELECT COUNT(*) as active FROM user_strikes WHERE guildID = ? AND (expiresAt IS NULL OR expiresAt > NOW())',
                [guildID]
            );

            const [typeRows] = await pool.execute(
                'SELECT type, COUNT(*) as count FROM user_strikes WHERE guildID = ? GROUP BY type',
                [guildID]
            );

            const [recentRows] = await pool.execute(
                'SELECT COUNT(*) as recent FROM user_strikes WHERE guildID = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
                [guildID]
            );

            return {
                total: totalRows[0].total,
                active: activeRows[0].active,
                byType: typeRows.reduce((acc, row) => {
                    acc[row.type] = row.count;
                    return acc;
                }, {}),
                recentWeek: recentRows[0].recent
            };
        } catch (error) {
            console.error('Error getting strike stats:', error);
            return { total: 0, active: 0, byType: {}, recentWeek: 0 };
        }
    }

    static async addAutoStrike(userID, guildID, reason, duration = null) {
        try {
            const expiresAt = duration ? new Date(Date.now() + duration) : null;
            
            return await this.create({
                userID,
                guildID,
                modID: 'SYSTEM',
                reason,
                type: 'auto',
                expiresAt
            });
        } catch (error) {
            console.error('Error adding auto strike:', error);
            return null;
        }
    }
}

module.exports = Strike;
