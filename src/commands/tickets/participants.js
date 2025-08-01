const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../../schemas/Ticket');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-participants')
    .setDescription('Add or remove users from a ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub.setName('add').setDescription('Add a user').addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true)))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a user').addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.channel;
    const ticket = await Ticket.findOne({ channelID: channel.id, status: 'open' });
    if (!ticket) return interaction.reply({ content: 'This is not an open ticket channel.', ephemeral: true });
    const user = interaction.options.getUser('user');
    if (sub === 'add') {
      if (ticket.participants.includes(user.id)) return interaction.reply({ content: 'User already in ticket.', ephemeral: true });
      ticket.participants.push(user.id);
      await ticket.save();
      await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
      await interaction.reply({ content: `Added <@${user.id}> to the ticket.`, ephemeral: true });
    } else if (sub === 'remove') {
      ticket.participants = ticket.participants.filter(id => id !== user.id);
      await ticket.save();
      await channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
      await interaction.reply({ content: `Removed <@${user.id}> from the ticket.`, ephemeral: true });
    }
  }
};
