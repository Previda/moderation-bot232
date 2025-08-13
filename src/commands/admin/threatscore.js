const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getThreatScore, resetThreatScore, getAllThreatScores } = require('../../utils/threatScore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('threatscore')
        .setDescription('Manage user threat scores')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View a user\'s threat score')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to check')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Reset a user\'s threat score')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to reset')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List all threat scores in this server')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildID = interaction.guild.id;

        try {
            if (subcommand === 'view') {
                const user = interaction.options.getUser('user');
                const threatData = await getThreatScore(user.id, guildID);

                const embed = new EmbedBuilder()
                    .setTitle('🎯 Threat Score')
                    .setColor(threatData.score > 5 ? 0xff0000 : threatData.score > 2 ? 0xff8800 : 0x00ff00)
                    .addFields(
                        { name: '👤 User', value: `<@${user.id}>`, inline: true },
                        { name: '⚠️ Threat Score', value: `${threatData.score}`, inline: true },
                        { name: '📅 Last Updated', value: `<t:${Math.floor(new Date(threatData.lastIncrement).getTime() / 1000)}:R>`, inline: true }
                    )
                    .setThumbnail(user.displayAvatarURL())
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'reset') {
                const user = interaction.options.getUser('user');
                const success = await resetThreatScore(user.id, guildID);

                if (success) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Threat Score Reset')
                        .setDescription(`Reset threat score for <@${user.id}>`)
                        .setColor(0x00ff00)
                        .addFields(
                            { name: '👤 User', value: `<@${user.id}>`, inline: true },
                            { name: '🔄 New Score', value: '0', inline: true },
                            { name: '👮 Reset By', value: `<@${interaction.user.id}>`, inline: true }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                } else {
                    await interaction.reply({
                        content: '❌ Failed to reset threat score.',
                        ephemeral: true
                    });
                }

            } else if (subcommand === 'list') {
                const allScores = await getAllThreatScores(guildID);

                if (allScores.length === 0) {
                    return interaction.reply({
                        content: '📊 No threat scores found in this server.',
                        ephemeral: true
                    });
                }

                const embed = new EmbedBuilder()
                    .setTitle('📊 Server Threat Scores')
                    .setColor(0x0099ff)
                    .setDescription('Users with recorded threat scores:')
                    .setTimestamp();

                // Show top 10 threat scores
                const topScores = allScores.slice(0, 10);
                let description = '';

                for (let i = 0; i < topScores.length; i++) {
                    const score = topScores[i];
                    const emoji = score.score > 5 ? '🔴' : score.score > 2 ? '🟡' : '🟢';
                    description += `${emoji} <@${score.userID}> - **${score.score}** points\n`;
                }

                embed.addFields(
                    { name: '🏆 Top Threat Scores', value: description || 'None', inline: false },
                    { name: '📈 Total Users', value: `${allScores.length}`, inline: true },
                    { name: '⚠️ High Risk (>5)', value: `${allScores.filter(s => s.score > 5).length}`, inline: true },
                    { name: '🟡 Medium Risk (3-5)', value: `${allScores.filter(s => s.score >= 3 && s.score <= 5).length}`, inline: true }
                );

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Threatscore command error:', error);
            await interaction.reply({
                content: '❌ Failed to execute threat score command.',
                ephemeral: true
            });
        }
    }
};
