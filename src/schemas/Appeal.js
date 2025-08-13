const { pool } = require('../models/database');

/**
 * MySQL-based Appeal Management
 * Replaces the old MongoDB Appeal schema
 */

class Appeal {
    static async create(appealData) {
        try {
            const { 
                userID, 
                guildID, 
                caseID, 
                reason, 
                status = 'pending',
                responses = {},
                submittedAt = new Date()
            } = appealData;
            
            const [result] = await pool.execute(
                'INSERT INTO appeals (userID, guildID, caseID, reason, status, responses, submittedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                [userID, guildID, caseID, reason, status, JSON.stringify(responses), submittedAt]
            );
            
            return {
                id: result.insertId,
                userID,
                guildID,
                caseID,
                reason,
                status,
                responses,
                submittedAt,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating appeal:', error);
            throw error;
        }
    }

    static async findById(appealId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM appeals WHERE id = ?',
                [appealId]
            );
            
            if (rows.length === 0) return null;
            
            const row = rows[0];
            return {
                ...row,
                responses: row.responses ? JSON.parse(row.responses) : {}
            };
        } catch (error) {
            console.error('Error finding appeal by ID:', error);
            return null;
        }
    }

    static async findByCaseId(caseID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM appeals WHERE caseID = ? AND guildID = ?',
                [caseID, guildID]
            );
            
            if (rows.length === 0) return null;
            
            const row = rows[0];
            return {
                ...row,
                responses: row.responses ? JSON.parse(row.responses) : {}
            };
        } catch (error) {
            console.error('Error finding appeal by case ID:', error);
            return null;
        }
    }

    static async findByUserId(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM appeals WHERE userID = ? AND guildID = ? ORDER BY createdAt DESC',
                [userID, guildID]
            );
            
            return rows.map(row => ({
                ...row,
                responses: row.responses ? JSON.parse(row.responses) : {}
            }));
        } catch (error) {
            console.error('Error finding appeals by user ID:', error);
            return [];
        }
    }

    static async findByGuildId(guildID, status = null, limit = 50) {
        try {
            let query = 'SELECT * FROM appeals WHERE guildID = ?';
            const params = [guildID];
            
            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }
            
            query += ' ORDER BY createdAt DESC LIMIT ?';
            params.push(limit);
            
            const [rows] = await pool.execute(query, params);
            
            return rows.map(row => ({
                ...row,
                responses: row.responses ? JSON.parse(row.responses) : {}
            }));
        } catch (error) {
            console.error('Error finding appeals by guild ID:', error);
            return [];
        }
    }

    static async updateStatus(appealId, status, reviewedBy = null, reviewNote = null) {
        try {
            const [result] = await pool.execute(
                'UPDATE appeals SET status = ?, reviewedBy = ?, reviewNote = ?, reviewedAt = NOW(), updatedAt = NOW() WHERE id = ?',
                [status, reviewedBy, reviewNote, appealId]
            );
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating appeal status:', error);
            return false;
        }
    }

    static async updateResponses(appealId, responses) {
        try {
            const [result] = await pool.execute(
                'UPDATE appeals SET responses = ?, updatedAt = NOW() WHERE id = ?',
                [JSON.stringify(responses), appealId]
            );
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating appeal responses:', error);
            return false;
        }
    }

    static async delete(appealId) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM appeals WHERE id = ?',
                [appealId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting appeal:', error);
            return false;
        }
    }

    static async getStats(guildID) {
        try {
            const [totalRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM appeals WHERE guildID = ?',
                [guildID]
            );

            const [statusRows] = await pool.execute(
                'SELECT status, COUNT(*) as count FROM appeals WHERE guildID = ? GROUP BY status',
                [guildID]
            );

            const [recentRows] = await pool.execute(
                'SELECT COUNT(*) as recent FROM appeals WHERE guildID = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
                [guildID]
            );

            return {
                total: totalRows[0].total,
                byStatus: statusRows.reduce((acc, row) => {
                    acc[row.status] = row.count;
                    return acc;
                }, {}),
                recentWeek: recentRows[0].recent
            };
        } catch (error) {
            console.error('Error getting appeal stats:', error);
            return { total: 0, byStatus: {}, recentWeek: 0 };
        }
    }

    static async getPendingCount(guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT COUNT(*) as count FROM appeals WHERE guildID = ? AND status = "pending"',
                [guildID]
            );
            return rows[0].count;
        } catch (error) {
            console.error('Error getting pending appeal count:', error);
            return 0;
        }
    }

    static async approve(appealId, reviewedBy, reviewNote = null) {
        return await this.updateStatus(appealId, 'approved', reviewedBy, reviewNote);
    }

    static async deny(appealId, reviewedBy, reviewNote = null) {
        return await this.updateStatus(appealId, 'denied', reviewedBy, reviewNote);
    }

    static async canUserAppeal(userID, guildID, caseID) {
        try {
            const [rows] = await pool.execute(
                'SELECT COUNT(*) as count FROM appeals WHERE userID = ? AND guildID = ? AND caseID = ?',
                [userID, guildID, caseID]
            );
            
            return rows[0].count === 0; // Can appeal if no existing appeal
        } catch (error) {
            console.error('Error checking if user can appeal:', error);
            return false;
        }
    }
}

module.exports = Appeal;
