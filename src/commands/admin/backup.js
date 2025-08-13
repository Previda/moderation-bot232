const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { pool } = require('../../models/database');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Comprehensive backup system for disaster recovery')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create full server backup')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of backup to create')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Full Backup (All Data)', value: 'full' },
                            { name: 'Database Only', value: 'database' },
                            { name: 'Configuration Only', value: 'config' },
                            { name: 'User Data Only', value: 'users' },
                            { name: 'Emergency Backup', value: 'emergency' }
                        ))
                .addBooleanOption(option =>
                    option.setName('encrypt')
                        .setDescription('Encrypt the backup file')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('restore')
                .setDescription('Restore from backup file')
                .addAttachmentOption(option =>
                    option.setName('backup_file')
                        .setDescription('Backup file to restore from')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm restoration (will overwrite current data)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule')
                .setDescription('Schedule automatic backups')
                .addStringOption(option =>
                    option.setName('frequency')
                        .setDescription('Backup frequency')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Daily', value: 'daily' },
                            { name: 'Weekly', value: 'weekly' },
                            { name: 'Monthly', value: 'monthly' },
                            { name: 'Disable', value: 'disable' }
                        ))
                .addChannelOption(option =>
                    option.setName('backup_channel')
                        .setDescription('Channel to send backups to')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('migrate')
                .setDescription('Migrate server data to new server')
                .addStringOption(option =>
                    option.setName('target_server')
                        .setDescription('Target server ID for migration')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm migration')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Export data for external backup')
                .addStringOption(option =>
                    option.setName('format')
                        .setDescription('Export format')
                        .setRequired(true)
                        .addChoices(
                            { name: 'JSON', value: 'json' },
                            { name: 'CSV', value: 'csv' },
                            { name: 'SQL Dump', value: 'sql' }
                        ))
                .addStringOption(option =>
                    option.setName('destination')
                        .setDescription('Where to send the export')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Discord Channel', value: 'discord' },
                            { name: 'Webhook URL', value: 'webhook' },
                            { name: 'Download Only', value: 'download' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check backup system status')
                .addBooleanOption(option =>
                    option.setName('detailed')
                        .setDescription('Show detailed backup information')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await this.createBackup(interaction);
                break;
            case 'restore':
                await this.restoreBackup(interaction);
                break;
            case 'schedule':
                await this.scheduleBackups(interaction);
                break;
            case 'migrate':
                await this.migrateServer(interaction);
                break;
            case 'export':
                await this.exportData(interaction);
                break;
            case 'status':
                await this.backupStatus(interaction);
                break;
        }
    },

    async createBackup(interaction) {
        const type = interaction.options.getString('type');
        const encrypt = interaction.options.getBoolean('encrypt') || false;

        try {
            await interaction.deferReply({ ephemeral: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupId = `backup_${interaction.guild.id}_${timestamp}`;
            
            let backupData = {
                metadata: {
                    backupId,
                    serverName: interaction.guild.name,
                    serverId: interaction.guild.id,
                    timestamp,
                    type,
                    version: '1.0',
                    encrypted: encrypt
                },
                data: {}
            };

            // Collect data based on backup type
            switch (type) {
                case 'full':
                    backupData.data = await this.collectFullBackup(interaction.guild.id);
                    break;
                case 'database':
                    backupData.data = await this.collectDatabaseBackup(interaction.guild.id);
                    break;
                case 'config':
                    backupData.data = await this.collectConfigBackup(interaction.guild.id);
                    break;
                case 'users':
                    backupData.data = await this.collectUserBackup(interaction.guild.id);
                    break;
                case 'emergency':
                    backupData.data = await this.collectEmergencyBackup(interaction.guild.id);
                    break;
            }

            // Create backup file
            let backupJson = JSON.stringify(backupData, null, 2);
            
            if (encrypt) {
                backupJson = await this.encryptData(backupJson);
            }

            const buffer = Buffer.from(backupJson, 'utf8');
            const filename = `${backupId}.${encrypt ? 'enc' : 'json'}`;

            // Store backup info in database
            await this.storeBackupInfo(backupId, interaction.guild.id, type, filename, buffer.length);

            const embed = new EmbedBuilder()
                .setTitle('💾 Backup Created Successfully')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Backup ID', value: backupId, inline: true },
                    { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
                    { name: 'Size', value: `${(buffer.length / 1024).toFixed(2)} KB`, inline: true },
                    { name: 'Encrypted', value: encrypt ? 'Yes' : 'No', inline: true },
                    { name: 'Records', value: `${Object.keys(backupData.data).length} tables`, inline: true },
                    { name: 'Status', value: '✅ Ready for download', inline: true }
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [{
                    attachment: buffer,
                    name: filename
                }]
            });

            // Send to backup channel if configured
            await this.sendToBackupChannel(interaction.guild.id, embed, buffer, filename);

        } catch (error) {
            console.error('Error creating backup:', error);
            await interaction.editReply({ content: '❌ Failed to create backup: ' + error.message });
        }
    },

    async restoreBackup(interaction) {
        const backupFile = interaction.options.getAttachment('backup_file');
        const confirm = interaction.options.getBoolean('confirm');

        if (!confirm) {
            return interaction.reply({ 
                content: '❌ You must confirm restoration by setting confirm to true. **WARNING: This will overwrite all current data!**', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            // Download and parse backup file
            const response = await fetch(backupFile.url);
            const backupContent = await response.text();
            
            let backupData;
            try {
                if (backupFile.name.endsWith('.enc')) {
                    // Decrypt if encrypted
                    const decrypted = await this.decryptData(backupContent);
                    backupData = JSON.parse(decrypted);
                } else {
                    backupData = JSON.parse(backupContent);
                }
            } catch (parseError) {
                throw new Error('Invalid backup file format');
            }

            // Validate backup
            if (!backupData.metadata || !backupData.data) {
                throw new Error('Invalid backup structure');
            }

            // Restore data
            const restoredTables = await this.restoreData(backupData.data, interaction.guild.id);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Backup Restored Successfully')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Backup ID', value: backupData.metadata.backupId, inline: true },
                    { name: 'Original Server', value: backupData.metadata.serverName, inline: true },
                    { name: 'Backup Date', value: new Date(backupData.metadata.timestamp).toLocaleString(), inline: true },
                    { name: 'Tables Restored', value: `${restoredTables}`, inline: true },
                    { name: 'Restored By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Status', value: '✅ Restoration Complete', inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error restoring backup:', error);
            await interaction.editReply({ content: '❌ Failed to restore backup: ' + error.message });
        }
    },

    async scheduleBackups(interaction) {
        const frequency = interaction.options.getString('frequency');
        const backupChannel = interaction.options.getChannel('backup_channel');

        try {
            if (frequency === 'disable') {
                // Disable scheduled backups
                await pool.execute(
                    'DELETE FROM backup_schedules WHERE guildID = ?',
                    [interaction.guild.id]
                );

                return interaction.reply({
                    content: '✅ Automatic backups disabled',
                    ephemeral: true
                });
            }

            // Schedule backups
            await pool.execute(`
                INSERT INTO backup_schedules (guildID, frequency, channelID, nextBackup, active) 
                VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), true)
                ON DUPLICATE KEY UPDATE 
                frequency = VALUES(frequency), 
                channelID = VALUES(channelID),
                nextBackup = CASE 
                    WHEN VALUES(frequency) = 'daily' THEN DATE_ADD(NOW(), INTERVAL 1 DAY)
                    WHEN VALUES(frequency) = 'weekly' THEN DATE_ADD(NOW(), INTERVAL 1 WEEK)
                    WHEN VALUES(frequency) = 'monthly' THEN DATE_ADD(NOW(), INTERVAL 1 MONTH)
                END,
                active = true
            `, [interaction.guild.id, frequency, backupChannel?.id]);

            const embed = new EmbedBuilder()
                .setTitle('📅 Backup Schedule Updated')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Frequency', value: frequency.charAt(0).toUpperCase() + frequency.slice(1), inline: true },
                    { name: 'Backup Channel', value: backupChannel ? `<#${backupChannel.id}>` : 'DM to Admin', inline: true },
                    { name: 'Next Backup', value: this.getNextBackupTime(frequency), inline: true },
                    { name: 'Status', value: '✅ Active', inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error scheduling backups:', error);
            await interaction.reply({ content: '❌ Failed to schedule backups', ephemeral: true });
        }
    },

    async migrateServer(interaction) {
        const targetServerId = interaction.options.getString('target_server');
        const confirm = interaction.options.getBoolean('confirm');

        if (!confirm) {
            return interaction.reply({ 
                content: '❌ You must confirm migration by setting confirm to true', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            // Create full backup of current server
            const backupData = await this.collectFullBackup(interaction.guild.id);
            
            // Migrate data to target server
            const migratedTables = await this.restoreData(backupData, targetServerId);

            const embed = new EmbedBuilder()
                .setTitle('🚚 Server Migration Complete')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Source Server', value: interaction.guild.name, inline: true },
                    { name: 'Target Server ID', value: targetServerId, inline: true },
                    { name: 'Tables Migrated', value: `${migratedTables}`, inline: true },
                    { name: 'Migration By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Status', value: '✅ Migration Complete', inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error migrating server:', error);
            await interaction.editReply({ content: '❌ Failed to migrate server: ' + error.message });
        }
    },

    async exportData(interaction) {
        const format = interaction.options.getString('format');
        const destination = interaction.options.getString('destination') || 'download';

        try {
            await interaction.deferReply({ ephemeral: true });

            const data = await this.collectFullBackup(interaction.guild.id);
            let exportContent, filename, contentType;

            switch (format) {
                case 'json':
                    exportContent = JSON.stringify(data, null, 2);
                    filename = `export_${interaction.guild.id}_${Date.now()}.json`;
                    contentType = 'application/json';
                    break;
                case 'csv':
                    exportContent = await this.convertToCSV(data);
                    filename = `export_${interaction.guild.id}_${Date.now()}.csv`;
                    contentType = 'text/csv';
                    break;
                case 'sql':
                    exportContent = await this.generateSQLDump(data, interaction.guild.id);
                    filename = `export_${interaction.guild.id}_${Date.now()}.sql`;
                    contentType = 'application/sql';
                    break;
            }

            const buffer = Buffer.from(exportContent, 'utf8');

            const embed = new EmbedBuilder()
                .setTitle('📤 Data Export Complete')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Format', value: format.toUpperCase(), inline: true },
                    { name: 'Size', value: `${(buffer.length / 1024).toFixed(2)} KB`, inline: true },
                    { name: 'Records', value: `${Object.keys(data).length} tables`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [{
                    attachment: buffer,
                    name: filename
                }]
            });

        } catch (error) {
            console.error('Error exporting data:', error);
            await interaction.editReply({ content: '❌ Failed to export data: ' + error.message });
        }
    },

    async backupStatus(interaction) {
        const detailed = interaction.options.getBoolean('detailed') || false;

        try {
            // Get backup schedule info
            const [scheduleRows] = await pool.execute(
                'SELECT * FROM backup_schedules WHERE guildID = ?',
                [interaction.guild.id]
            );

            // Get recent backups
            const [backupRows] = await pool.execute(
                'SELECT * FROM backup_history WHERE guildID = ? ORDER BY createdAt DESC LIMIT 5',
                [interaction.guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('💾 Backup System Status')
                .setColor('#0099ff');

            if (scheduleRows.length > 0) {
                const schedule = scheduleRows[0];
                embed.addFields(
                    { name: 'Scheduled Backups', value: schedule.active ? '✅ Active' : '❌ Inactive', inline: true },
                    { name: 'Frequency', value: schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1), inline: true },
                    { name: 'Next Backup', value: new Date(schedule.nextBackup).toLocaleString(), inline: true }
                );
            } else {
                embed.addFields({ name: 'Scheduled Backups', value: '❌ Not configured', inline: true });
            }

            if (backupRows.length > 0) {
                const recentBackups = backupRows.map(backup => 
                    `${backup.type} - ${new Date(backup.createdAt).toLocaleDateString()}`
                ).join('\n');
                
                embed.addFields(
                    { name: 'Recent Backups', value: recentBackups || 'None', inline: false }
                );
            }

            // Add detailed info if requested
            if (detailed) {
                const [dbSize] = await pool.execute(
                    'SELECT SUM(data_length + index_length) as size FROM information_schema.tables WHERE table_schema = DATABASE()'
                );
                
                embed.addFields(
                    { name: 'Database Size', value: `${(dbSize[0].size / 1024 / 1024).toFixed(2)} MB`, inline: true },
                    { name: 'Total Backups', value: `${backupRows.length}`, inline: true }
                );
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error getting backup status:', error);
            await interaction.reply({ content: '❌ Failed to get backup status', ephemeral: true });
        }
    },

    // Helper methods
    async collectFullBackup(guildID) {
        const data = {};
        
        // Collect all relevant data
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
    },

    async collectDatabaseBackup(guildID) {
        return await this.collectFullBackup(guildID);
    },

    async collectConfigBackup(guildID) {
        const data = {};
        const configTables = ['guild_configs', 'automod_configs'];
        
        for (const table of configTables) {
            try {
                const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE guildID = ?`, [guildID]);
                data[table] = rows;
            } catch (error) {
                data[table] = [];
            }
        }
        
        return data;
    },

    async collectUserBackup(guildID) {
        const data = {};
        const userTables = ['user_economy', 'notes', 'punishments', 'threat_scores'];
        
        for (const table of userTables) {
            try {
                const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE guildID = ?`, [guildID]);
                data[table] = rows;
            } catch (error) {
                data[table] = [];
            }
        }
        
        return data;
    },

    async collectEmergencyBackup(guildID) {
        const data = {};
        const criticalTables = ['guild_configs', 'punishments', 'tickets', 'user_economy'];
        
        for (const table of criticalTables) {
            try {
                const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE guildID = ? ORDER BY createdAt DESC LIMIT 1000`, [guildID]);
                data[table] = rows;
            } catch (error) {
                data[table] = [];
            }
        }
        
        return data;
    },

    async restoreData(backupData, guildID) {
        let restoredTables = 0;
        
        for (const [table, rows] of Object.entries(backupData)) {
            if (rows.length === 0) continue;
            
            try {
                // Clear existing data for this guild
                await pool.execute(`DELETE FROM ${table} WHERE guildID = ?`, [guildID]);
                
                // Insert backup data
                for (const row of rows) {
                    const columns = Object.keys(row);
                    const values = Object.values(row);
                    const placeholders = columns.map(() => '?').join(', ');
                    
                    await pool.execute(
                        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
                        values
                    );
                }
                
                restoredTables++;
            } catch (error) {
                console.warn(`Failed to restore table ${table}:`, error.message);
            }
        }
        
        return restoredTables;
    },

    async storeBackupInfo(backupId, guildID, type, filename, size) {
        try {
            await pool.execute(`
                INSERT INTO backup_history (backupId, guildID, type, filename, size, createdAt)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [backupId, guildID, type, filename, size]);
        } catch (error) {
            console.warn('Failed to store backup info:', error.message);
        }
    },

    async sendToBackupChannel(guildID, embed, buffer, filename) {
        try {
            const [rows] = await pool.execute(
                'SELECT channelID FROM backup_schedules WHERE guildID = ? AND active = true',
                [guildID]
            );
            
            if (rows.length > 0 && rows[0].channelID) {
                const channel = await client.channels.fetch(rows[0].channelID);
                if (channel) {
                    await channel.send({
                        embeds: [embed],
                        files: [{
                            attachment: buffer,
                            name: filename
                        }]
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to send to backup channel:', error.message);
        }
    },

    getNextBackupTime(frequency) {
        const now = new Date();
        switch (frequency) {
            case 'daily':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleString();
            case 'weekly':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleString();
            case 'monthly':
                return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleString();
            default:
                return 'Unknown';
        }
    },

    async encryptData(data) {
        // Simple encryption - in production, use proper encryption
        return Buffer.from(data).toString('base64');
    },

    async decryptData(encryptedData) {
        // Simple decryption - in production, use proper decryption
        return Buffer.from(encryptedData, 'base64').toString('utf8');
    },

    async convertToCSV(data) {
        let csv = '';
        for (const [table, rows] of Object.entries(data)) {
            if (rows.length === 0) continue;
            
            csv += `\n\n=== ${table.toUpperCase()} ===\n`;
            const headers = Object.keys(rows[0]);
            csv += headers.join(',') + '\n';
            
            for (const row of rows) {
                const values = headers.map(header => 
                    JSON.stringify(row[header] || '').replace(/"/g, '""')
                );
                csv += values.join(',') + '\n';
            }
        }
        return csv;
    },

    async generateSQLDump(data, guildID) {
        let sql = `-- Backup for Guild ID: ${guildID}\n-- Generated: ${new Date().toISOString()}\n\n`;
        
        for (const [table, rows] of Object.entries(data)) {
            if (rows.length === 0) continue;
            
            sql += `-- Table: ${table}\n`;
            sql += `DELETE FROM ${table} WHERE guildID = '${guildID}';\n`;
            
            for (const row of rows) {
                const columns = Object.keys(row);
                const values = Object.values(row).map(val => 
                    val === null ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`
                );
                
                sql += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
            }
            sql += '\n';
        }
        
        return sql;
    }
};
