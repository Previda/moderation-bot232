const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sysinfo')
        .setDescription('Display comprehensive system information and stats'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Get system information
            const systemInfo = await getSystemInfo();
            
            const embed = new EmbedBuilder()
                .setTitle('🖥️ System Information')
                .setColor(0x00ff00)
                .addFields(
                    { name: '🌡️ CPU Temperature', value: systemInfo.temp, inline: true },
                    { name: '⚡ CPU Usage', value: systemInfo.cpuUsage, inline: true },
                    { name: '🧠 Memory Usage', value: systemInfo.memUsage, inline: true },
                    { name: '💾 Disk Usage', value: systemInfo.diskUsage, inline: true },
                    { name: '🌐 Network Ping', value: systemInfo.ping, inline: true },
                    { name: '⏱️ Uptime', value: systemInfo.uptime, inline: true },
                    { name: '🔋 Load Average', value: systemInfo.loadAvg, inline: true },
                    { name: '📊 Bot Latency', value: `${interaction.client.ws.ping}ms`, inline: true },
                    { name: '🏠 Hostname', value: systemInfo.hostname, inline: true }
                )
                .setFooter({ text: 'System stats updated in real-time' })
                .setTimestamp();

            // Color based on temperature
            if (systemInfo.tempValue > 70) {
                embed.setColor(0xff0000); // Red - Hot
            } else if (systemInfo.tempValue > 60) {
                embed.setColor(0xff8800); // Orange - Warm
            } else {
                embed.setColor(0x00ff00); // Green - Cool
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Sysinfo command error:', error);
            await interaction.editReply({
                content: '❌ Failed to retrieve system information. This command works best on Linux/Raspberry Pi.',
                ephemeral: true
            });
        }
    }
};

async function getSystemInfo() {
    const info = {};

    try {
        // CPU Temperature (works on Raspberry Pi)
        try {
            const { stdout: tempOutput } = await execAsync('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "N/A"');
            const tempRaw = parseInt(tempOutput.trim());
            if (!isNaN(tempRaw)) {
                const tempCelsius = (tempRaw / 1000).toFixed(1);
                const tempFahrenheit = ((tempCelsius * 9/5) + 32).toFixed(1);
                info.temp = `${tempCelsius}°C (${tempFahrenheit}°F)`;
                info.tempValue = parseFloat(tempCelsius);
            } else {
                info.temp = 'N/A';
                info.tempValue = 0;
            }
        } catch {
            info.temp = 'N/A';
            info.tempValue = 0;
        }

        // CPU Usage
        try {
            const { stdout: cpuOutput } = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d\'%\' -f1 2>/dev/null || echo "N/A"');
            info.cpuUsage = cpuOutput.trim() ? `${cpuOutput.trim()}%` : 'N/A';
        } catch {
            info.cpuUsage = 'N/A';
        }

        // Memory Usage
        try {
            const { stdout: memOutput } = await execAsync('free -m | awk \'NR==2{printf "%.1f%%", $3*100/$2 }\'');
            info.memUsage = memOutput.trim() || 'N/A';
        } catch {
            info.memUsage = 'N/A';
        }

        // Disk Usage
        try {
            const { stdout: diskOutput } = await execAsync('df -h / | awk \'NR==2{print $5}\'');
            info.diskUsage = diskOutput.trim() || 'N/A';
        } catch {
            info.diskUsage = 'N/A';
        }

        // Network Ping (to Google DNS)
        try {
            const { stdout: pingOutput } = await execAsync('ping -c 1 8.8.8.8 | grep "time=" | awk -F"time=" \'{print $2}\' | awk \'{print $1}\'');
            info.ping = pingOutput.trim() ? `${pingOutput.trim()}ms` : 'N/A';
        } catch {
            info.ping = 'N/A';
        }

        // System Uptime
        try {
            const { stdout: uptimeOutput } = await execAsync('uptime -p 2>/dev/null || uptime');
            info.uptime = uptimeOutput.trim().replace('up ', '') || 'N/A';
        } catch {
            info.uptime = 'N/A';
        }

        // Load Average
        try {
            const { stdout: loadOutput } = await execAsync('uptime | awk -F"load average:" \'{print $2}\'');
            info.loadAvg = loadOutput.trim() || 'N/A';
        } catch {
            info.loadAvg = 'N/A';
        }

        // Hostname
        try {
            const { stdout: hostnameOutput } = await execAsync('hostname');
            info.hostname = hostnameOutput.trim() || 'Unknown';
        } catch {
            info.hostname = 'Unknown';
        }

    } catch (error) {
        console.error('Error getting system info:', error);
    }

    return info;
}
