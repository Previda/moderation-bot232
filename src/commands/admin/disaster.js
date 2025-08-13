const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disaster')
        .setDescription('Disaster recovery and emergency management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('emergency-backup')
                .setDescription('Create immediate emergency backup')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for emergency backup')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('server-termination')
                .setDescription('Prepare for server termination/shutdown')
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm server termination preparation')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('new_server_id')
                        .setDescription('New server ID to migrate to (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('recovery-status')
                .setDescription('Check disaster recovery system status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('emergency-restore')
                .setDescription('Emergency restore from backup')
                .addAttachmentOption(option =>
                    option.setName('backup_file')
                        .setDescription('Emergency backup file to restore')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm emergency restoration')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('failsafe')
                .setDescription('Activate failsafe mode (minimal bot operation)')
                .addBooleanOption(option =>
                    option.setName('activate')
                        .setDescription('Activate or deactivate failsafe mode')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for failsafe activation')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export-critical')
                .setDescription('Export only critical data for quick recovery')
                .addStringOption(option =>
                    option.setName('format')
                        .setDescription('Export format')
                        .setRequired(false)
                        .addChoices(
                            { name: 'JSON', value: 'json' },
                            { name: 'SQL', value: 'sql' }
                        )))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'emergency-backup':
                await this.emergencyBackup(interaction);
                break;
            case 'server-termination':
                await this.serverTermination(interaction);
                break;
            case 'recovery-status':
                await this.recoveryStatus(interaction);
                break;
            case 'emergency-restore':
                await this.emergencyRestore(interaction);
                break;
            case 'failsafe':
                await this.failsafe(interaction);
                break;
            case 'export-critical':
                await this.exportCritical(interaction);
                break;
        }
    },

    async emergencyBackup(interaction) {
        const reason = interaction.options.getString('reason');

        try {
            await interaction.deferReply({ ephemeral: true });

            // Get backup scheduler from client
            const backupScheduler = interaction.client.backupScheduler;
            if (!backupScheduler) {
                return interaction.editReply({ content: '❌ Backup system not available' });
            }

            // Create emergency backup
            const result = await backupScheduler.createEmergencyBackup(interaction.guild.id, reason);
            
            if (!result) {
                return interaction.editReply({ content: '❌ Failed to create emergency backup' });
            }

            const { backup, buffer, filename } = result;

            const embed = new EmbedBuilder()
                .setTitle('🚨 Emergency Backup Created')
                .setColor('#ff0000')
                .addFields(
                    { name: 'Backup ID', value: backup.metadata.backupId, inline: true },
                    { name: 'Server', value: backup.metadata.serverName, inline: true },
                    { name: 'Size', value: `${(buffer.length / 1024).toFixed(2)} KB`, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Critical Data', value: `${Object.keys(backup.data).length} tables backed up`, inline: false },
                    { name: '⚠️ Important', value: 'Save this backup file immediately! It contains critical server data.', inline: false }
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
            console.error('Error creating emergency backup:', error);
            await interaction.editReply({ content: '❌ Failed to create emergency backup: ' + error.message });
        }
    },

    async serverTermination(interaction) {
        const confirm = interaction.options.getBoolean('confirm');
        const newServerId = interaction.options.getString('new_server_id');

        if (!confirm) {
            return interaction.reply({ 
                content: '❌ You must confirm server termination preparation by setting confirm to true', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            console.log(`🚨 Server termination preparation initiated for guild ${interaction.guild.id}`);

            // 1. Create comprehensive backup
            const backupData = await this.createComprehensiveBackup(interaction.guild.id);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupId = `termination_backup_${interaction.guild.id}_${timestamp}`;

            const terminationBackup = {
                metadata: {
                    backupId,
                    serverName: interaction.guild.name,
                    serverId: interaction.guild.id,
                    timestamp,
                    type: 'server_termination',
                    newServerId: newServerId || null,
                    version: '1.0',
                    terminationBy: interaction.user.id
                },
                data: backupData,
                migrationInstructions: this.generateMigrationInstructions(newServerId)
            };

            const backupJson = JSON.stringify(terminationBackup, null, 2);
            const buffer = Buffer.from(backupJson, 'utf8');
            const filename = `${backupId}.json`;

            // 2. Export user list
            const memberList = await this.exportMemberList(interaction.guild);

            // 3. Create migration guide
            const migrationGuide = this.createMigrationGuide(interaction.guild, newServerId);

            const embed = new EmbedBuilder()
                .setTitle('🚨 Server Termination Preparation Complete')
                .setColor('#ff0000')
                .addFields(
                    { name: 'Backup ID', value: backupId, inline: true },
                    { name: 'Server', value: interaction.guild.name, inline: true },
                    { name: 'Backup Size', value: `${(buffer.length / 1024).toFixed(2)} KB`, inline: true },
                    { name: 'Data Tables', value: `${Object.keys(backupData).length}`, inline: true },
                    { name: 'Members Exported', value: `${memberList.length}`, inline: true },
                    { name: 'New Server ID', value: newServerId || 'Not specified', inline: true }
                )
                .addFields({
                    name: '📋 What\'s Included',
                    value: '• Complete database backup\n• Member list export\n• Migration instructions\n• Recovery procedures',
                    inline: false
                })
                .addFields({
                    name: '⚠️ Next Steps',
                    value: newServerId ? 
                        `1. Save all backup files\n2. Set up bot in new server: ${newServerId}\n3. Run \`/backup restore\` with the backup file\n4. Invite members using exported list` :
                        '1. Save all backup files\n2. Create new server\n3. Set up bot in new server\n4. Run `/backup restore` with backup file',
                    inline: false
                })
                .setTimestamp();

            // Log the termination preparation
            await pool.execute(`
                INSERT INTO disaster_recovery_log (guildID, event_type, details, performed_by, timestamp)
                VALUES (?, 'server_termination_prep', ?, ?, NOW())
            `, [interaction.guild.id, JSON.stringify({
                backup_id: backupId,
                new_server_id: newServerId,
                member_count: memberList.length
            }), interaction.user.id]);

            await interaction.editReply({
                embeds: [embed],
                files: [
                    {
                        attachment: buffer,
                        name: filename
                    },
                    {
                        attachment: Buffer.from(JSON.stringify(memberList, null, 2)),
                        name: `members_${interaction.guild.id}_${timestamp}.json`
                    },
                    {
                        attachment: Buffer.from(migrationGuide),
                        name: `migration_guide_${timestamp}.txt`
                    }
                ]
            });

        } catch (error) {
            console.error('Error preparing for server termination:', error);
            await interaction.editReply({ content: '❌ Failed to prepare for server termination: ' + error.message });
        }
    },

    async recoveryStatus(interaction) {
        try {
            // Get backup system health
            const backupScheduler = interaction.client.backupScheduler;
            const health = backupScheduler ? await backupScheduler.healthCheck() : { isHealthy: false, error: 'Backup system not initialized' };

            // Get recent disaster recovery events
            const [recentEvents] = await pool.execute(`
                SELECT event_type, COUNT(*) as count 
                FROM disaster_recovery_log 
                WHERE guildID = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY event_type
            `, [interaction.guild.id]);

            // Get backup statistics
            const [backupStats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_backups,
                    MAX(createdAt) as last_backup,
                    SUM(size) as total_size
                FROM backup_history 
                WHERE guildID = ?
            `, [interaction.guild.id]);

            const stats = backupStats[0];

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Disaster Recovery Status')
                .setColor(health.isHealthy ? '#00ff00' : '#ff0000')
                .addFields(
                    { name: 'Backup System', value: health.isHealthy ? '✅ Operational' : '❌ Offline', inline: true },
                    { name: 'Active Schedules', value: `${health.activeSchedules || 0}`, inline: true },
                    { name: 'Recent Backups (24h)', value: `${health.recentBackups || 0}`, inline: true },
                    { name: 'Total Backups', value: `${stats.total_backups || 0}`, inline: true },
                    { name: 'Last Backup', value: stats.last_backup ? new Date(stats.last_backup).toLocaleString() : 'Never', inline: true },
                    { name: 'Storage Used', value: `${((stats.total_size || 0) / 1024).toFixed(2)} KB`, inline: true }
                );

            if (recentEvents.length > 0) {
                const eventSummary = recentEvents.map(e => `${e.event_type}: ${e.count}`).join('\n');
                embed.addFields({ name: 'Recent Events (7 days)', value: eventSummary, inline: false });
            }

            if (!health.isHealthy && health.error) {
                embed.addFields({ name: 'Error Details', value: health.error, inline: false });
            }

            embed.setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error getting recovery status:', error);
            await interaction.reply({ content: '❌ Failed to get recovery status', ephemeral: true });
        }
    },

    async emergencyRestore(interaction) {
        const backupFile = interaction.options.getAttachment('backup_file');
        const confirm = interaction.options.getBoolean('confirm');

        if (!confirm) {
            return interaction.reply({ 
                content: '❌ You must confirm emergency restoration by setting confirm to true. **WARNING: This will overwrite ALL current data!**', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            // Download and parse backup
            const response = await fetch(backupFile.url);
            const backupContent = await response.text();
            const backupData = JSON.parse(backupContent);

            if (!backupData.metadata || !backupData.data) {
                throw new Error('Invalid backup file format');
            }

            // Emergency restore process
            let restoredTables = 0;
            const errors = [];

            for (const [table, rows] of Object.entries(backupData.data)) {
                if (!rows || rows.length === 0) continue;

                try {
                    // Clear existing data
                    await pool.execute(`DELETE FROM ${table} WHERE guildID = ?`, [interaction.guild.id]);

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
                    errors.push(`${table}: ${error.message}`);
                }
            }

            // Log the emergency restore
            await pool.execute(`
                INSERT INTO disaster_recovery_log (guildID, event_type, details, performed_by, timestamp)
                VALUES (?, 'emergency_restore', ?, ?, NOW())
            `, [interaction.guild.id, JSON.stringify({
                backup_id: backupData.metadata.backupId,
                restored_tables: restoredTables,
                errors: errors.length
            }), interaction.user.id]);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Emergency Restore Complete')
                .setColor(errors.length === 0 ? '#00ff00' : '#ffaa00')
                .addFields(
                    { name: 'Backup ID', value: backupData.metadata.backupId, inline: true },
                    { name: 'Original Server', value: backupData.metadata.serverName, inline: true },
                    { name: 'Backup Date', value: new Date(backupData.metadata.timestamp).toLocaleString(), inline: true },
                    { name: 'Tables Restored', value: `${restoredTables}/${Object.keys(backupData.data).length}`, inline: true },
                    { name: 'Errors', value: `${errors.length}`, inline: true },
                    { name: 'Status', value: errors.length === 0 ? '✅ Complete' : '⚠️ Partial', inline: true }
                );

            if (errors.length > 0) {
                embed.addFields({ 
                    name: 'Error Details', 
                    value: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''), 
                    inline: false 
                });
            }

            embed.setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error performing emergency restore:', error);
            await interaction.editReply({ content: '❌ Emergency restore failed: ' + error.message });
        }
    },

    async failsafe(interaction) {
        const activate = interaction.options.getBoolean('activate');
        const reason = interaction.options.getString('reason') || 'Failsafe mode activated by administrator';

        try {
            if (activate) {
                // Activate failsafe mode
                await pool.execute(`
                    INSERT INTO guild_configs (guildID, failsafe_mode, failsafe_reason, failsafe_activated_by, failsafe_activated_at)
                    VALUES (?, true, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                    failsafe_mode = true, 
                    failsafe_reason = VALUES(failsafe_reason),
                    failsafe_activated_by = VALUES(failsafe_activated_by),
                    failsafe_activated_at = NOW()
                `, [interaction.guild.id, reason, interaction.user.id]);

                const embed = new EmbedBuilder()
                    .setTitle('🚨 Failsafe Mode Activated')
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Status', value: '⚠️ Bot operating in minimal mode', inline: true },
                        { name: 'Activated By', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Available Commands', value: '• Basic moderation\n• Emergency backup\n• Disaster recovery\n• Failsafe deactivation', inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } else {
                // Deactivate failsafe mode
                await pool.execute(`
                    UPDATE guild_configs 
                    SET failsafe_mode = false, failsafe_deactivated_by = ?, failsafe_deactivated_at = NOW()
                    WHERE guildID = ?
                `, [interaction.user.id, interaction.guild.id]);

                const embed = new EmbedBuilder()
                    .setTitle('✅ Failsafe Mode Deactivated')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Status', value: '✅ Bot restored to full operation', inline: true },
                        { name: 'Deactivated By', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'All Features', value: 'Now available', inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            // Log the failsafe event
            await pool.execute(`
                INSERT INTO disaster_recovery_log (guildID, event_type, details, performed_by, timestamp)
                VALUES (?, ?, ?, ?, NOW())
            `, [interaction.guild.id, activate ? 'failsafe_activated' : 'failsafe_deactivated', JSON.stringify({ reason }), interaction.user.id]);

        } catch (error) {
            console.error('Error managing failsafe mode:', error);
            await interaction.reply({ content: '❌ Failed to manage failsafe mode', ephemeral: true });
        }
    },

    async exportCritical(interaction) {
        const format = interaction.options.getString('format') || 'json';

        try {
            await interaction.deferReply({ ephemeral: true });

            const criticalData = await this.getCriticalData(interaction.guild.id);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            let exportContent, filename;

            if (format === 'json') {
                exportContent = JSON.stringify({
                    metadata: {
                        exportType: 'critical_data',
                        serverId: interaction.guild.id,
                        serverName: interaction.guild.name,
                        timestamp,
                        exportedBy: interaction.user.id
                    },
                    data: criticalData
                }, null, 2);
                filename = `critical_export_${interaction.guild.id}_${timestamp}.json`;
            } else {
                exportContent = this.generateCriticalSQL(criticalData, interaction.guild.id);
                filename = `critical_export_${interaction.guild.id}_${timestamp}.sql`;
            }

            const buffer = Buffer.from(exportContent, 'utf8');

            const embed = new EmbedBuilder()
                .setTitle('📤 Critical Data Export')
                .setColor('#0099ff')
                .addFields(
                    { name: 'Format', value: format.toUpperCase(), inline: true },
                    { name: 'Size', value: `${(buffer.length / 1024).toFixed(2)} KB`, inline: true },
                    { name: 'Tables', value: `${Object.keys(criticalData).length}`, inline: true },
                    { name: 'Purpose', value: 'Emergency recovery and migration', inline: false }
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
            console.error('Error exporting critical data:', error);
            await interaction.editReply({ content: '❌ Failed to export critical data' });
        }
    },

    // Helper methods
    async createComprehensiveBackup(guildID) {
        const data = {};
        const tables = [
            'tickets', 'notes', 'strikes', 'invites', 'threat_scores',
            'automod_configs', 'appeal_questions', 'appeals', 'pi_runners',
            'punishments', 'verifications', 'guild_configs', 'user_economy',
            'backup_schedules', 'backup_history'
        ];

        for (const table of tables) {
            try {
                const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE guildID = ?`, [guildID]);
                data[table] = rows;
            } catch (error) {
                console.warn(`Table ${table} backup failed:`, error.message);
                data[table] = [];
            }
        }

        return data;
    },

    async exportMemberList(guild) {
        try {
            const members = await guild.members.fetch();
            return members.map(member => ({
                id: member.id,
                username: member.user.username,
                displayName: member.displayName,
                joinedAt: member.joinedAt,
                roles: member.roles.cache.map(role => ({ id: role.id, name: role.name })),
                permissions: member.permissions.toArray()
            }));
        } catch (error) {
            console.error('Error exporting member list:', error);
            return [];
        }
    },

    createMigrationGuide(guild, newServerId) {
        return `
DISCORD BOT MIGRATION GUIDE
===========================

Server: ${guild.name} (${guild.id})
Migration Date: ${new Date().toLocaleString()}
${newServerId ? `New Server ID: ${newServerId}` : 'New Server: To be created'}

STEP-BY-STEP MIGRATION:

1. SERVER SETUP
   ${newServerId ? `- Server already exists: ${newServerId}` : '- Create new Discord server'}
   - Set up channels (copy structure from old server)
   - Configure roles and permissions
   - Set server icon and description

2. BOT SETUP
   - Invite bot to new server with Administrator permissions
   - Run: /backup restore [upload the backup file]
   - Configure bot settings: /setup-channels
   - Set up automod: /automod level medium

3. DATA RESTORATION
   - All user data will be restored automatically
   - Economy balances preserved
   - Punishment history maintained
   - Ticket system ready

4. MEMBER MIGRATION
   - Use the exported member list
   - Create invite links for each member
   - Send personalized invites
   - Restore roles after members join

5. VERIFICATION
   - Test all bot commands
   - Verify data integrity
   - Check backup schedules: /backup schedule daily
   - Test disaster recovery: /disaster recovery-status

IMPORTANT NOTES:
- Keep backup files safe
- Test thoroughly before announcing migration
- Have rollback plan ready
- Monitor for issues in first 24 hours

For support, contact the bot administrator.
        `.trim();
    },

    async getCriticalData(guildID) {
        const data = {};
        const criticalTables = ['guild_configs', 'punishments', 'user_economy', 'tickets'];
        
        for (const table of criticalTables) {
            try {
                const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE guildID = ? LIMIT 1000`, [guildID]);
                data[table] = rows;
            } catch (error) {
                data[table] = [];
            }
        }
        
        return data;
    },

    generateCriticalSQL(data, guildID) {
        let sql = `-- Critical Data Export for Guild: ${guildID}\n-- Generated: ${new Date().toISOString()}\n\n`;
        
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
    },

    generateMigrationInstructions(newServerId) {
        return {
            preRequisites: [
                'Bot must be added to new server with Administrator permissions',
                'Database connection must be established',
                'Backup file must be available'
            ],
            steps: [
                'Upload backup file using /backup restore',
                'Configure channels using /setup-channels',
                'Set up automod rules using /automod',
                'Test all critical functions',
                'Invite members from exported list'
            ],
            postMigration: [
                'Verify all data integrity',
                'Set up backup schedules',
                'Test disaster recovery procedures',
                'Monitor for 24 hours'
            ]
        };
    }
};
