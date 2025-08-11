const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { exec } = require('child_process');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempsys')
        .setDescription('Get Raspberry Pi system stats')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Get system stats
            const stats = await getSystemStats();
            
            const embed = {
                title: '🖥️ Raspberry Pi System Stats',
                color: 0x00ff00,
                fields: [
                    { name: '🌡️ CPU Temperature', value: `${stats.temp}°C`, inline: true },
                    { name: '⚡ CPU Usage', value: `${stats.cpuUsage}%`, inline: true },
                    { name: '🧠 RAM Usage', value: `${stats.ramUsage}%`, inline: true },
                    { name: '💾 Disk Usage', value: `${stats.diskUsage}%`, inline: true },
                    { name: '📊 Load Average', value: stats.loadAvg, inline: true },
                    { name: '⏱️ Uptime', value: stats.uptime, inline: true }
                ],
                timestamp: new Date(),
                footer: { text: 'Raspberry Pi Monitor' }
            };

            // Send to Discord channel
            await interaction.editReply({ embeds: [embed] });

            // Send to webhook if configured
            if (process.env.PI_STATS_WEBHOOK) {
                try {
                    await axios.post(process.env.PI_STATS_WEBHOOK, {
                        embeds: [embed]
                    });
                } catch (webhookError) {
                    console.error('Webhook error:', webhookError.message);
                }
            }

        } catch (error) {
            console.error('Tempsys command error:', error);
            await interaction.editReply({
                content: '❌ Failed to get system stats. Make sure this is running on a Raspberry Pi.',
                ephemeral: true
            });
        }
    }
};

function getSystemStats() {
    return new Promise((resolve, reject) => {
        // Get CPU temperature
        exec('cat /sys/class/thermal/thermal_zone0/temp', (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            
            const temp = (parseInt(stdout.trim()) / 1000).toFixed(1);
            
            // Get other system stats
            exec('top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk \'{print 100 - $1}\'', (error, cpuOut) => {
                exec('free | grep Mem | awk \'{printf("%.1f"), $3/$2 * 100.0}\'', (error, ramOut) => {
                    exec('df -h / | awk \'NR==2{printf "%s", $5}\'', (error, diskOut) => {
                        exec('uptime | awk -F\'load average:\' \'{ print $2 }\'', (error, loadOut) => {
                            exec('uptime -p', (error, uptimeOut) => {
                                
                                resolve({
                                    temp: temp,
                                    cpuUsage: parseFloat(cpuOut.trim()).toFixed(1),
                                    ramUsage: parseFloat(ramOut.trim()).toFixed(1),
                                    diskUsage: diskOut.trim(),
                                    loadAvg: loadOut.trim(),
                                    uptime: uptimeOut.trim()
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}
