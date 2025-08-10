const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../../schemas/Ticket');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('Close the current ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const channel = interaction.channel;
    const ticket = await Ticket.findOne({ channelID: channel.id, status: 'open' });
    if (!ticket) return interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    await ticket.save();
    await channel.send('This ticket has been closed by a staff member.');
    // Optionally lock channel
    await channel.permissionOverwrites.edit(ticket.userID, { ViewChannel: false });
    await interaction.reply({ content: 'Ticket closed.', ephemeral: true });
  }
};
