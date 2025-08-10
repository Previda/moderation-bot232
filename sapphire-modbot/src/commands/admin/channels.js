const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../../utils/mysql');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-channels')
    .setDescription('Set up mod log and appeals channels')
    .addChannelOption(opt => opt.setName('modlog').setDescription('Mod log channel').setRequired(false))
    .addChannelOption(opt => opt.setName('appeals').setDescription('Appeals log channel').setRequired(false)),
  async execute(interaction) {
    const modlog = interaction.options.getChannel('modlog');
    const appeals = interaction.options.getChannel('appeals');
    if (!modlog && !appeals) return interaction.reply({ content: 'Please specify at least one channel.', ephemeral: true });
    if (modlog) {
      await pool.execute('REPLACE INTO guild_config (guildID, modLogChannelID) VALUES (?, ?)', [interaction.guild.id, modlog.id]);
    }
    if (appeals) {
      await pool.execute('REPLACE INTO guild_config (guildID, appealsChannelID) VALUES (?, ?)', [interaction.guild.id, appeals.id]);
    }
    await interaction.reply({ content: 'Channels updated!', ephemeral: true });
  }
};
