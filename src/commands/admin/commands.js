const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commands')
        .setDescription('View all available bot commands and features'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Sapphire ModBot - Complete Command List')
            .setDescription('**Advanced Discord Moderation Bot with Interactive Menus**')
            .setColor(0x0099ff)
            .addFields(
                {
                    name: '🔨 Moderation Commands',
                    value: '`/ban` - Ban user (with message deletion, silent mode)\n`/kick` - Kick user with case tracking\n`/warn` - Warn user with appeal system\n`/mute` - Mute user with duration support\n`/slowmode` - Set channel slowmode (0-21600s)\n`/modstats` - View moderation statistics',
                    inline: false
                },
                {
                    name: '🎫 Ticket System',
                    value: '`/ticket open` - Open support ticket\n`/ticket close` - Close with transcript\n`/ticket add/remove` - Manage participants\n`/ticket transcript` - Generate HTML export\n`/manage menu` - **Interactive ticket menu**\n`/manage list` - List all open tickets\n`/manage create` - Create ticket for user',
                    inline: false
                },
                {
                    name: '📝 Appeals System',
                    value: '`/appeal submit` - Submit punishment appeal\n`/appeal status` - Check appeal status\n`/appeal review` - Review appeals (Staff)\n**DM Commands:** `!case <ID>`, `!appeal <ID>`',
                    inline: false
                },
                {
                    name: '💰 Economy System',
                    value: '`/balance` - Check wallet, bank, level, XP\n`/daily` - Claim daily rewards with bonuses\n**Features:** Level progression, XP tracking',
                    inline: false
                },
                {
                    name: '🛠️ Utilities',
                    value: '`/userinfo` - Comprehensive user information\n`/tempsys` - Raspberry Pi system stats\n**Interactive:** `!ticket` menu in channels',
                    inline: false
                },
                {
                    name: '📱 DM Commands (Private Message Bot)',
                    value: '`!case CASE-ABC123` - Look up case details\n`!appeal CASE-ABC123` - Start appeal process\n`!help` - Show DM command help',
                    inline: false
                },
                {
                    name: '🎛️ Interactive Features',
                    value: '• **Ticket Menu:** Type `!ticket` for staff controls\n• **Rich Embeds:** Beautiful formatted responses\n• **Modal Forms:** Easy input for appeals/tickets\n• **Button Interactions:** Quick actions\n• **Auto Transcripts:** HTML conversation exports',
                    inline: false
                },
                {
                    name: '🔧 Advanced Features',
                    value: '• **Case System:** Unique IDs for all punishments\n• **Appeal Integration:** DM-based appeal process\n• **User Mentions:** Auto-ping in tickets\n• **Customizable:** Categories, durations, settings\n• **MySQL Backend:** Reliable data storage',
                    inline: false
                }
            )
            .setFooter({ text: 'Use slash commands (/) or DM commands (!). Type !ticket for interactive menu.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
