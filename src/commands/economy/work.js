const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn money and XP'),

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
                    'INSERT INTO user_economy (userID, guildID, balance, bank, level, xp, lastWork) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [user.id, guild.id, 100, 0, 1, 0, null]
                );
                userData = { balance: 100, bank: 0, level: 1, xp: 0, lastWork: null };
            }

            // Check if user can work (cooldown)
            const now = new Date();
            const lastWork = userData.lastWork ? new Date(userData.lastWork) : null;
            
            if (lastWork) {
                const timeDiff = now - lastWork;
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                
                if (hoursDiff < 1) {
                    const minutesLeft = Math.ceil(60 - (hoursDiff * 60));
                    return interaction.reply({
                        content: `⏰ You can work again in ${minutesLeft} minutes!`,
                        ephemeral: true
                    });
                }
            }

            // Work jobs with different payouts and success rates
            const jobs = [
                { name: 'Pizza Delivery', pay: [50, 150], xp: [10, 25], success: 0.85 },
                { name: 'Dog Walker', pay: [30, 100], xp: [8, 20], success: 0.90 },
                { name: 'Uber Driver', pay: [80, 200], xp: [15, 30], success: 0.75 },
                { name: 'Freelance Coding', pay: [100, 300], xp: [20, 40], success: 0.70 },
                { name: 'Lawn Mowing', pay: [40, 120], xp: [12, 22], success: 0.88 },
                { name: 'Tutoring', pay: [60, 180], xp: [18, 35], success: 0.80 },
                { name: 'Food Delivery', pay: [45, 130], xp: [10, 24], success: 0.87 },
                { name: 'House Cleaning', pay: [70, 160], xp: [14, 28], success: 0.82 },
                { name: 'Freelance Coding', pay: [100, 300], xp: [20, 40] },
                { name: 'Uber Driver', pay: [75, 200], xp: [15, 30] },
                { name: 'Tutoring', pay: [60, 180], xp: [12, 28] },
                { name: 'Lawn Mowing', pay: [40, 120], xp: [10, 22] }
            ];

            const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
            const earnings = Math.floor(Math.random() * (randomJob.pay[1] - randomJob.pay[0] + 1)) + randomJob.pay[0];
            const xpGained = Math.floor(Math.random() * (randomJob.xp[1] - randomJob.xp[0] + 1)) + randomJob.xp[0];

            // Level bonus
            const levelBonus = Math.floor(earnings * (userData.level * 0.1));
            const totalEarnings = earnings + levelBonus;

            // Check for level up
            const newXP = userData.xp + xpGained;
            const xpNeeded = userData.level * 100;
            let leveledUp = false;
            let newLevel = userData.level;

            if (newXP >= xpNeeded) {
                newLevel = userData.level + 1;
                leveledUp = true;
            }

            // Update user's balance, XP, and last work time
            await pool.execute(
                'UPDATE user_economy SET balance = balance + ?, xp = ?, level = ?, lastWork = NOW() WHERE userID = ? AND guildID = ?',
                [totalEarnings, newXP, newLevel, user.id, guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('💼 Work Complete!')
                .setColor(0x00ff00)
                .setDescription(`You worked as a **${randomJob.name}**`)
                .addFields(
                    { name: '💵 Base Pay', value: `$${earnings.toLocaleString()}`, inline: true },
                    { name: '⭐ Level Bonus', value: `$${levelBonus.toLocaleString()}`, inline: true },
                    { name: '💰 Total Earned', value: `$${totalEarnings.toLocaleString()}`, inline: true },
                    { name: '✨ XP Gained', value: `${xpGained} XP`, inline: true },
                    { name: '📊 Current Level', value: `${newLevel}`, inline: true },
                    { name: '⏰ Next Work', value: '1 hour', inline: true }
                )
                .setTimestamp();

            if (leveledUp) {
                embed.addFields(
                    { name: '🎉 LEVEL UP!', value: `You reached level ${newLevel}!`, inline: false }
                );
                embed.setColor(0xffd700);
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Work command error:', error);
            await interaction.reply({
                content: '❌ Failed to complete work.',
                ephemeral: true
            });
        }
    }
};
