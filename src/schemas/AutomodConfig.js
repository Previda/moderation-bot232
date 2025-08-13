const { pool } = require('../models/database');

/**
 * MySQL-based AutomodConfig Management
 * Replaces the old MongoDB AutomodConfig schema
 */

class AutomodConfig {
    static async create(configData) {
        try {
            const { 
                guildID, 
                antiSpam = true, 
                antiInvite = true, 
                antiNSFW = true, 
                capsFlood = true, 
                emojiFlood = false,
                warnThreshold = 3,
                muteThreshold = 5,
                muteDuration = 600
            } = configData;
            
            const [result] = await pool.execute(
                'INSERT INTO automod_configs (guildID, antiSpam, antiInvite, antiNSFW, capsFlood, emojiFlood, warnThreshold, muteThreshold, muteDuration, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [guildID, antiSpam, antiInvite, antiNSFW, capsFlood, emojiFlood, warnThreshold, muteThreshold, muteDuration]
            );
            
            return {
                id: result.insertId,
                guildID,
                antiSpam,
                antiInvite,
                antiNSFW,
                capsFlood,
                emojiFlood,
                warnThreshold,
                muteThreshold,
                muteDuration,
                createdAt: new Date()
            };
        } catch (error) {
            console.error('Error creating automod config:', error);
            throw error;
        }
    }

    static async findByGuildId(guildID) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM automod_configs WHERE guildID = ?',
                [guildID]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error finding automod config:', error);
            return null;
        }
    }

    static async findOrCreate(guildID) {
        try {
            let config = await this.findByGuildId(guildID);
            
            if (!config) {
                config = await this.create({ guildID });
            }
            
            return config;
        } catch (error) {
            console.error('Error finding or creating automod config:', error);
            return this.getDefaultConfig(guildID);
        }
    }

    static async update(guildID, updateData) {
        try {
            const fields = [];
            const values = [];
            
            for (const [key, value] of Object.entries(updateData)) {
                if (key !== 'guildID') {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }
            
            values.push(guildID);
            
            const [result] = await pool.execute(
                `UPDATE automod_configs SET ${fields.join(', ')}, updatedAt = NOW() WHERE guildID = ?`,
                values
            );
            
            if (result.affectedRows === 0) {
                // Create if doesn't exist
                return await this.create({ guildID, ...updateData });
            }
            
            return await this.findByGuildId(guildID);
        } catch (error) {
            console.error('Error updating automod config:', error);
            return null;
        }
    }

    static async delete(guildID) {
        try {
            const [result] = await pool.execute(
                'DELETE FROM automod_configs WHERE guildID = ?',
                [guildID]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting automod config:', error);
            return false;
        }
    }

    static getDefaultConfig(guildID) {
        return {
            guildID,
            antiSpam: true,
            antiInvite: true,
            antiNSFW: true,
            capsFlood: true,
            emojiFlood: false,
            warnThreshold: 3,
            muteThreshold: 5,
            muteDuration: 600
        };
    }

    static async setLevel(guildID, level) {
        const configs = {
            low: {
                antiSpam: true,
                antiInvite: false,
                antiNSFW: true,
                capsFlood: false,
                emojiFlood: false,
                warnThreshold: 5,
                muteThreshold: 8,
                muteDuration: 300
            },
            medium: {
                antiSpam: true,
                antiInvite: true,
                antiNSFW: true,
                capsFlood: true,
                emojiFlood: false,
                warnThreshold: 3,
                muteThreshold: 5,
                muteDuration: 600
            },
            high: {
                antiSpam: true,
                antiInvite: true,
                antiNSFW: true,
                capsFlood: true,
                emojiFlood: true,
                warnThreshold: 2,
                muteThreshold: 3,
                muteDuration: 900
            }
        };

        const config = configs[level] || configs.medium;
        return await this.update(guildID, config);
    }
}

module.exports = AutomodConfig;
