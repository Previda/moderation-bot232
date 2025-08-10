const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const AppealQuestion = require('../../schemas/AppealQuestion');
const Appeal = require('../../schemas/Appeal');
const AutomodConfig = require('../../schemas/AutomodConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('appeal')
    .setDescription('Begin an appeal for a ban using your Case ID.')
    .addStringOption(option =>
      option.setName('caseid').setDescription('Your Case ID').setRequired(true)
    ),
  async execute(interaction) {
    const caseID = interaction.options.getString('caseid');
    const questionsDoc = await AppealQuestion.findOne({ guildID: interaction.guild.id });
    const questions = (questionsDoc && questionsDoc.questions.length) ? questionsDoc.questions : [
      'Why should we unban you?',
      'Do you understand the rules now?'
    ];
    // Create modal
    const modal = new ModalBuilder()
      .setCustomId(`appealModal:${caseID}`)
      .setTitle('Ban Appeal');
    questions.forEach((q, i) => {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`q${i}`)
            .setLabel(q.substring(0, 45))
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );
    });
    await interaction.showModal(modal);
  },
  async modalSubmit(interaction) {
    // Custom handler for modal submissions
    const [_, caseID] = interaction.customId.split(':');
    const questionsDoc = await AppealQuestion.findOne({ guildID: interaction.guild.id });
    const questions = (questionsDoc && questionsDoc.questions.length) ? questionsDoc.questions : [
      'Why should we unban you?',
      'Do you understand the rules now?'
    ];
    const answers = questions.map((_, i) => interaction.fields.getTextInputValue(`q${i}`));
    await Appeal.create({
      caseID,
      userID: interaction.user.id,
      guildID: interaction.guild.id,
      answers
    });
    await interaction.reply({ content: 'Your appeal has been submitted. Staff will review it soon.', ephemeral: true });
    // Log to staff channel
    const config = await AutomodConfig.findOne({ guildID: interaction.guild.id });
    if (config && config.appealsChannelId) {
      const channel = interaction.guild.channels.cache.get(config.appealsChannelId);
      if (channel) {
        channel.send({
          content: `New appeal for Case ID: ${caseID}\nUser: <@${interaction.user.id}>\n\n${answers.map((a, i) => `**Q${i+1}:** ${questions[i]}\n${a}`).join('\n\n')}`
        });
      }
    }
  }
};
