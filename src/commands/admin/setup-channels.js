const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-channels')
        .setDescription('Setup mod log and appeals channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('modlog')
                .setDescription('Channel for moderation logs')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('appeals')
                .setDescription('Channel for appeals')
                .setRequired(false)),

    async execute(interaction) {
        const modLogChannel = interaction.options.getChannel('modlog');
        const appealsChannel = interaction.options.getChannel('appeals');
        const guildId = interaction.guild.id;

        try {
            // Get or create guild config
            const [rows] = await pool.execute(
                'SELECT * FROM guild_configs WHERE guildID = ?',
                [guildId]
            );

            if (rows.length === 0) {
                // Create new config
                await pool.execute(
                    'INSERT INTO guild_configs (guildID, modLogChannel, appealsChannel) VALUES (?, ?, ?)',
                    [guildId, modLogChannel?.id || null, appealsChannel?.id || null]
                );
            } else {
                // Update existing config
                await pool.execute(
                    'UPDATE guild_configs SET modLogChannel = ?, appealsChannel = ? WHERE guildID = ?',
                    [modLogChannel?.id || null, appealsChannel?.id || null, guildId]
                );
            }

            const embed = new EmbedBuilder()
                .setTitle('⚙️ Channel Setup Complete')
                .setColor(0x00ff00)
                .addFields(
                    { 
                        name: '📋 Mod Log Channel', 
                        value: modLogChannel ? `<#${modLogChannel.id}>` : 'Not set', 
                        inline: true 
                    },
                    { 
                        name: '📝 Appeals Channel', 
                        value: appealsChannel ? `<#${appealsChannel.id}>` : 'Not set', 
                        inline: true 
                    }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Setup channels error:', error);
            await interaction.reply({
                content: '❌ Failed to setup channels.',
                ephemeral: true
            });
        }
    }
};
