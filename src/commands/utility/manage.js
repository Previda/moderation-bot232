const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');
const ThreatScore = require('../../schemas/ThreatScore');
const Note = require('../../schemas/Note');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('Advanced management and undo utilities')
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear-notes')
                .setDescription('Clear all notes for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to clear notes for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for clearing notes')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('restore-note')
                .setDescription('Restore a deleted note')
                .addStringOption(option =>
                    option.setName('note_id')
                        .setDescription('Note ID to restore')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for restoring note')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset-threats')
                .setDescription('Reset threat scores for user or server')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to reset (leave empty for server-wide)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for threat reset')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bulk-cleanup')
                .setDescription('Bulk cleanup old data')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of data to cleanup')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Old Notes (30+ days)', value: 'notes' },
                            { name: 'Inactive Punishments (90+ days)', value: 'punishments' },
                            { name: 'Expired Invites', value: 'invites' },
                            { name: 'Old Threat Scores (180+ days)', value: 'threats' },
                            { name: 'All Old Data', value: 'all' }
                        ))
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm bulk cleanup')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export-data')
                .setDescription('Export user or server data')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of data to export')
                        .setRequired(true)
                        .addChoices(
                            { name: 'User Punishments', value: 'user_punishments' },
                            { name: 'User Notes', value: 'user_notes' },
                            { name: 'Server Stats', value: 'server_stats' },
                            { name: 'Economy Data', value: 'economy' },
                            { name: 'All User Data', value: 'all_user' }
                        ))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to export data for (required for user exports)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('fix-permissions')
                .setDescription('Fix and restore channel permissions')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to fix permissions for')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('template')
                        .setDescription('Permission template to apply')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Ticket Channel', value: 'ticket' },
                            { name: 'Staff Only', value: 'staff' },
                            { name: 'Public Channel', value: 'public' },
                            { name: 'Appeals Channel', value: 'appeals' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('emergency-reset')
                .setDescription('Emergency reset for critical issues')
                .addStringOption(option =>
                    option.setName('component')
                        .setDescription('Component to emergency reset')
                        .setRequired(true)
                        .addChoices(
                            { name: 'All Automod Rules', value: 'automod' },
                            { name: 'All Active Tickets', value: 'tickets' },
                            { name: 'All Pending Appeals', value: 'appeals' },
                            { name: 'Bot Configuration', value: 'config' }
                        ))
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm emergency reset')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Emergency reason')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'clear-notes':
                await this.clearNotes(interaction);
                break;
            case 'restore-note':
                await this.restoreNote(interaction);
                break;
            case 'reset-threats':
                await this.resetThreats(interaction);
                break;
            case 'bulk-cleanup':
                await this.bulkCleanup(interaction);
                break;
            case 'export-data':
                await this.exportData(interaction);
                break;
            case 'fix-permissions':
                await this.fixPermissions(interaction);
                break;
            case 'emergency-reset':
                await this.emergencyReset(interaction);
                break;
        }
    },

    async clearNotes(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Notes cleared by administrator';

        try {
            const notes = await Note.findByUserId(user.id, interaction.guild.id);
            
            if (notes.length === 0) {
                return interaction.reply({ content: '❌ No notes found for this user', ephemeral: true });
            }

            // Soft delete all notes (mark as deleted rather than actually deleting)
            for (const note of notes) {
                await Note.delete(note.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Notes Cleared')
                .setColor('#ff9900')
                .addFields(
                    { name: 'User', value: `<@${user.id}>`, inline: true },
                    { name: 'Notes Cleared', value: `${notes.length}`, inline: true },
                    { name: 'Cleared By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Note', value: 'Notes can be restored using `/manage restore-note`', inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error clearing notes:', error);
            await interaction.reply({ content: '❌ Failed to clear notes', ephemeral: true });
        }
    },

    async restoreNote(interaction) {
        const noteId = interaction.options.getString('note_id');
        const reason = interaction.options.getString('reason') || 'Note restored by administrator';

        try {
            const note = await Note.findById(noteId);
            
            if (!note) {
                return interaction.reply({ content: '❌ Note not found', ephemeral: true });
            }

            // Restore the note (assuming soft delete implementation)
            await Note.restore(noteId);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Note Restored')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Note ID', value: noteId, inline: true },
                    { name: 'User', value: `<@${note.userID}>`, inline: true },
                    { name: 'Restored By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Content Preview', value: note.content.substring(0, 100) + '...', inline: false },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error restoring note:', error);
            await interaction.reply({ content: '❌ Failed to restore note', ephemeral: true });
        }
    },

    async resetThreats(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Threat scores reset by administrator';

        try {
            let resetCount = 0;

            if (user) {
                // Reset specific user
                await ThreatScore.reset(user.id, interaction.guild.id);
                resetCount = 1;
            } else {
                // Reset all users in guild
                resetCount = await ThreatScore.resetAll(interaction.guild.id);
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Threat Scores Reset')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Scope', value: user ? `User: <@${user.id}>` : 'Server-wide', inline: true },
                    { name: 'Users Reset', value: `${resetCount}`, inline: true },
                    { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting threat scores:', error);
            await interaction.reply({ content: '❌ Failed to reset threat scores', ephemeral: true });
        }
    },

    async bulkCleanup(interaction) {
        const type = interaction.options.getString('type');
        const confirm = interaction.options.getBoolean('confirm');

        if (!confirm) {
            return interaction.reply({ 
                content: '❌ You must confirm bulk cleanup by setting confirm to true', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply();

            let cleanupResults = {};

            if (type === 'notes' || type === 'all') {
                cleanupResults.notes = await Note.cleanup(interaction.guild.id, 30);
            }

            if (type === 'punishments' || type === 'all') {
                const Punishment = require('../../schemas/Punishment');
                cleanupResults.punishments = await Punishment.cleanup(interaction.guild.id, 90);
            }

            if (type === 'invites' || type === 'all') {
                const Invite = require('../../schemas/Invite');
                cleanupResults.invites = await Invite.cleanup(interaction.guild.id);
            }

            if (type === 'threats' || type === 'all') {
                cleanupResults.threats = await ThreatScore.cleanup(interaction.guild.id, 180);
            }

            const embed = new EmbedBuilder()
                .setTitle('🧹 Bulk Cleanup Complete')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Cleanup Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
                    { name: 'Performed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Server', value: interaction.guild.name, inline: true }
                )
                .setTimestamp();

            // Add results for each cleanup type
            for (const [cleanupType, count] of Object.entries(cleanupResults)) {
                embed.addFields({ 
                    name: `${cleanupType.charAt(0).toUpperCase() + cleanupType.slice(1)} Cleaned`, 
                    value: `${count} records`, 
                    inline: true 
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error performing bulk cleanup:', error);
            await interaction.editReply({ content: '❌ Failed to perform bulk cleanup' });
        }
    },

    async exportData(interaction) {
        const type = interaction.options.getString('type');
        const user = interaction.options.getUser('user');

        if ((type.includes('user') || type === 'all_user') && !user) {
            return interaction.reply({ 
                content: '❌ User parameter is required for user data exports', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            let exportData = {};
            const timestamp = new Date().toISOString();

            switch (type) {
                case 'user_punishments':
                    const Punishment = require('../../schemas/Punishment');
                    exportData.punishments = await Punishment.findByUserId(user.id, interaction.guild.id);
                    break;

                case 'user_notes':
                    exportData.notes = await Note.findByUserId(user.id, interaction.guild.id);
                    break;

                case 'server_stats':
                    exportData.serverStats = await this.getServerStats(interaction.guild.id);
                    break;

                case 'economy':
                    const [economyRows] = await pool.execute(
                        'SELECT userID, balance, level, xp FROM user_economy WHERE guildID = ?',
                        [interaction.guild.id]
                    );
                    exportData.economy = economyRows;
                    break;

                case 'all_user':
                    const Punishment2 = require('../../schemas/Punishment');
                    exportData.punishments = await Punishment2.findByUserId(user.id, interaction.guild.id);
                    exportData.notes = await Note.findByUserId(user.id, interaction.guild.id);
                    exportData.threatScore = await ThreatScore.findByUserId(user.id, interaction.guild.id);
                    break;
            }

            const exportJson = JSON.stringify({
                exportType: type,
                server: interaction.guild.name,
                user: user ? user.tag : null,
                timestamp,
                data: exportData
            }, null, 2);

            // Create a text file attachment
            const buffer = Buffer.from(exportJson, 'utf8');
            const filename = `export_${type}_${timestamp.split('T')[0]}.json`;

            await interaction.editReply({
                content: `✅ Data export complete! File: \`${filename}\``,
                files: [{
                    attachment: buffer,
                    name: filename
                }]
            });

        } catch (error) {
            console.error('Error exporting data:', error);
            await interaction.editReply({ content: '❌ Failed to export data' });
        }
    },

    async fixPermissions(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const template = interaction.options.getString('template') || 'public';

        try {
            const permissionTemplates = {
                ticket: [
                    { id: interaction.guild.id, deny: ['ViewChannel'] },
                    { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] }
                ],
                staff: [
                    { id: interaction.guild.id, deny: ['ViewChannel'] },
                    // Add staff role permissions here
                ],
                public: [
                    { id: interaction.guild.id, allow: ['ViewChannel', 'SendMessages'] }
                ],
                appeals: [
                    { id: interaction.guild.id, deny: ['ViewChannel'] },
                    // Add appeals-specific permissions
                ]
            };

            await channel.permissionOverwrites.set(permissionTemplates[template]);

            const embed = new EmbedBuilder()
                .setTitle('🔧 Permissions Fixed')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                    { name: 'Template', value: template.charAt(0).toUpperCase() + template.slice(1), inline: true },
                    { name: 'Fixed By', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fixing permissions:', error);
            await interaction.reply({ content: '❌ Failed to fix permissions', ephemeral: true });
        }
    },

    async emergencyReset(interaction) {
        const component = interaction.options.getString('component');
        const confirm = interaction.options.getBoolean('confirm');
        const reason = interaction.options.getString('reason');

        if (!confirm) {
            return interaction.reply({ 
                content: '❌ You must confirm emergency reset by setting confirm to true', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply();

            let resetResults = {};

            switch (component) {
                case 'automod':
                    const AutomodConfig = require('../../schemas/AutomodConfig');
                    await AutomodConfig.delete(interaction.guild.id);
                    resetResults.automod = 'All automod rules reset to default';
                    break;

                case 'tickets':
                    const Ticket = require('../../schemas/Ticket');
                    const activeTickets = await Ticket.findByGuildId(interaction.guild.id, 'open');
                    for (const ticket of activeTickets) {
                        await Ticket.updateStatus(ticket.id, 'closed');
                    }
                    resetResults.tickets = `${activeTickets.length} tickets force-closed`;
                    break;

                case 'appeals':
                    const Appeal = require('../../schemas/Appeal');
                    const pendingAppeals = await Appeal.findByGuildId(interaction.guild.id, 'pending');
                    for (const appeal of pendingAppeals) {
                        await Appeal.updateStatus(appeal.id, 'cancelled', interaction.user.id, 'Emergency reset');
                    }
                    resetResults.appeals = `${pendingAppeals.length} appeals cancelled`;
                    break;

                case 'config':
                    // Reset guild configuration
                    await pool.execute(
                        'DELETE FROM guild_configs WHERE guildID = ?',
                        [interaction.guild.id]
                    );
                    resetResults.config = 'Bot configuration reset to defaults';
                    break;
            }

            const embed = new EmbedBuilder()
                .setTitle('🚨 Emergency Reset Complete')
                .setColor('#ff0000')
                .addFields(
                    { name: 'Component', value: component.charAt(0).toUpperCase() + component.slice(1), inline: true },
                    { name: 'Performed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Server', value: interaction.guild.name, inline: true },
                    { name: 'Emergency Reason', value: reason, inline: false },
                    { name: 'Results', value: Object.values(resetResults).join('\n'), inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error performing emergency reset:', error);
            await interaction.editReply({ content: '❌ Failed to perform emergency reset' });
        }
    },

    async getServerStats(guildID) {
        try {
            const [punishmentStats] = await pool.execute(
                'SELECT type, COUNT(*) as count FROM punishments WHERE guildID = ? GROUP BY type',
                [guildID]
            );

            const [noteStats] = await pool.execute(
                'SELECT COUNT(*) as count FROM notes WHERE guildID = ?',
                [guildID]
            );

            const [ticketStats] = await pool.execute(
                'SELECT status, COUNT(*) as count FROM tickets WHERE guildID = ? GROUP BY status',
                [guildID]
            );

            return {
                punishments: punishmentStats,
                notes: noteStats[0]?.count || 0,
                tickets: ticketStats
            };
        } catch (error) {
            console.error('Error getting server stats:', error);
            return {};
        }
    }
};
