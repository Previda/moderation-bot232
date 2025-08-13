const { pool } = require('../models/database');

/**
 * MySQL-based AppealQuestion Management
 * Replaces the old MongoDB AppealQuestion schema
 */

class AppealQuestion {
    static async create(questionData) {
        try {
            const { 
                guildID, 
                question, 
                type = 'text', 
                required = true, 
                options = null,
                order = 1
            } = questionData;
            
            const [result] = await pool.execute(
                'INSERT INTO appeal_questions (guildID, question, type, required, options, order_num, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())',
                [guildID, question, type, required, JSON.stringify(options), order]
            );
            
            return {
                id: result.insertId,
                guildID,
                question,
                type,
                required,
                options,
                order,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating appeal question:', error);
            throw error;
        }
    }

    static async findByGuildId(guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM appeal_questions WHERE guildID = ? ORDER BY order_num ASC',
                [guildID]
            );
            
            return rows.map(row => ({
                ...row,
                options: row.options ? JSON.parse(row.options) : null,
                order: row.order_num
            }));
        } catch (error) {
            console.error('Error finding appeal questions:', error);
            return [];
        }
    }

    static async findById(questionId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM appeal_questions WHERE id = ?',
                [questionId]
            );
            
            if (rows.length === 0) return null;
            
            const row = rows[0];
            return {
                ...row,
                options: row.options ? JSON.parse(row.options) : null,
                order: row.order_num
            };
        } catch (error) {
            console.error('Error finding appeal question by ID:', error);
            return null;
        }
    }

    static async update(questionId, updateData) {
        try {
            const fields = [];
            const values = [];
            
            for (const [key, value] of Object.entries(updateData)) {
                if (key === 'options') {
                    fields.push('options = ?');
                    values.push(JSON.stringify(value));
                } else if (key === 'order') {
                    fields.push('order_num = ?');
                    values.push(value);
                } else if (key !== 'id') {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }
            
            values.push(questionId);
            
            const [result] = await pool.execute(
                `UPDATE appeal_questions SET ${fields.join(', ')}, updatedAt = NOW() WHERE id = ?`,
                values
            );
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating appeal question:', error);
            return false;
        }
    }

    static async delete(questionId) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM appeal_questions WHERE id = ?',
                [questionId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting appeal question:', error);
            return false;
        }
    }

    static async deleteByGuildId(guildID) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM appeal_questions WHERE guildID = ?',
                [guildID]
            );
            return result.affectedRows;
        } catch (error) {
            console.error('Error deleting appeal questions by guild:', error);
            return 0;
        }
    }

    static async reorderQuestions(guildID, questionIds) {
        try {
            for (let i = 0; i < questionIds.length; i++) {
                await pool.execute(
                    'UPDATE appeal_questions SET order_num = ? WHERE id = ? AND guildID = ?',
                    [i + 1, questionIds[i], guildID]
                );
            }
            return true;
        } catch (error) {
            console.error('Error reordering appeal questions:', error);
            return false;
        }
    }

    static async createDefaultQuestions(guildID) {
        const defaultQuestions = [
            {
                guildID,
                question: 'What is your Discord username?',
                type: 'text',
                required: true,
                order: 1
            },
            {
                guildID,
                question: 'What punishment are you appealing? (Ban, Mute, etc.)',
                type: 'text',
                required: true,
                order: 2
            },
            {
                guildID,
                question: 'Why do you believe this punishment was unfair?',
                type: 'textarea',
                required: true,
                order: 3
            },
            {
                guildID,
                question: 'Do you understand the rules you broke?',
                type: 'select',
                required: true,
                options: ['Yes', 'No', 'Partially'],
                order: 4
            },
            {
                guildID,
                question: 'What will you do differently in the future?',
                type: 'textarea',
                required: true,
                order: 5
            }
        ];

        try {
            const createdQuestions = [];
            for (const question of defaultQuestions) {
                const created = await this.create(question);
                createdQuestions.push(created);
            }
            return createdQuestions;
        } catch (error) {
            console.error('Error creating default appeal questions:', error);
            return [];
        }
    }

    static async getFormData(guildID) {
        try {
            const questions = await this.findByGuildId(guildID);
            
            if (questions.length === 0) {
                // Create default questions if none exist
                await this.createDefaultQuestions(guildID);
                return await this.findByGuildId(guildID);
            }
            
            return questions;
        } catch (error) {
            console.error('Error getting form data:', error);
            return [];
        }
    }
}

module.exports = AppealQuestion;
