const { pool } = require('../models/database');

/**
 * MySQL-based Invite Management
 * Replaces the old MongoDB Invite schema
 */

class Invite {
    static async create(inviteData) {
        try {
            const { 
                guildID, 
                code, 
                userID, 
                reason, 
                expiresAt = null, 
                maxUses = null, 
                temporary = false,
                type = 'manual'
            } = inviteData;
            
            const [result] = await pool.execute(
                'INSERT INTO guild_invites (guildID, code, userID, reason, expiresAt, maxUses, temporary, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [guildID, code, userID, reason, expiresAt, maxUses, temporary, type]
            );
            
            return {
                id: result.insertId,
                guildID,
                code,
                userID,
                reason,
                expiresAt,
                maxUses,
                temporary,
                type,
                uses: 0,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating invite:', error);
            throw error;
        }
    }

    static async findByCode(code) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM guild_invites WHERE code = ?',
                [code]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding invite by code:', error);
            return null;
        }
    }

    static async findByGuildId(guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM guild_invites WHERE guildID = ? ORDER BY createdAt DESC',
                [guildID]
            );
            return rows;
        } catch (error) {
            console.error('Error finding invites by guild ID:', error);
            return [];
        }
    }

    static async findByUserId(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM guild_invites WHERE userID = ? AND guildID = ? ORDER BY createdAt DESC',
                [userID, guildID]
            );
            return rows;
        } catch (error) {
            console.error('Error finding invites by user ID:', error);
            return [];
        }
    }

    static async incrementUse(code) {
        try {
            const [result] = await pool.execute(
                'UPDATE guild_invites SET uses = uses + 1, lastUsed = NOW() WHERE code = ?',
                [code]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error incrementing invite use:', error);
            return false;
        }
    }

    static async delete(code) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM guild_invites WHERE code = ?',
                [code]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting invite:', error);
            return false;
        }
    }

    static async deleteByUserId(userID, guildID) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM guild_invites WHERE userID = ? AND guildID = ?',
                [userID, guildID]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error deleting invites by user ID:', error);
            return 0;
        }
    }

    static async cleanupExpired(guildID = null) {
        try {
            let query = 'DELETE FROM guild_invites WHERE expiresAt IS NOT NULL AND expiresAt <= NOW()';
            const params = [];
            
            if (guildID) {
                query += ' AND guildID = ?';
                params.push(guildID);
            }
            
            const [result] = await pool.execute(query, params);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up expired invites:', error);
            return 0;
        }
    }

    static async cleanupMaxUses(guildID = null) {
        try {
            let query = 'DELETE FROM guild_invites WHERE maxUses IS NOT NULL AND uses >= maxUses';
            const params = [];
            
            if (guildID) {
                query += ' AND guildID = ?';
                params.push(guildID);
            }
            
            const [result] = await pool.execute(query, params);
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up max uses invites:', error);
            return 0;
        }
    }

    static async getStats(guildID) {
        try {
            const [totalRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM guild_invites WHERE guildID = ?',
                [guildID]
            );

            const [activeRows] = await pool.execute(
                'SELECT COUNT(*) as active FROM guild_invites WHERE guildID = ? AND (expiresAt IS NULL OR expiresAt > NOW()) AND (maxUses IS NULL OR uses < maxUses)',
                [guildID]
            );

            const [usesRows] = await pool.execute(
                'SELECT SUM(uses) as totalUses FROM guild_invites WHERE guildID = ?',
                [guildID]
            );

            const [typeRows] = await pool.execute(
                'SELECT type, COUNT(*) as count FROM guild_invites WHERE guildID = ? GROUP BY type',
                [guildID]
            );

            return {
                total: totalRows[0].total,
                active: activeRows[0].active,
                totalUses: usesRows[0].totalUses || 0,
                byType: typeRows.reduce((acc, row) => {
                    acc[row.type] = row.count;
                    return acc;
                }, {})
            };
        } catch (error) {
            console.error('Error getting invite stats:', error);
            return { total: 0, active: 0, totalUses: 0, byType: {} };
        }
    }

    static async createOneTime(guildID, userID, reason, expiresInHours = 24) {
        try {
            const code = 'OT-' + Math.random().toString(36).substring(2, 15);
            const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
            
            return await this.create({
                guildID,
                code,
                userID,
                reason,
                expiresAt,
                maxUses: 1,
                temporary: true,
                type: 'onetime'
            });
        } catch (error) {
            console.error('Error creating one-time invite:', error);
            return null;
        }
    }
}

module.exports = Invite;
