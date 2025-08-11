const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createPunishment } = require('../../utils/punishmentUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to ban')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('User ID to ban (if user not in server)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for ban')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('delete_days')
                .setDescription('Days of messages to delete (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .addBooleanOption(option =>
            option.setName('silent')
                .setDescription('Don\'t send DM to user')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const userId = user ? user.id : interaction.options.getString('userid');
        const reason = interaction.options.getString('reason');
        const deleteDays = interaction.options.getInteger('delete_days') || 0;
        const silent = interaction.options.getBoolean('silent') || false;

        if (!userId) {
            return interaction.reply({ 
                content: '❌ Please specify a user or user ID.', 
                ephemeral: true 
            });
        }

        try {
            // Try to get member and user info
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            const targetUser = user || await interaction.client.users.fetch(userId).catch(() => null);
            
            // Ban the user
            await interaction.guild.members.ban(userId, { 
                reason: `${reason} (by ${interaction.user.tag})`,
                deleteMessageDays: deleteDays
            });

            // Create punishment record
            const punishment = await createPunishment({
                userID: userId,
                modID: interaction.user.id,
                guildID: interaction.guild.id,
                type: 'ban',
                reason
            });

            // Try to DM the user if not silent
            let dmSent = false;
            if (!silent && targetUser) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('🔨 You have been banned')
                        .setColor(0xff0000)
                        .addFields(
                            { name: '🏠 Server', value: interaction.guild.name, inline: true },
                            { name: '👤 Moderator', value: interaction.user.tag, inline: true },
                            { name: '📝 Reason', value: reason, inline: false },
                            { name: '🆔 Case ID', value: punishment.caseID, inline: true },
                            { name: '📞 Appeal', value: `DM me with \`!appeal ${punishment.caseID}\` to appeal`, inline: false }
                        )
                        .setTimestamp();

                    await targetUser.send({ embeds: [dmEmbed] });
                    dmSent = true;
                } catch (error) {
                    console.log('Could not DM banned user');
                }
            }

            // Send success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('🔨 User Banned')
                .setColor(0xff0000)
                .addFields(
                    { name: '👤 User', value: targetUser ? `${targetUser.tag} (${userId})` : userId, inline: true },
                    { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '🆔 Case ID', value: punishment.caseID, inline: true },
                    { name: '🗑️ Messages Deleted', value: `${deleteDays} day(s)`, inline: true },
                    { name: '📨 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `User can appeal with: !appeal ${punishment.caseID}` });

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Ban command error:', error);
            await interaction.reply({
                content: '❌ Failed to ban user. Check permissions and try again.',
                ephemeral: true
            });
        }
    }
};
