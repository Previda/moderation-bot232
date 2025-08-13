const { pool } = require('../models/database');

/**
 * MySQL-based Verification Management
 * Replaces the old MongoDB Verification schema
 */

class Verification {
    static async create(verificationData) {
        try {
            const { 
                userID, 
                guildID, 
                code, 
                type = 'email',
                status = 'pending',
                attempts = 0,
                maxAttempts = 3,
                expiresAt = null
            } = verificationData;
            
            const [result] = await pool.execute(
                'INSERT INTO verifications (userID, guildID, code, type, status, attempts, maxAttempts, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [userID, guildID, code, type, status, attempts, maxAttempts, expiresAt]
            );
            
            return {
                id: result.insertId,
                userID,
                guildID,
                code,
                type,
                status,
                attempts,
                maxAttempts,
                expiresAt,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating verification:', error);
            throw error;
        }
    }

    static async findById(verificationId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM verifications WHERE id = ?',
                [verificationId]
            );
            
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding verification by ID:', error);
            return null;
        }
    }

    static async findByUserId(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM verifications WHERE userID = ? AND guildID = ? ORDER BY createdAt DESC',
                [userID, guildID]
            );
            
            return rows;
        } catch (error) {
            console.error('Error finding verifications by user ID:', error);
            return [];
        }
    }

    static async findByCode(code, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM verifications WHERE code = ? AND guildID = ? AND status = "pending"',
                [code, guildID]
            );
            
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding verification by code:', error);
            return null;
        }
    }

    static async findPending(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM verifications WHERE userID = ? AND guildID = ? AND status = "pending" ORDER BY createdAt DESC LIMIT 1',
                [userID, guildID]
            );
            
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding pending verification:', error);
            return null;
        }
    }

    static async updateStatus(verificationId, status) {
        try {
            const [result] = await pool.execute(
                'UPDATE verifications SET status = ?, updatedAt = NOW() WHERE id = ?',
                [status, verificationId]
            );
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating verification status:', error);
            return false;
        }
    }

    static async incrementAttempts(verificationId) {
        try {
            const [result] = await pool.execute(
                'UPDATE verifications SET attempts = attempts + 1, updatedAt = NOW() WHERE id = ?',
                [verificationId]
            );
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error incrementing verification attempts:', error);
            return false;
        }
    }

    static async verify(code, guildID) {
        try {
            const verification = await this.findByCode(code, guildID);
            
            if (!verification) {
                return { success: false, reason: 'Invalid code' };
            }
            
            if (verification.expiresAt && new Date() > new Date(verification.expiresAt)) {
                await this.updateStatus(verification.id, 'expired');
                return { success: false, reason: 'Code expired' };
            }
            
            if (verification.attempts >= verification.maxAttempts) {
                await this.updateStatus(verification.id, 'failed');
                return { success: false, reason: 'Too many attempts' };
            }
            
            await this.updateStatus(verification.id, 'verified');
            return { success: true, verification };
        } catch (error) {
            console.error('Error verifying code:', error);
            return { success: false, reason: 'Verification error' };
        }
    }

    static async failAttempt(code, guildID) {
        try {
            const verification = await this.findByCode(code, guildID);
            
            if (!verification) {
                return false;
            }
            
            await this.incrementAttempts(verification.id);
            
            if (verification.attempts + 1 >= verification.maxAttempts) {
                await this.updateStatus(verification.id, 'failed');
            }
            
            return true;
        } catch (error) {
            console.error('Error failing verification attempt:', error);
            return false;
        }
    }

    static async delete(verificationId) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM verifications WHERE id = ?',
                [verificationId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting verification:', error);
            return false;
        }
    }

    static async cleanup(guildID, daysOld = 7) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM verifications WHERE guildID = ? AND (status != "pending" OR createdAt < DATE_SUB(NOW(), INTERVAL ? DAY))',
                [guildID, daysOld]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up old verifications:', error);
            return 0;
        }
    }

    static async expireOld() {
        try {
            const [result] = await pool.execute(
                'UPDATE verifications SET status = "expired" WHERE status = "pending" AND expiresAt IS NOT NULL AND expiresAt <= NOW()'
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error expiring old verifications:', error);
            return 0;
        }
    }

    static async getStats(guildID) {
        try {
            const [totalRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM verifications WHERE guildID = ?',
                [guildID]
            );

            const [statusRows] = await pool.execute(
                'SELECT status, COUNT(*) as count FROM verifications WHERE guildID = ? GROUP BY status',
                [guildID]
            );

            const [typeRows] = await pool.execute(
                'SELECT type, COUNT(*) as count FROM verifications WHERE guildID = ? GROUP BY type',
                [guildID]
            );

            const [recentRows] = await pool.execute(
                'SELECT COUNT(*) as recent FROM verifications WHERE guildID = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)',
                [guildID]
            );

            return {
                total: totalRows[0].total,
                byStatus: statusRows.reduce((acc, row) => {
                    acc[row.status] = row.count;
                    return acc;
                }, {}),
                byType: typeRows.reduce((acc, row) => {
                    acc[row.type] = row.count;
                    return acc;
                }, {}),
                recent24h: recentRows[0].recent
            };
        } catch (error) {
            console.error('Error getting verification stats:', error);
            return { total: 0, byStatus: {}, byType: {}, recent24h: 0 };
        }
    }

    static generateCode(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    static async createEmailVerification(userID, guildID, email) {
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        return await this.create({
            userID,
            guildID,
            code,
            type: 'email',
            expiresAt,
            email
        });
    }

    static async createPhoneVerification(userID, guildID, phone) {
        const code = this.generateCode(4); // Shorter code for SMS
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        return await this.create({
            userID,
            guildID,
            code,
            type: 'phone',
            expiresAt,
            phone
        });
    }

    static async isUserVerified(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT COUNT(*) as count FROM verifications WHERE userID = ? AND guildID = ? AND status = "verified"',
                [userID, guildID]
            );
            
            return rows[0].count > 0;
        } catch (error) {
            console.error('Error checking if user is verified:', error);
            return false;
        }
    }
}

module.exports = Verification;
