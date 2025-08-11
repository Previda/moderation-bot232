const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set channel slowmode')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Slowmode duration in seconds (0 to disable, max 21600)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to set slowmode for (current channel if not specified)')
                .setRequired(false)),

    async execute(interaction) {
        const duration = interaction.options.getInteger('duration');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await channel.setRateLimitPerUser(duration);

            const embed = new EmbedBuilder()
                .setTitle('⏱️ Slowmode Updated')
                .setColor(duration === 0 ? 0xff0000 : 0x00ff00)
                .addFields(
                    { name: '📍 Channel', value: channel.toString(), inline: true },
                    { name: '⏱️ Duration', value: duration === 0 ? 'Disabled' : `${duration} seconds`, inline: true },
                    { name: '👤 Set by', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Slowmode command error:', error);
            await interaction.reply({
                content: '❌ Failed to set slowmode. Check permissions and try again.',
                ephemeral: true
            });
        }
    }
};
