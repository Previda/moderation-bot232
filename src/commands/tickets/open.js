const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../../schemas/Ticket');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-open')
    .setDescription('Open a new support ticket'),
  async execute(interaction) {
    // Check if user already has an open ticket
    const existing = await Ticket.findOne({ guildID: interaction.guild.id, userID: interaction.user.id, status: 'open' });
    if (existing) {
      return interaction.reply({ content: `You already have an open ticket: <#${existing.channelID}>`, ephemeral: true });
    }
    // Create ticket channel
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: 0, // 0 = GUILD_TEXT
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles'] },
        { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ManageChannels'] }
      ]
    });
    await Ticket.create({
      guildID: interaction.guild.id,
      userID: interaction.user.id,
      channelID: channel.id,
      participants: [interaction.user.id]
    });
    await channel.send(`Ticket opened by <@${interaction.user.id}>. A staff member will assist you shortly.`);
    await interaction.reply({ content: `Your ticket has been created: <#${channel.id}>`, ephemeral: true });
  }
};
