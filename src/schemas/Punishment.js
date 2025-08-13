const { pool } = require('../models/database');

/**
 * MySQL-based Punishment Management
 * Replaces the old MongoDB Punishment schema
 */

class Punishment {
    static async create(punishmentData) {
        try {
            const { 
                userID, 
                guildID, 
                modID, 
                type, 
                reason, 
                caseID,
                duration = null,
                active = true,
                evidence = null
            } = punishmentData;
            
            const [result] = await pool.execute(
                'INSERT INTO punishments (userID, guildID, modID, type, reason, caseID, duration, active, evidence, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [userID, guildID, modID, type, reason, caseID, duration, active, evidence]
            );
            
            return {
                id: result.insertId,
                userID,
                guildID,
                modID,
                type,
                reason,
                caseID,
                duration,
                active,
                evidence,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating punishment:', error);
            throw error;
        }
    }

    static async findById(punishmentId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM punishments WHERE id = ?',
                [punishmentId]
            );
            
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding punishment by ID:', error);
            return null;
        }
    }

    static async findByCaseId(caseID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM punishments WHERE caseID = ? AND guildID = ?',
                [caseID, guildID]
            );
            
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding punishment by case ID:', error);
            return null;
        }
    }

    static async findByUserId(userID, guildID, limit = 50) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM punishments WHERE userID = ? AND guildID = ? ORDER BY createdAt DESC LIMIT ?',
                [userID, guildID, limit]
            );
            
            return rows;
        } catch (error) {
            console.error('Error finding punishments by user ID:', error);
            return [];
        }
    }

    static async findByGuildId(guildID, limit = 100) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM punishments WHERE guildID = ? ORDER BY createdAt DESC LIMIT ?',
                [guildID, limit]
            );
            
            return rows;
        } catch (error) {
            console.error('Error finding punishments by guild ID:', error);
            return [];
        }
    }

    static async findByModId(modID, guildID, limit = 50) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM punishments WHERE modID = ? AND guildID = ? ORDER BY createdAt DESC LIMIT ?',
                [modID, guildID, limit]
            );
            
            return rows;
        } catch (error) {
            console.error('Error finding punishments by mod ID:', error);
            return [];
        }
    }

    static async findByType(type, guildID, limit = 50) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM punishments WHERE type = ? AND guildID = ? ORDER BY createdAt DESC LIMIT ?',
                [type, guildID, limit]
            );
            
            return rows;
        } catch (error) {
            console.error('Error finding punishments by type:', error);
            return [];
        }
    }

    static async findActive(guildID, type = null) {
        try {
            let query = 'SELECT * FROM punishments WHERE guildID = ? AND active = true';
            const params = [guildID];
            
            if (type) {
                query += ' AND type = ?';
                params.push(type);
            }
            
            query += ' ORDER BY createdAt DESC';
            
            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error finding active punishments:', error);
            return [];
        }
    }

    static async update(punishmentId, updateData) {
        try {
            const fields = [];
            const values = [];
            
            for (const [key, value] of Object.entries(updateData)) {
                if (key !== 'id') {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }
            
            values.push(punishmentId);
            
            const [result] = await pool.execute(
                `UPDATE punishments SET ${fields.join(', ')}, updatedAt = NOW() WHERE id = ?`,
                values
            );
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating punishment:', error);
            return false;
        }
    }

    static async deactivate(punishmentId) {
        return await this.update(punishmentId, { active: false });
    }

    static async activate(punishmentId) {
        return await this.update(punishmentId, { active: true });
    }

    static async delete(punishmentId) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM punishments WHERE id = ?',
                [punishmentId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting punishment:', error);
            return false;
        }
    }

    static async getStats(guildID) {
        try {
            const [totalRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM punishments WHERE guildID = ?',
                [guildID]
            );

            const [typeRows] = await pool.execute(
                'SELECT type, COUNT(*) as count FROM punishments WHERE guildID = ? GROUP BY type',
                [guildID]
            );

            const [activeRows] = await pool.execute(
                'SELECT COUNT(*) as active FROM punishments WHERE guildID = ? AND active = true',
                [guildID]
            );

            const [recentRows] = await pool.execute(
                'SELECT COUNT(*) as recent FROM punishments WHERE guildID = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
                [guildID]
            );

            const [modRows] = await pool.execute(
                'SELECT modID, COUNT(*) as count FROM punishments WHERE guildID = ? GROUP BY modID ORDER BY count DESC LIMIT 10',
                [guildID]
            );

            return {
                total: totalRows[0].total,
                byType: typeRows.reduce((acc, row) => {
                    acc[row.type] = row.count;
                    return acc;
                }, {}),
                active: activeRows[0].active,
                recentWeek: recentRows[0].recent,
                topMods: modRows
            };
        } catch (error) {
            console.error('Error getting punishment stats:', error);
            return { total: 0, byType: {}, active: 0, recentWeek: 0, topMods: [] };
        }
    }

    static async getModStats(modID, guildID) {
        try {
            const [totalRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM punishments WHERE modID = ? AND guildID = ?',
                [modID, guildID]
            );

            const [typeRows] = await pool.execute(
                'SELECT type, COUNT(*) as count FROM punishments WHERE modID = ? AND guildID = ? GROUP BY type',
                [modID, guildID]
            );

            const [recentRows] = await pool.execute(
                'SELECT COUNT(*) as recent FROM punishments WHERE modID = ? AND guildID = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
                [modID, guildID]
            );

            return {
                total: totalRows[0].total,
                byType: typeRows.reduce((acc, row) => {
                    acc[row.type] = row.count;
                    return acc;
                }, {}),
                recentMonth: recentRows[0].recent
            };
        } catch (error) {
            console.error('Error getting mod stats:', error);
            return { total: 0, byType: {}, recentMonth: 0 };
        }
    }

    static async getUserPunishmentCount(userID, guildID, type = null) {
        try {
            let query = 'SELECT COUNT(*) as count FROM punishments WHERE userID = ? AND guildID = ?';
            const params = [userID, guildID];
            
            if (type) {
                query += ' AND type = ?';
                params.push(type);
            }
            
            const [rows] = await pool.execute(query, params);
            return rows[0].count;
        } catch (error) {
            console.error('Error getting user punishment count:', error);
            return 0;
        }
    }

    static async cleanup(guildID, daysOld = 365) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM punishments WHERE guildID = ? AND active = false AND createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [guildID, daysOld]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up old punishments:', error);
            return 0;
        }
    }

    static async expireTemporary() {
        try {
            const [result] = await pool.execute(
                'UPDATE punishments SET active = false WHERE active = true AND duration IS NOT NULL AND DATE_ADD(createdAt, INTERVAL duration SECOND) <= NOW()'
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error expiring temporary punishments:', error);
            return 0;
        }
    }
}

module.exports = Punishment;
