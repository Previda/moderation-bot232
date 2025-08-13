const { pool } = require('../models/database');

/**
 * MySQL-based PiRunner Management
 * Replaces the old MongoDB PiRunner schema
 */

class PiRunner {
    static async create(runnerData) {
        try {
            const { 
                guildID, 
                userID, 
                command, 
                args = [], 
                status = 'pending',
                output = null,
                error = null
            } = runnerData;
            
            const [result] = await pool.execute(
                'INSERT INTO pi_runners (guildID, userID, command, args, status, output, error, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                [guildID, userID, command, JSON.stringify(args), status, output, error]
            );
            
            return {
                id: result.insertId,
                guildID,
                userID,
                command,
                args,
                status,
                output,
                error,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating pi runner:', error);
            throw error;
        }
    }

    static async findById(runnerId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM pi_runners WHERE id = ?',
                [runnerId]
            );
            
            if (rows.length === 0) return null;
            
            const row = rows[0];
            return {
                ...row,
                args: row.args ? JSON.parse(row.args) : []
            };
        } catch (error) {
            console.error('Error finding pi runner by ID:', error);
            return null;
        }
    }

    static async findByGuildId(guildID, limit = 50) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM pi_runners WHERE guildID = ? ORDER BY createdAt DESC LIMIT ?',
                [guildID, limit]
            );
            
            return rows.map(row => ({
                ...row,
                args: row.args ? JSON.parse(row.args) : []
            }));
        } catch (error) {
            console.error('Error finding pi runners by guild ID:', error);
            return [];
        }
    }

    static async findByUserId(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM pi_runners WHERE userID = ? AND guildID = ? ORDER BY createdAt DESC',
                [userID, guildID]
            );
            
            return rows.map(row => ({
                ...row,
                args: row.args ? JSON.parse(row.args) : []
            }));
        } catch (error) {
            console.error('Error finding pi runners by user ID:', error);
            return [];
        }
    }

    static async findByStatus(guildID, status) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM pi_runners WHERE guildID = ? AND status = ? ORDER BY createdAt DESC',
                [guildID, status]
            );
            
            return rows.map(row => ({
                ...row,
                args: row.args ? JSON.parse(row.args) : []
            }));
        } catch (error) {
            console.error('Error finding pi runners by status:', error);
            return [];
        }
    }

    static async updateStatus(runnerId, status, output = null, error = null) {
        try {
            const [result] = await pool.execute(
                'UPDATE pi_runners SET status = ?, output = ?, error = ?, completedAt = NOW(), updatedAt = NOW() WHERE id = ?',
                [status, output, error, runnerId]
            );
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating pi runner status:', error);
            return false;
        }
    }

    static async complete(runnerId, output) {
        return await this.updateStatus(runnerId, 'completed', output, null);
    }

    static async fail(runnerId, error) {
        return await this.updateStatus(runnerId, 'failed', null, error);
    }

    static async cancel(runnerId) {
        return await this.updateStatus(runnerId, 'cancelled', null, null);
    }

    static async delete(runnerId) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM pi_runners WHERE id = ?',
                [runnerId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting pi runner:', error);
            return false;
        }
    }

    static async cleanup(guildID, daysOld = 7) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM pi_runners WHERE guildID = ? AND createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [guildID, daysOld]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error cleaning up old pi runners:', error);
            return 0;
        }
    }

    static async getStats(guildID) {
        try {
            const [totalRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM pi_runners WHERE guildID = ?',
                [guildID]
            );

            const [statusRows] = await pool.execute(
                'SELECT status, COUNT(*) as count FROM pi_runners WHERE guildID = ? GROUP BY status',
                [guildID]
            );

            const [recentRows] = await pool.execute(
                'SELECT COUNT(*) as recent FROM pi_runners WHERE guildID = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)',
                [guildID]
            );

            const [commandRows] = await pool.execute(
                'SELECT command, COUNT(*) as count FROM pi_runners WHERE guildID = ? GROUP BY command ORDER BY count DESC LIMIT 10',
                [guildID]
            );

            return {
                total: totalRows[0].total,
                byStatus: statusRows.reduce((acc, row) => {
                    acc[row.status] = row.count;
                    return acc;
                }, {}),
                recent24h: recentRows[0].recent,
                topCommands: commandRows
            };
        } catch (error) {
            console.error('Error getting pi runner stats:', error);
            return { total: 0, byStatus: {}, recent24h: 0, topCommands: [] };
        }
    }

    static async executeCommand(guildID, userID, command, args = []) {
        try {
            // Create runner entry
            const runner = await this.create({
                guildID,
                userID,
                command,
                args,
                status: 'running'
            });

            // Execute the command (this would be implemented based on your Pi setup)
            // For now, we'll simulate execution
            const { exec } = require('child_process');
            const fullCommand = `${command} ${args.join(' ')}`;

            return new Promise((resolve, reject) => {
                exec(fullCommand, { timeout: 30000 }, async (error, stdout, stderr) => {
                    if (error) {
                        await this.fail(runner.id, error.message);
                        reject(error);
                    } else {
                        const output = stdout || stderr || 'Command completed successfully';
                        await this.complete(runner.id, output);
                        resolve({ runner, output });
                    }
                });
            });
        } catch (error) {
            console.error('Error executing pi command:', error);
            throw error;
        }
    }

    static async getRunningCommands(guildID) {
        return await this.findByStatus(guildID, 'running');
    }

    static async getPendingCommands(guildID) {
        return await this.findByStatus(guildID, 'pending');
    }
}

module.exports = PiRunner;
