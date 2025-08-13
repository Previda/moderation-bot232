const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset/undo economy and user data')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Reset user balance')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to reset balance for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for balance reset')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('daily')
                .setDescription('Reset daily cooldown for user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to reset daily for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for daily reset')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('work')
                .setDescription('Reset work cooldown for user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to reset work cooldown for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for work reset')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('level')
                .setDescription('Reset user level and XP')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to reset level for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for level reset')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('economy-all')
                .setDescription('Reset all economy data for user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to completely reset')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for complete reset')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('server-economy')
                .setDescription('Reset economy for entire server')
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm server-wide economy reset')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for server reset')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Reset economy leaderboard positions')
                .addBooleanOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirm leaderboard reset')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for leaderboard reset')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'balance':
                await this.resetBalance(interaction);
                break;
            case 'daily':
                await this.resetDaily(interaction);
                break;
            case 'work':
                await this.resetWork(interaction);
                break;
            case 'level':
                await this.resetLevel(interaction);
                break;
            case 'economy-all':
                await this.resetEconomyAll(interaction);
                break;
            case 'server-economy':
                await this.resetServerEconomy(interaction);
                break;
            case 'leaderboard':
                await this.resetLeaderboard(interaction);
                break;
        }
    },

    async resetBalance(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Balance reset by administrator';

        try {
            // Get current balance first
            const [rows] = await pool.execute(
                'SELECT balance FROM user_economy WHERE userID = ? AND guildID = ?',
                [user.id, interaction.guild.id]
            );

            const oldBalance = rows[0]?.balance || 0;

            // Reset balance to 0
            await pool.execute(
                'INSERT INTO user_economy (userID, guildID, balance) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE balance = 0',
                [user.id, interaction.guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('💰 Balance Reset')
                .setColor('#ff9900')
                .addFields(
                    { name: 'User', value: `<@${user.id}>`, inline: true },
                    { name: 'Previous Balance', value: `${oldBalance} coins`, inline: true },
                    { name: 'New Balance', value: '0 coins', inline: true },
                    { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting balance:', error);
            await interaction.reply({ content: '❌ Failed to reset balance', ephemeral: true });
        }
    },

    async resetDaily(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Daily cooldown reset by administrator';

        try {
            // Reset daily cooldown
            await pool.execute(
                'UPDATE user_economy SET lastDaily = NULL WHERE userID = ? AND guildID = ?',
                [user.id, interaction.guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('📅 Daily Cooldown Reset')
                .setColor('#00ff00')
                .addFields(
                    { name: 'User', value: `<@${user.id}>`, inline: true },
                    { name: 'Status', value: 'Can claim daily immediately', inline: true },
                    { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting daily:', error);
            await interaction.reply({ content: '❌ Failed to reset daily cooldown', ephemeral: true });
        }
    },

    async resetWork(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Work cooldown reset by administrator';

        try {
            // Reset work cooldown
            await pool.execute(
                'UPDATE user_economy SET lastWork = NULL WHERE userID = ? AND guildID = ?',
                [user.id, interaction.guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('🔨 Work Cooldown Reset')
                .setColor('#00ff00')
                .addFields(
                    { name: 'User', value: `<@${user.id}>`, inline: true },
                    { name: 'Status', value: 'Can work immediately', inline: true },
                    { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting work:', error);
            await interaction.reply({ content: '❌ Failed to reset work cooldown', ephemeral: true });
        }
    },

    async resetLevel(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Level reset by administrator';

        try {
            // Get current level/XP first
            const [rows] = await pool.execute(
                'SELECT level, xp FROM user_economy WHERE userID = ? AND guildID = ?',
                [user.id, interaction.guild.id]
            );

            const oldLevel = rows[0]?.level || 1;
            const oldXP = rows[0]?.xp || 0;

            // Reset level and XP
            await pool.execute(
                'UPDATE user_economy SET level = 1, xp = 0 WHERE userID = ? AND guildID = ?',
                [user.id, interaction.guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('⭐ Level Reset')
                .setColor('#ff9900')
                .addFields(
                    { name: 'User', value: `<@${user.id}>`, inline: true },
                    { name: 'Previous Level', value: `${oldLevel} (${oldXP} XP)`, inline: true },
                    { name: 'New Level', value: '1 (0 XP)', inline: true },
                    { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting level:', error);
            await interaction.reply({ content: '❌ Failed to reset level', ephemeral: true });
        }
    },

    async resetEconomyAll(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Complete economy reset by administrator';

        try {
            // Get current data first
            const [rows] = await pool.execute(
                'SELECT balance, level, xp FROM user_economy WHERE userID = ? AND guildID = ?',
                [user.id, interaction.guild.id]
            );

            const oldData = rows[0] || { balance: 0, level: 1, xp: 0 };

            // Complete reset
            await pool.execute(
                'INSERT INTO user_economy (userID, guildID, balance, level, xp, lastDaily, lastWork) VALUES (?, ?, 0, 1, 0, NULL, NULL) ON DUPLICATE KEY UPDATE balance = 0, level = 1, xp = 0, lastDaily = NULL, lastWork = NULL',
                [user.id, interaction.guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('🔄 Complete Economy Reset')
                .setColor('#ff0000')
                .addFields(
                    { name: 'User', value: `<@${user.id}>`, inline: true },
                    { name: 'Previous Data', value: `${oldData.balance} coins\nLevel ${oldData.level} (${oldData.xp} XP)`, inline: true },
                    { name: 'New Data', value: '0 coins\nLevel 1 (0 XP)\nAll cooldowns reset', inline: true },
                    { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting economy:', error);
            await interaction.reply({ content: '❌ Failed to reset economy data', ephemeral: true });
        }
    },

    async resetServerEconomy(interaction) {
        const confirm = interaction.options.getBoolean('confirm');
        const reason = interaction.options.getString('reason') || 'Server-wide economy reset by administrator';

        if (!confirm) {
            return interaction.reply({ 
                content: '❌ You must confirm the server-wide economy reset by setting confirm to true', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply();

            // Get count of affected users
            const [countRows] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_economy WHERE guildID = ?',
                [interaction.guild.id]
            );

            const affectedUsers = countRows[0].count;

            // Reset all economy data for the server
            await pool.execute(
                'UPDATE user_economy SET balance = 0, level = 1, xp = 0, lastDaily = NULL, lastWork = NULL WHERE guildID = ?',
                [interaction.guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('🔄 Server Economy Reset')
                .setColor('#ff0000')
                .addFields(
                    { name: 'Server', value: interaction.guild.name, inline: true },
                    { name: 'Affected Users', value: `${affectedUsers}`, inline: true },
                    { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Changes', value: '• All balances set to 0\n• All levels reset to 1\n• All XP reset to 0\n• All cooldowns cleared', inline: false },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting server economy:', error);
            await interaction.editReply({ content: '❌ Failed to reset server economy' });
        }
    },

    async resetLeaderboard(interaction) {
        const confirm = interaction.options.getBoolean('confirm');
        const reason = interaction.options.getString('reason') || 'Leaderboard reset by administrator';

        if (!confirm) {
            return interaction.reply({ 
                content: '❌ You must confirm the leaderboard reset by setting confirm to true', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply();

            // Reset all balances and levels to create fresh leaderboard
            const [result] = await pool.execute(
                'UPDATE user_economy SET balance = 0, level = 1, xp = 0 WHERE guildID = ?',
                [interaction.guild.id]
            );

            const embed = new EmbedBuilder()
                .setTitle('🏆 Leaderboard Reset')
                .setColor('#ffaa00')
                .addFields(
                    { name: 'Server', value: interaction.guild.name, inline: true },
                    { name: 'Users Affected', value: `${result.affectedRows}`, inline: true },
                    { name: 'Reset By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Status', value: 'Fresh leaderboard - everyone starts equal!', inline: false },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error resetting leaderboard:', error);
            await interaction.editReply({ content: '❌ Failed to reset leaderboard' });
        }
    }
};
