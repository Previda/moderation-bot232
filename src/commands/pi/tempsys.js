const { SlashCommandBuilder } = require('discord.js');
const os = require('os');
const { exec } = require('child_process');
const axios = require('axios');
require('dotenv').config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempsys')
    .setDescription('Get Raspberry Pi system stats and send to webhook'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    // Get CPU usage
    const cpuUsage = os.loadavg()[0];
    // Get RAM usage
    const totalMem = os.totalmem() / (1024 * 1024);
    const freeMem = os.freemem() / (1024 * 1024);
    const usedMem = totalMem - freeMem;
    // Get disk usage (root)
    let diskUsage = 'N/A';
    try {
      diskUsage = await new Promise((resolve) => {
        exec("df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}'", (err, stdout) => {
          resolve(stdout.trim());
        });
      });
    } catch (e) {}
    // Get Pi CPU temperature
    let temp = 'N/A';
    try {
      temp = await new Promise((resolve) => {
        exec("cat /sys/class/thermal/thermal_zone0/temp", (err, stdout) => {
          if (stdout) {
            resolve((parseInt(stdout) / 1000).toFixed(1) + '°C');
          } else {
            resolve('N/A');
          }
        });
      });
    } catch (e) {}
    // Format stats
    const stats = `**System Stats:**\nCPU Temp: ${temp}\nCPU Load: ${cpuUsage.toFixed(2)}\nRAM: ${usedMem.toFixed(1)}MB / ${totalMem.toFixed(1)}MB\nDisk: ${diskUsage}`;
    // Send to webhook if configured
    const webhookUrl = process.env.PI_STATS_WEBHOOK;
    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, {
          content: stats
        });
      } catch (e) {}
    }
    await interaction.editReply({ content: stats });
  }
};
