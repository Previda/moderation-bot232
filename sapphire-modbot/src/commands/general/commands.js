const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commands')
    .setDescription('Show all available commands and usage'),
  async execute(interaction) {
    // Scan commands folder for all commands
    const commandsDir = path.join(__dirname, '../');
    let commandFiles = [];
    fs.readdirSync(commandsDir).forEach(folder => {
      const folderPath = path.join(commandsDir, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        fs.readdirSync(folderPath).forEach(file => {
          if (file.endsWith('.js')) commandFiles.push(path.join(folder, file));
        });
      }
    });
    let desc = '';
    for (const file of commandFiles) {
      const cmd = require(path.join(commandsDir, file));
      if (cmd.data && cmd.data.name && cmd.data.description) {
        desc += `**/${cmd.data.name}** - ${cmd.data.description}\n`;
      }
    }
    await interaction.reply({ content: desc || 'No commands found.', ephemeral: true });
  }
};
