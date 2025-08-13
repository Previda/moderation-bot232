const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure automoderation settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('level')
                .setDescription('Set automoderation level')
                .addStringOption(opt =>
                    opt.setName('level')
                        .setDescription('Level (low, medium, high, custom)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Low', value: 'low' },
                            { name: 'Medium', value: 'medium' },
                            { name: 'High', value: 'high' },
                            { name: 'Custom', value: 'custom' }
                        )))
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current automod config')),

    async execute(interaction) {
        const guildID = interaction.guild.id;

        try {
            // Get guild config from MySQL
            const [rows] = await pool.execute(
                'SELECT * FROM guild_configs WHERE guildID = ?',
                [guildID]
            );

            let config = rows[0];
            if (!config) {
                // Create default config
                await pool.execute(
                    'INSERT INTO guild_configs (guildID, automodLevel, automodConfig) VALUES (?, ?, ?)',
                    [guildID, 'medium', JSON.stringify(getDefaultConfig('medium'))]
                );
                config = { automodLevel: 'medium', automodConfig: JSON.stringify(getDefaultConfig('medium')) };
            }

            if (interaction.options.getSubcommand() === 'level') {
                const level = interaction.options.getString('level');
                const newConfig = getDefaultConfig(level);

                await pool.execute(
                    'UPDATE guild_configs SET automodLevel = ?, automodConfig = ? WHERE guildID = ?',
                    [level, JSON.stringify(newConfig), guildID]
                );

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Automod Level Updated')
                    .setColor(0x00ff00)
                    .addFields(
                        { name: 'Level', value: level.toUpperCase(), inline: true },
                        { name: 'Anti-Spam', value: newConfig.antiSpam ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Anti-Invite', value: newConfig.antiInvite ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Anti-NSFW', value: newConfig.antiNSFW ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Caps Flood', value: newConfig.capsFlood ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Emoji Flood', value: newConfig.emojiFlood ? '✅ Enabled' : '❌ Disabled', inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            if (interaction.options.getSubcommand() === 'view') {
                const automodConfig = config.automodConfig ? JSON.parse(config.automodConfig) : getDefaultConfig('medium');

                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Current Automod Configuration')
                    .setColor(0x0099ff)
                    .addFields(
                        { name: 'Level', value: (config.automodLevel || 'medium').toUpperCase(), inline: true },
                        { name: 'Anti-Spam', value: automodConfig.antiSpam ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Anti-Invite', value: automodConfig.antiInvite ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Anti-NSFW', value: automodConfig.antiNSFW ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Caps Flood', value: automodConfig.capsFlood ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Emoji Flood', value: automodConfig.emojiFlood ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Warn Threshold', value: `${automodConfig.warnThreshold || 3}`, inline: true },
                        { name: 'Mute Threshold', value: `${automodConfig.muteThreshold || 5}`, inline: true },
                        { name: 'Mute Duration', value: `${automodConfig.muteDuration || 300}s`, inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Automod command error:', error);
            await interaction.reply({
                content: '❌ Failed to configure automod settings.',
                ephemeral: true
            });
        }
    }
};

function getDefaultConfig(level) {
    const configs = {
        low: {
            antiSpam: true,
            antiInvite: false,
            antiNSFW: true,
            capsFlood: false,
            emojiFlood: false,
            warnThreshold: 5,
            muteThreshold: 8,
            muteDuration: 300
        },
        medium: {
            antiSpam: true,
            antiInvite: true,
            antiNSFW: true,
            capsFlood: true,
            emojiFlood: false,
            warnThreshold: 3,
            muteThreshold: 5,
            muteDuration: 600
        },
        high: {
            antiSpam: true,
            antiInvite: true,
            antiNSFW: true,
            capsFlood: true,
            emojiFlood: true,
            warnThreshold: 2,
            muteThreshold: 3,
            muteDuration: 900
        }
    };

    return configs[level] || configs.medium;
}
