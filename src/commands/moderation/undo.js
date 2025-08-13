const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');
const Punishment = require('../../schemas/Punishment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('undo')
        .setDescription('Undo/reverse moderation actions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Undo a ban (unban user)')
                .addStringOption(option =>
                    option.setName('case')
                        .setDescription('Case ID to undo')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for undoing the ban')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Undo a mute (unmute user)')
                .addStringOption(option =>
                    option.setName('case')
                        .setDescription('Case ID to undo')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for undoing the mute')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Remove a warning')
                .addStringOption(option =>
                    option.setName('case')
                        .setDescription('Case ID to undo')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for removing warning')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('strike')
                .setDescription('Remove a strike')
                .addStringOption(option =>
                    option.setName('case')
                        .setDescription('Case ID to undo')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for removing strike')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Remove timeout from user')
                .addStringOption(option =>
                    option.setName('case')
                        .setDescription('Case ID to undo')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for removing timeout')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('last')
                .setDescription('Undo the last moderation action')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User whose last action to undo')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for undoing')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bulk')
                .setDescription('Undo multiple actions by a moderator')
                .addUserOption(option =>
                    option.setName('moderator')
                        .setDescription('Moderator whose actions to undo')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of recent actions to undo')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for bulk undo')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'ban':
                await this.undoBan(interaction);
                break;
            case 'mute':
                await this.undoMute(interaction);
                break;
            case 'warn':
                await this.undoWarn(interaction);
                break;
            case 'strike':
                await this.undoStrike(interaction);
                break;
            case 'timeout':
                await this.undoTimeout(interaction);
                break;
            case 'last':
                await this.undoLast(interaction);
                break;
            case 'bulk':
                await this.undoBulk(interaction);
                break;
        }
    },

    async undoBan(interaction) {
        const caseId = interaction.options.getString('case');
        const reason = interaction.options.getString('reason') || 'Ban reversed by moderator';

        try {
            const punishment = await Punishment.findByCaseId(caseId, interaction.guild.id);
            
            if (!punishment || punishment.type !== 'ban') {
                return interaction.reply({ content: '❌ Ban case not found', ephemeral: true });
            }

            if (!punishment.active) {
                return interaction.reply({ content: '❌ This ban is already inactive', ephemeral: true });
            }

            // Unban the user
            await interaction.guild.members.unban(punishment.userID, `${reason} (Case: ${caseId})`);
            
            // Deactivate punishment
            await Punishment.deactivate(punishment.id);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Ban Reversed')
                .setColor('#00ff00')
                .addFields(
                    { name: 'User', value: `<@${punishment.userID}>`, inline: true },
                    { name: 'Original Case', value: caseId, inline: true },
                    { name: 'Reversed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error undoing ban:', error);
            await interaction.reply({ content: '❌ Failed to undo ban', ephemeral: true });
        }
    },

    async undoMute(interaction) {
        const caseId = interaction.options.getString('case');
        const reason = interaction.options.getString('reason') || 'Mute reversed by moderator';

        try {
            const punishment = await Punishment.findByCaseId(caseId, interaction.guild.id);
            
            if (!punishment || punishment.type !== 'mute') {
                return interaction.reply({ content: '❌ Mute case not found', ephemeral: true });
            }

            if (!punishment.active) {
                return interaction.reply({ content: '❌ This mute is already inactive', ephemeral: true });
            }

            const member = await interaction.guild.members.fetch(punishment.userID).catch(() => null);
            if (member) {
                // Remove timeout
                await member.timeout(null, `${reason} (Case: ${caseId})`);
            }
            
            // Deactivate punishment
            await Punishment.deactivate(punishment.id);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Mute Reversed')
                .setColor('#00ff00')
                .addFields(
                    { name: 'User', value: `<@${punishment.userID}>`, inline: true },
                    { name: 'Original Case', value: caseId, inline: true },
                    { name: 'Reversed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error undoing mute:', error);
            await interaction.reply({ content: '❌ Failed to undo mute', ephemeral: true });
        }
    },

    async undoWarn(interaction) {
        const caseId = interaction.options.getString('case');
        const reason = interaction.options.getString('reason') || 'Warning removed by moderator';

        try {
            const punishment = await Punishment.findByCaseId(caseId, interaction.guild.id);
            
            if (!punishment || punishment.type !== 'warn') {
                return interaction.reply({ content: '❌ Warning case not found', ephemeral: true });
            }

            if (!punishment.active) {
                return interaction.reply({ content: '❌ This warning is already inactive', ephemeral: true });
            }
            
            // Deactivate punishment
            await Punishment.deactivate(punishment.id);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Warning Removed')
                .setColor('#00ff00')
                .addFields(
                    { name: 'User', value: `<@${punishment.userID}>`, inline: true },
                    { name: 'Original Case', value: caseId, inline: true },
                    { name: 'Removed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error removing warning:', error);
            await interaction.reply({ content: '❌ Failed to remove warning', ephemeral: true });
        }
    },

    async undoStrike(interaction) {
        const caseId = interaction.options.getString('case');
        const reason = interaction.options.getString('reason') || 'Strike removed by moderator';

        try {
            // This would use the Strike schema
            const Strike = require('../../schemas/Strike');
            const strike = await Strike.findByCaseId(caseId, interaction.guild.id);
            
            if (!strike) {
                return interaction.reply({ content: '❌ Strike case not found', ephemeral: true });
            }

            if (!strike.active) {
                return interaction.reply({ content: '❌ This strike is already inactive', ephemeral: true });
            }
            
            // Deactivate strike
            await Strike.deactivate(strike.id);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Strike Removed')
                .setColor('#00ff00')
                .addFields(
                    { name: 'User', value: `<@${strike.userID}>`, inline: true },
                    { name: 'Original Case', value: caseId, inline: true },
                    { name: 'Removed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error removing strike:', error);
            await interaction.reply({ content: '❌ Failed to remove strike', ephemeral: true });
        }
    },

    async undoTimeout(interaction) {
        const caseId = interaction.options.getString('case');
        const reason = interaction.options.getString('reason') || 'Timeout removed by moderator';

        try {
            const punishment = await Punishment.findByCaseId(caseId, interaction.guild.id);
            
            if (!punishment || punishment.type !== 'timeout') {
                return interaction.reply({ content: '❌ Timeout case not found', ephemeral: true });
            }

            const member = await interaction.guild.members.fetch(punishment.userID).catch(() => null);
            if (member && member.isCommunicationDisabled()) {
                await member.timeout(null, `${reason} (Case: ${caseId})`);
            }
            
            // Deactivate punishment
            await Punishment.deactivate(punishment.id);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Timeout Removed')
                .setColor('#00ff00')
                .addFields(
                    { name: 'User', value: `<@${punishment.userID}>`, inline: true },
                    { name: 'Original Case', value: caseId, inline: true },
                    { name: 'Removed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error removing timeout:', error);
            await interaction.reply({ content: '❌ Failed to remove timeout', ephemeral: true });
        }
    },

    async undoLast(interaction) {
        const user = interaction.options.getUser('user');
        const targetUserId = user ? user.id : null;
        const reason = interaction.options.getString('reason') || 'Last action reversed by moderator';

        try {
            let lastPunishment;
            
            if (targetUserId) {
                // Get last punishment for specific user
                const punishments = await Punishment.findByUserId(targetUserId, interaction.guild.id, 1);
                lastPunishment = punishments[0];
            } else {
                // Get last punishment by this moderator
                const punishments = await Punishment.findByModId(interaction.user.id, interaction.guild.id, 1);
                lastPunishment = punishments[0];
            }

            if (!lastPunishment) {
                return interaction.reply({ content: '❌ No recent punishment found to undo', ephemeral: true });
            }

            if (!lastPunishment.active) {
                return interaction.reply({ content: '❌ The last punishment is already inactive', ephemeral: true });
            }

            // Undo based on punishment type
            await this.undoPunishmentByType(interaction, lastPunishment, reason);

        } catch (error) {
            console.error('Error undoing last action:', error);
            await interaction.reply({ content: '❌ Failed to undo last action', ephemeral: true });
        }
    },

    async undoBulk(interaction) {
        const moderator = interaction.options.getUser('moderator');
        const count = interaction.options.getInteger('count');
        const reason = interaction.options.getString('reason') || 'Bulk undo by administrator';

        try {
            const punishments = await Punishment.findByModId(moderator.id, interaction.guild.id, count);
            
            if (punishments.length === 0) {
                return interaction.reply({ content: '❌ No recent punishments found for this moderator', ephemeral: true });
            }

            const activePunishments = punishments.filter(p => p.active);
            
            if (activePunishments.length === 0) {
                return interaction.reply({ content: '❌ No active punishments found to undo', ephemeral: true });
            }

            await interaction.deferReply();

            let undoCount = 0;
            for (const punishment of activePunishments) {
                try {
                    await this.undoPunishmentByType(interaction, punishment, reason, true);
                    undoCount++;
                } catch (error) {
                    console.error(`Failed to undo punishment ${punishment.caseID}:`, error);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔄 Bulk Undo Complete')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
                    { name: 'Actions Undone', value: `${undoCount}/${activePunishments.length}`, inline: true },
                    { name: 'Performed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error performing bulk undo:', error);
            await interaction.editReply({ content: '❌ Failed to perform bulk undo' });
        }
    },

    async undoPunishmentByType(interaction, punishment, reason, isBulk = false) {
        const member = await interaction.guild.members.fetch(punishment.userID).catch(() => null);

        switch (punishment.type) {
            case 'ban':
                await interaction.guild.members.unban(punishment.userID, `${reason} (Case: ${punishment.caseID})`);
                break;
            case 'mute':
            case 'timeout':
                if (member) {
                    await member.timeout(null, `${reason} (Case: ${punishment.caseID})`);
                }
                break;
            // warn and other types just need to be deactivated
        }

        await Punishment.deactivate(punishment.id);

        if (!isBulk) {
            const embed = new EmbedBuilder()
                .setTitle(`🔄 ${punishment.type.charAt(0).toUpperCase() + punishment.type.slice(1)} Reversed`)
                .setColor('#00ff00')
                .addFields(
                    { name: 'User', value: `<@${punishment.userID}>`, inline: true },
                    { name: 'Original Case', value: punishment.caseID, inline: true },
                    { name: 'Reversed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
};
