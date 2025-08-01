const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const AutomodConfig = require('../../schemas/AutomodConfig');
const { levels } = require('../../utils/automodLevels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('View or change automoderation settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('level')
        .setDescription('Set automoderation level')
        .addStringOption(opt =>
          opt.setName('level')
            .setDescription('Level (low, medium, high, custom)')
            .setRequired(true)
            .addChoices(
              { name: 'Low', value: 'low' },
              { name: 'Medium', value: 'medium' },
              { name: 'High', value: 'high' },
              { name: 'Custom', value: 'custom' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current automod config')
    ),
  async execute(interaction) {
    const guildID = interaction.guild.id;
    let config = await AutomodConfig.findOne({ guildID });
    if (!config) {
      config = new AutomodConfig({ guildID, ...levels['medium'] });
      await config.save();
    }
    if (interaction.options.getSubcommand() === 'level') {
      const level = interaction.options.getString('level');
      config.level = level;
      if (level !== 'custom') {
        Object.assign(config, levels[level]);
      }
      await config.save();
      return interaction.reply({
        content: `Automod level set to **${level}**.`,
        ephemeral: true
      });
    }
    if (interaction.options.getSubcommand() === 'view') {
      return interaction.reply({
        content: `Automod config for this server:\n\nLevel: **${config.level}**\nAntiSpam: ${config.antiSpam}\nAntiInvite: ${config.antiInvite}\nAntiNSFW: ${config.antiNSFW}\nCapsFlood: ${config.capsFlood}\nEmojiFlood: ${config.emojiFlood}\nWarnThreshold: ${config.warnThreshold}\nMuteThreshold: ${config.muteThreshold}\nMuteDuration: ${config.muteDuration}s\nLogChannel: <#${config.logChannelId || 'Not set'}>`,
        ephemeral: true
      });
    }
  }
};
