const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your or another user\'s balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check balance for')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            // Get user's economy data
            const [rows] = await pool.execute(
                'SELECT * FROM user_economy WHERE userID = ? AND guildID = ?',
                [targetUser.id, interaction.guild.id]
            );

            let userData = rows[0];
            if (!userData) {
                // Create new user economy record
                await pool.execute(
                    'INSERT INTO user_economy (userID, guildID, balance, bank, level, xp) VALUES (?, ?, ?, ?, ?, ?)',
                    [targetUser.id, interaction.guild.id, 100, 0, 1, 0]
                );
                userData = { balance: 100, bank: 0, level: 1, xp: 0 };
            }

            const embed = new EmbedBuilder()
                .setTitle(`💰 ${targetUser.username}'s Economy`)
                .setColor(0x00ff00)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: '💵 Wallet', value: `$${userData.balance.toLocaleString()}`, inline: true },
                    { name: '🏦 Bank', value: `$${userData.bank.toLocaleString()}`, inline: true },
                    { name: '💎 Net Worth', value: `$${(userData.balance + userData.bank).toLocaleString()}`, inline: true },
                    { name: '⭐ Level', value: `${userData.level}`, inline: true },
                    { name: '✨ XP', value: `${userData.xp}`, inline: true },
                    { name: '📈 Next Level', value: `${userData.level * 100 - userData.xp} XP`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Balance command error:', error);
            await interaction.reply({
                content: '❌ Failed to retrieve balance information.',
                ephemeral: true
            });
        }
    }
};
