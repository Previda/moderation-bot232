const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Appeal = require('../../schemas/Appeal');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('appeals')
    .setDescription('Staff tools for appeals')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub.setName('list').setDescription('List open appeals'))
    .addSubcommand(sub => sub.setName('close').setDescription('Close an appeal').addStringOption(opt => opt.setName('caseid').setDescription('Case ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('accept').setDescription('Accept an appeal').addStringOption(opt => opt.setName('caseid').setDescription('Case ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('deny').setDescription('Deny an appeal').addStringOption(opt => opt.setName('caseid').setDescription('Case ID').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason for denial').setRequired(false))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'list') {
      const appeals = await Appeal.find({ guildID: interaction.guild.id, status: 'open' });
      if (!appeals.length) return interaction.reply({ content: 'No open appeals.', ephemeral: true });
      const lines = appeals.map(a => `Case: ${a.caseID} | User: <@${a.userID}> | Submitted: ${a.submittedAt.toLocaleString()}`);
      return interaction.reply({ content: `Open appeals:\n${lines.join('\n')}`, ephemeral: true });
    } else if (sub === 'close') {
      const caseID = interaction.options.getString('caseid');
      const appeal = await Appeal.findOneAndUpdate({ caseID, guildID: interaction.guild.id }, { status: 'closed', closedAt: new Date(), reviewedBy: interaction.user.id });
      if (!appeal) return interaction.reply({ content: 'Appeal not found.', ephemeral: true });
      return interaction.reply({ content: `Appeal for case ${caseID} closed.`, ephemeral: true });
    } else if (sub === 'accept') {
      const caseID = interaction.options.getString('caseid');
      const appeal = await Appeal.findOneAndUpdate({ caseID, guildID: interaction.guild.id }, { status: 'accepted', closedAt: new Date(), reviewedBy: interaction.user.id });
      if (!appeal) return interaction.reply({ content: 'Appeal not found.', ephemeral: true });
      // DM user
      try {
        const user = await interaction.client.users.fetch(appeal.userID);
        await user.send(`Your appeal for case ${caseID} has been **accepted**. You may be unbanned soon.`);
      } catch {}
      return interaction.reply({ content: `Appeal for case ${caseID} accepted.`, ephemeral: true });
    } else if (sub === 'deny') {
      const caseID = interaction.options.getString('caseid');
      const reason = interaction.options.getString('reason') || 'No reason provided.';
      const appeal = await Appeal.findOneAndUpdate({ caseID, guildID: interaction.guild.id }, { status: 'denied', closedAt: new Date(), reviewedBy: interaction.user.id, reviewNote: reason });
      if (!appeal) return interaction.reply({ content: 'Appeal not found.', ephemeral: true });
      // DM user
      try {
        const user = await interaction.client.users.fetch(appeal.userID);
        await user.send(`Your appeal for case ${caseID} has been **denied**. Reason: ${reason}`);
      } catch {}
      return interaction.reply({ content: `Appeal for case ${caseID} denied.`, ephemeral: true });
    }
  }
};
