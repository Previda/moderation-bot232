const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward'),

    async execute(interaction) {
        const user = interaction.user;
        const guild = interaction.guild;

        try {
            // Get user's economy data
            const [rows] = await pool.execute(
                'SELECT * FROM user_economy WHERE userID = ? AND guildID = ?',
                [user.id, guild.id]
            );

            let userData = rows[0];
            if (!userData) {
                // Create new user economy record
                await pool.execute(
                    'INSERT INTO user_economy (userID, guildID, balance, bank, level, xp, lastDaily) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [user.id, guild.id, 100, 0, 1, 0, null]
                );
                userData = { balance: 100, bank: 0, level: 1, xp: 0, lastDaily: null };
            }

            // Check if user can claim daily
            const now = new Date();
            const lastDaily = userData.lastDaily ? new Date(userData.lastDaily) : null;
            
            if (lastDaily) {
                const timeDiff = now - lastDaily;
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    const hoursLeft = Math.ceil(24 - hoursDiff);
                    return interaction.reply({
                        content: `⏰ You can claim your daily reward in ${hoursLeft} hours!`,
                        ephemeral: true
                    });
                }
            }

            // Calculate daily reward (base + level bonus)
            const baseReward = 100;
            const levelBonus = userData.level * 10;
            const totalReward = baseReward + levelBonus;

            // Update user's balance and last daily
            await pool.execute(
                'UPDATE user_economy SET balance = balance + ?, lastDaily = NOW() WHERE userID = ? AND guildID = ?',
                [totalReward, user.id, guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('🎁 Daily Reward Claimed!')
                .setColor(0x00ff00)
                .setDescription(`You received **$${totalReward.toLocaleString()}**!`)
                .addFields(
                    { name: '💵 Base Reward', value: `$${baseReward}`, inline: true },
                    { name: '⭐ Level Bonus', value: `$${levelBonus}`, inline: true },
                    { name: '💰 Total', value: `$${totalReward}`, inline: true }
                )
                .setFooter({ text: 'Come back tomorrow for another reward!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Daily command error:', error);
            await interaction.reply({
                content: '❌ Failed to claim daily reward.',
                ephemeral: true
            });
        }
    }
};
