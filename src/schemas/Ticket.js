const { pool } = require('../models/database');

/**
 * MySQL-based Ticket Management
 * Replaces the old MongoDB Ticket schema
 */

class Ticket {
    static async create(ticketData) {
        try {
            const { userID, guildID, channelID, category, reason, status = 'open' } = ticketData;
            
            const [result] = await pool.execute(
                'INSERT INTO tickets (userID, guildID, channelID, category, reason, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [userID, guildID, channelID, category, reason, status]
            );
            
            return {
                id: result.insertId,
                userID,
                guildID,
                channelID,
                category,
                reason,
                status,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating ticket:', error);
            throw error;
        }
    }

    static async findById(ticketId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM tickets WHERE id = ?',
                [ticketId]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding ticket by ID:', error);
            return null;
        }
    }

    static async findByChannelId(channelID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM tickets WHERE channelID = ? AND status = "open"',
                [channelID]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding ticket by channel ID:', error);
            return null;
        }
    }

    static async findByUserId(userID, guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM tickets WHERE userID = ? AND guildID = ? ORDER BY createdAt DESC',
                [userID, guildID]
            );
            return rows;
        } catch (error) {
            console.error('Error finding tickets by user ID:', error);
            return [];
        }
    }

    static async findByGuildId(guildID, status = null) {
        try {
            let query = 'SELECT * FROM tickets WHERE guildID = ?';
            let params = [guildID];
            
            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }
            
            query += ' ORDER BY createdAt DESC';
            
            const [rows] = await pool.execute(query, params);
            return rows;
        } catch (error) {
            console.error('Error finding tickets by guild ID:', error);
            return [];
        }
    }

    static async updateStatus(ticketId, status, closedBy = null) {
        try {
            const [result] = await pool.execute(
                'UPDATE tickets SET status = ?, closedBy = ?, closedAt = ? WHERE id = ?',
                [status, closedBy, status === 'closed' ? new Date() : null, ticketId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating ticket status:', error);
            return false;
        }
    }

    static async addParticipant(ticketId, userID) {
        try {
            // Check if participant already exists
            const [existing] = await pool.execute(
                'SELECT * FROM ticket_participants WHERE ticketID = ? AND userID = ?',
                [ticketId, userID]
            );
            
            if (existing.length === 0) {
                await pool.execute(
                    'INSERT INTO ticket_participants (ticketID, userID, addedAt) VALUES (?, ?, NOW())',
                    [ticketId, userID]
                );
            }
            return true;
        } catch (error) {
            console.error('Error adding ticket participant:', error);
            return false;
        }
    }

    static async removeParticipant(ticketId, userID) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM ticket_participants WHERE ticketID = ? AND userID = ?',
                [ticketId, userID]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error removing ticket participant:', error);
            return false;
        }
    }

    static async getParticipants(ticketId) {
        try {
            const [rows] = await pool.execute(
                'SELECT userID FROM ticket_participants WHERE ticketID = ?',
                [ticketId]
            );
            return rows.map(row => row.userID);
        } catch (error) {
            console.error('Error getting ticket participants:', error);
            return [];
        }
    }

    static async delete(ticketId) {
        try {
            // Delete participants first (foreign key constraint)
            await pool.execute('DELETE FROM ticket_participants WHERE ticketID = ?', [ticketId]);
            
            // Delete the ticket
            const [result] = await pool.execute('DELETE FROM tickets WHERE id = ?', [ticketId]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting ticket:', error);
            return false;
        }
    }
}

module.exports = Ticket;
