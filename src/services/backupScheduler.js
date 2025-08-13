const { pool } = require('../models/database');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;

/**
 * Automatic Backup Scheduler Service
 * Handles scheduled backups and disaster recovery
 */

class BackupScheduler {
    constructor(client) {
        this.client = client;
        this.isRunning = false;
        this.interval = null;
    }

    start() {
        if (this.isRunning) return;
        
        console.log('🔄 Starting backup scheduler...');
        this.isRunning = true;
        
        // Check for due backups every 5 minutes
        this.interval = setInterval(() => {
            this.checkDueBackups();
        }, 5 * 60 * 1000);

        // Initial check
        this.checkDueBackups();
    }

    stop() {
        if (!this.isRunning) return;
        
        console.log('⏹️ Stopping backup scheduler...');
        this.isRunning = false;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async checkDueBackups() {
        try {
            const [schedules] = await pool.execute(`
                SELECT * FROM backup_schedules 
                WHERE active = true AND nextBackup <= NOW()
            `);

            for (const schedule of schedules) {
                await this.performScheduledBackup(schedule);
            }
        } catch (error) {
            console.error('Error checking due backups:', error);
        }
    }

    async performScheduledBackup(schedule) {
        try {
            console.log(`📦 Creating scheduled backup for guild ${schedule.guildID}`);

            const guild = this.client.guilds.cache.get(schedule.guildID);
            if (!guild) {
                console.warn(`Guild ${schedule.guildID} not found, skipping backup`);
                return;
            }

            // Create backup data
            const backupData = await this.collectBackupData(schedule.guildID);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupId = `auto_backup_${schedule.guildID}_${timestamp}`;

            const backup = {
                metadata: {
                    backupId,
                    serverName: guild.name,
                    serverId: schedule.guildID,
                    timestamp,
                    type: 'scheduled',
                    frequency: schedule.frequency,
                    version: '1.0'
                },
                data: backupData
            };

            const backupJson = JSON.stringify(backup, null, 2);
            const buffer = Buffer.from(backupJson, 'utf8');
            const filename = `${backupId}.json`;

            // Store backup info
            await this.storeBackupInfo(backupId, schedule.guildID, 'scheduled', filename, buffer.length);

            // Send to backup channel
            await this.sendBackupToChannel(schedule, backup, buffer, filename);

            // Update next backup time
            await this.updateNextBackup(schedule);

            console.log(`✅ Scheduled backup completed for guild ${schedule.guildID}`);

        } catch (error) {
            console.error(`Error performing scheduled backup for guild ${schedule.guildID}:`, error);
            
            // Log the failure
            await this.logDisasterRecoveryEvent(schedule.guildID, 'backup_failed', {
                error: error.message,
                schedule_id: schedule.id
            });
        }
    }

    async collectBackupData(guildID) {
        const data = {};
        
        const tables = [
            'tickets', 'notes', 'strikes', 'invites', 'threat_scores',
            'automod_configs', 'appeal_questions', 'appeals', 'pi_runners',
            'punishments', 'verifications', 'guild_configs', 'user_economy'
        ];

        for (const table of tables) {
            try {
                const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE guildID = ?`, [guildID]);
                data[table] = rows;
            } catch (error) {
                console.warn(`Table ${table} not found or error:`, error.message);
                data[table] = [];
            }
        }

        return data;
    }

    async sendBackupToChannel(schedule, backup, buffer, filename) {
        try {
            if (!schedule.channelID) return;

            const channel = await this.client.channels.fetch(schedule.channelID);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle('📦 Scheduled Backup Created')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Backup ID', value: backup.metadata.backupId, inline: true },
                    { name: 'Server', value: backup.metadata.serverName, inline: true },
                    { name: 'Frequency', value: schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1), inline: true },
                    { name: 'Size', value: `${(buffer.length / 1024).toFixed(2)} KB`, inline: true },
                    { name: 'Tables', value: `${Object.keys(backup.data).length}`, inline: true },
                    { name: 'Status', value: '✅ Backup Complete', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Automatic Backup System' });

            await channel.send({
                embeds: [embed],
                files: [{
                    attachment: buffer,
                    name: filename
                }]
            });

        } catch (error) {
            console.error('Error sending backup to channel:', error);
        }
    }

    async updateNextBackup(schedule) {
        let nextBackup;
        const now = new Date();

        switch (schedule.frequency) {
            case 'daily':
                nextBackup = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                break;
            case 'weekly':
                nextBackup = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                nextBackup = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                nextBackup = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }

        await pool.execute(
            'UPDATE backup_schedules SET nextBackup = ? WHERE id = ?',
            [nextBackup, schedule.id]
        );
    }

    async storeBackupInfo(backupId, guildID, type, filename, size) {
        try {
            await pool.execute(`
                INSERT INTO backup_history (backupId, guildID, type, filename, size, status, createdAt)
                VALUES (?, ?, ?, ?, ?, 'created', NOW())
            `, [backupId, guildID, type, filename, size]);

            await this.logDisasterRecoveryEvent(guildID, 'backup_created', {
                backup_id: backupId,
                type,
                size
            });
        } catch (error) {
            console.warn('Failed to store backup info:', error.message);
        }
    }

    async logDisasterRecoveryEvent(guildID, eventType, details, performedBy = 'system') {
        try {
            await pool.execute(`
                INSERT INTO disaster_recovery_log (guildID, event_type, details, performed_by, timestamp)
                VALUES (?, ?, ?, ?, NOW())
            `, [guildID, eventType, JSON.stringify(details), performedBy]);
        } catch (error) {
            console.warn('Failed to log disaster recovery event:', error.message);
        }
    }

    // Emergency backup creation (triggered by critical events)
    async createEmergencyBackup(guildID, reason = 'Emergency backup') {
        try {
            console.log(`🚨 Creating emergency backup for guild ${guildID}: ${reason}`);

            const guild = this.client.guilds.cache.get(guildID);
            if (!guild) return null;

            const backupData = await this.collectCriticalData(guildID);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupId = `emergency_backup_${guildID}_${timestamp}`;

            const backup = {
                metadata: {
                    backupId,
                    serverName: guild.name,
                    serverId: guildID,
                    timestamp,
                    type: 'emergency',
                    reason,
                    version: '1.0'
                },
                data: backupData
            };

            const backupJson = JSON.stringify(backup, null, 2);
            const buffer = Buffer.from(backupJson, 'utf8');
            const filename = `${backupId}.json`;

            await this.storeBackupInfo(backupId, guildID, 'emergency', filename, buffer.length);

            // Try to send to backup channel or admin
            await this.sendEmergencyBackup(guildID, backup, buffer, filename);

            await this.logDisasterRecoveryEvent(guildID, 'emergency_backup', {
                backup_id: backupId,
                reason,
                size: buffer.length
            });

            return { backup, buffer, filename };

        } catch (error) {
            console.error(`Error creating emergency backup for guild ${guildID}:`, error);
            return null;
        }
    }

    async collectCriticalData(guildID) {
        const data = {};
        const criticalTables = ['guild_configs', 'punishments', 'tickets', 'user_economy', 'automod_configs'];
        
        for (const table of criticalTables) {
            try {
                // Limit to most recent 1000 records for emergency backup
                const [rows] = await pool.execute(
                    `SELECT * FROM ${table} WHERE guildID = ? ORDER BY createdAt DESC LIMIT 1000`, 
                    [guildID]
                );
                data[table] = rows;
            } catch (error) {
                console.warn(`Critical table ${table} backup failed:`, error.message);
                data[table] = [];
            }
        }
        
        return data;
    }

    async sendEmergencyBackup(guildID, backup, buffer, filename) {
        try {
            // Try to find backup channel first
            const [scheduleRows] = await pool.execute(
                'SELECT channelID FROM backup_schedules WHERE guildID = ? AND active = true',
                [guildID]
            );

            let channel = null;
            if (scheduleRows.length > 0 && scheduleRows[0].channelID) {
                channel = await this.client.channels.fetch(scheduleRows[0].channelID).catch(() => null);
            }

            // If no backup channel, try to find admin or owner
            if (!channel) {
                const guild = this.client.guilds.cache.get(guildID);
                if (guild) {
                    const owner = await guild.fetchOwner().catch(() => null);
                    if (owner) {
                        channel = await owner.createDM().catch(() => null);
                    }
                }
            }

            if (channel) {
                const embed = new EmbedBuilder()
                    .setTitle('🚨 Emergency Backup Created')
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Backup ID', value: backup.metadata.backupId, inline: true },
                        { name: 'Server', value: backup.metadata.serverName, inline: true },
                        { name: 'Reason', value: backup.metadata.reason, inline: true },
                        { name: 'Size', value: `${(buffer.length / 1024).toFixed(2)} KB`, inline: true },
                        { name: 'Critical Data', value: `${Object.keys(backup.data).length} tables`, inline: true },
                        { name: 'Status', value: '⚠️ Emergency Backup', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Emergency Backup System' });

                await channel.send({
                    content: '🚨 **EMERGENCY BACKUP CREATED** - Please save this file immediately!',
                    embeds: [embed],
                    files: [{
                        attachment: buffer,
                        name: filename
                    }]
                });
            }

        } catch (error) {
            console.error('Error sending emergency backup:', error);
        }
    }

    // Cleanup old backups
    async cleanupOldBackups() {
        try {
            // Delete backup records older than 90 days
            const [result] = await pool.execute(`
                DELETE FROM backup_history 
                WHERE createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY)
            `);

            if (result.affectedRows > 0) {
                console.log(`🧹 Cleaned up ${result.affectedRows} old backup records`);
            }

            // Clean disaster recovery logs older than 180 days
            const [logResult] = await pool.execute(`
                DELETE FROM disaster_recovery_log 
                WHERE timestamp < DATE_SUB(NOW(), INTERVAL 180 DAY)
            `);

            if (logResult.affectedRows > 0) {
                console.log(`🧹 Cleaned up ${logResult.affectedRows} old disaster recovery logs`);
            }

        } catch (error) {
            console.error('Error cleaning up old backups:', error);
        }
    }

    // Health check for backup system
    async healthCheck() {
        try {
            const [activeSchedules] = await pool.execute(
                'SELECT COUNT(*) as count FROM backup_schedules WHERE active = true'
            );

            const [recentBackups] = await pool.execute(
                'SELECT COUNT(*) as count FROM backup_history WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'
            );

            const [failedBackups] = await pool.execute(`
                SELECT COUNT(*) as count FROM disaster_recovery_log 
                WHERE event_type = 'backup_failed' AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            return {
                isHealthy: this.isRunning,
                activeSchedules: activeSchedules[0].count,
                recentBackups: recentBackups[0].count,
                failedBackups: failedBackups[0].count,
                lastCheck: new Date()
            };

        } catch (error) {
            console.error('Error performing backup health check:', error);
            return {
                isHealthy: false,
                error: error.message,
                lastCheck: new Date()
            };
        }
    }
}

module.exports = BackupScheduler;
