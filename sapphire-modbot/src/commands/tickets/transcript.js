const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const Ticket = require('../../schemas/Ticket');
const { generateTranscript } = require('../../utils/ticketTranscript');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-transcript')
    .setDescription('Save and upload the ticket transcript')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const channel = interaction.channel;
    const ticket = await Ticket.findOne({ channelID: channel.id });
    if (!ticket) return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    const transcript = await generateTranscript(channel);
    const buffer = Buffer.from(transcript, 'utf-8');
    const file = new AttachmentBuilder(buffer, { name: `transcript-${ticket.channelID}.txt` });
    await interaction.reply({ content: 'Transcript:', files: [file], ephemeral: true });
    ticket.transcriptUrl = null; // Could upload to storage if desired
    await ticket.save();
  }
};
