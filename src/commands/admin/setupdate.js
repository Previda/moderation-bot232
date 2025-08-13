const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupdate')
        .setDescription('Set temporary update message for bot status')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Update message to display')
                .setRequired(true)),

    async execute(interaction) {
        const updateMessage = interaction.options.getString('message');

        try {
            // Set bot activity to the update message
            await interaction.client.user.setActivity(updateMessage, { type: 'WATCHING' });

            const embed = new EmbedBuilder()
                .setTitle('📢 Update Message Set')
                .setDescription(`Bot status updated to: **${updateMessage}**`)
                .setColor(0x00ff00)
                .addFields(
                    { name: '⏰ Duration', value: 'Until bot restart', inline: true },
                    { name: '👀 Visibility', value: 'All servers', inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Setup update error:', error);
            await interaction.reply({
                content: '❌ Failed to set update message.',
                ephemeral: true
            });
        }
    }
};
