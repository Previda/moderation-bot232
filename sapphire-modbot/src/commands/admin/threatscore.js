const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const tsUtil = require('../../utils/threatScore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('threatscore')
    .setDescription('View or reset user threat scores')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View threat score for a user')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to check')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset threat score for a user')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to reset')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    if (interaction.options.getSubcommand() === 'view') {
      const score = tsUtil.get(user.id);
      return interaction.reply({
        content: `Threat score for <@${user.id}>: **${score}**`,
        ephemeral: true
      });
    }
    if (interaction.options.getSubcommand() === 'reset') {
      tsUtil.reset(user.id);
      return interaction.reply({
        content: `Threat score for <@${user.id}> has been reset.`,
        ephemeral: true
      });
    }
  }
};
