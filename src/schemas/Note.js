const { pool } = require('../models/database');

/**
 * MySQL-based Note Management
 * Replaces the old MongoDB Note schema
 */

class Note {
    static async create(noteData) {
        try {
            const { userID, guildID, modID, content, type = 'note' } = noteData;
            
            const [result] = await pool.execute(
                'INSERT INTO user_notes (userID, guildID, modID, content, type, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
                [userID, guildID, modID, content, type]
            );
            
            return {
                id: result.insertId,
                userID,
                guildID,
                modID,
                content,
                type,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    }

    static async findById(noteId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM user_notes WHERE id = ?',
                [noteId]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding note by ID:', error);
            return null;
        }
    }

    static async findByUserId(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM user_notes WHERE userID = ? AND guildID = ? ORDER BY createdAt DESC',
                [userID, guildID]
            );
            return rows;
        } catch (error) {
            console.error('Error finding notes by user ID:', error);
            return [];
        }
    }

    static async findByGuildId(guildID, limit = 50) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM user_notes WHERE guildID = ? ORDER BY createdAt DESC LIMIT ?',
                [guildID, limit]
            );
            return rows;
        } catch (error) {
            console.error('Error finding notes by guild ID:', error);
            return [];
        }
    }

    static async findByType(guildID, type) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM user_notes WHERE guildID = ? AND type = ? ORDER BY createdAt DESC',
                [guildID, type]
            );
            return rows;
        } catch (error) {
            console.error('Error finding notes by type:', error);
            return [];
        }
    }

    static async update(noteId, content) {
        try {
            const [result] = await pool.execute(
                'UPDATE user_notes SET content = ?, updatedAt = NOW() WHERE id = ?',
                [content, noteId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating note:', error);
            return false;
        }
    }

    static async delete(noteId) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM user_notes WHERE id = ?',
                [noteId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting note:', error);
            return false;
        }
    }

    static async deleteByUserId(userID, guildID) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM user_notes WHERE userID = ? AND guildID = ?',
                [userID, guildID]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error deleting notes by user ID:', error);
            return 0;
        }
    }

    static async search(guildID, searchTerm) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM user_notes WHERE guildID = ? AND content LIKE ? ORDER BY createdAt DESC',
                [guildID, `%${searchTerm}%`]
            );
            return rows;
        } catch (error) {
            console.error('Error searching notes:', error);
            return [];
        }
    }

    static async getStats(guildID) {
        try {
            const [totalRows] = await pool.execute(
                'SELECT COUNT(*) as total FROM user_notes WHERE guildID = ?',
                [guildID]
            );

            const [typeRows] = await pool.execute(
                'SELECT type, COUNT(*) as count FROM user_notes WHERE guildID = ? GROUP BY type',
                [guildID]
            );

            const [recentRows] = await pool.execute(
                'SELECT COUNT(*) as recent FROM user_notes WHERE guildID = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
                [guildID]
            );

            return {
                total: totalRows[0].total,
                byType: typeRows.reduce((acc, row) => {
                    acc[row.type] = row.count;
                    return acc;
                }, {}),
                recentWeek: recentRows[0].recent
            };
        } catch (error) {
            console.error('Error getting note stats:', error);
            return { total: 0, byType: {}, recentWeek: 0 };
        }
    }
}

module.exports = Note;
