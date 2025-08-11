const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createPunishment } = require('../../utils/punishmentUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to mute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for mute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Mute duration (e.g., 10m, 1h, 1d)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('silent')
                .setDescription('Don\'t send DM to user')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const duration = interaction.options.getString('duration');
        const silent = interaction.options.getBoolean('silent') || false;

        try {
            const member = await interaction.guild.members.fetch(user.id);

            if (!member) {
                return interaction.reply({
                    content: '❌ User not found in this server.',
                    ephemeral: true
                });
            }

            // Calculate timeout duration
            let timeoutDuration = null;
            if (duration) {
                timeoutDuration = parseDuration(duration);
                if (!timeoutDuration) {
                    return interaction.reply({
                        content: '❌ Invalid duration format. Use: 10m, 1h, 1d, etc.',
                        ephemeral: true
                    });
                }
            }

            // Apply timeout
            await member.timeout(timeoutDuration, `${reason} (by ${interaction.user.tag})`);

            // Create punishment record
            const punishment = await createPunishment({
                userID: user.id,
                modID: interaction.user.id,
                guildID: interaction.guild.id,
                type: 'mute',
                reason: duration ? `${reason} (Duration: ${duration})` : reason
            });

            // Try to DM the user if not silent
            let dmSent = false;
            if (!silent) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('🔇 You have been muted')
                        .setColor(0x8800ff)
                        .addFields(
                            { name: '🏠 Server', value: interaction.guild.name, inline: true },
                            { name: '👤 Moderator', value: interaction.user.tag, inline: true },
                            { name: '📝 Reason', value: reason, inline: false },
                            { name: '⏱️ Duration', value: duration || 'Indefinite', inline: true },
                            { name: '🆔 Case ID', value: punishment.caseID, inline: true },
                            { name: '📞 Appeal', value: `DM me with \`!appeal ${punishment.caseID}\` to appeal`, inline: false }
                        )
                        .setTimestamp();

                    await user.send({ embeds: [dmEmbed] });
                    dmSent = true;
                } catch (error) {
                    console.log('Could not DM muted user');
                }
            }

            // Send success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('🔇 User Muted')
                .setColor(0x8800ff)
                .addFields(
                    { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '👮 Moderator', value: interaction.user.tag, inline: true },
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '⏱️ Duration', value: duration || 'Indefinite', inline: true },
                    { name: '🆔 Case ID', value: punishment.caseID, inline: true },
                    { name: '📨 DM Sent', value: dmSent ? '✅ Yes' : '❌ No', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `User can appeal with: !appeal ${punishment.caseID}` });

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Mute command error:', error);
            await interaction.reply({
                content: '❌ Failed to mute user. Check permissions and try again.',
                ephemeral: true
            });
        }
    }
};

function parseDuration(duration) {
    const regex = /^(\d+)([smhd])$/;
    const match = duration.match(regex);
    
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };
    
    const result = value * multipliers[unit];
    return result > 2419200000 ? 2419200000 : result; // Max 28 days
}
