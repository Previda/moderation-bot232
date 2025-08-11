const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createPunishment } = require('../../utils/punishmentUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for warning')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('silent')
                .setDescription('Don\'t send DM to user')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const silent = interaction.options.getBoolean('silent') || false;

        try {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);

            // Create punishment record
            const punishment = await createPunishment({
                userID: user.id,
                modID: interaction.user.id,
                guildID: interaction.guild.id,
                type: 'warn',
                reason
            });

            // Try to DM the user if not silent
            let dmSent = false;
            if (!silent) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('⚠️ You have been warned')
                        .setColor(0xffff00)
                        .addFields(
                            { name: '🏠 Server', value: interaction.guild.name, inline: true },
                            { name: '👤 Moderator', value: interaction.user.tag, inline: true },
                            { name: '📝 Reason', value: reason, inline: false },
                            { name: '🆔 Case ID', value: punishment.caseID, inline: true },
                            { name: '📞 Appeal', value: `DM me with \`!appeal ${punishment.caseID}\` to appeal`, inline: false }
                        )
                        .setTimestamp();

                    await user.send({ embeds: [dmEmbed] });
                    dmSent = true;
                } catch (error) {
                    console.log('Could not DM warned user');
                }
            }

            // Send success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('⚠️ User Warned')
                .setColor(0xffff00)
                .addFields(
                    { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '🆔 Case ID', value: punishment.caseID, inline: true },
                    { name: '📨 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `User can appeal with: !appeal ${punishment.caseID}` });

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Warn command error:', error);
            await interaction.reply({
                content: '❌ Failed to warn user. Check permissions and try again.',
                ephemeral: true
            });
        }
    }
};
