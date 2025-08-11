const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createPunishment } = require('../../utils/punishmentUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kick')
                .setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        try {
            const member = await interaction.guild.members.fetch(user.id);
            
            if (!member) {
                return interaction.reply({ 
                    content: '❌ User not found in this server.', 
                    ephemeral: true 
                });
            }

            // Create punishment record
            const punishment = await createPunishment({
                userID: user.id,
                modID: interaction.user.id,
                guildID: interaction.guild.id,
                type: 'kick',
                reason
            });

            // Try to DM the user before kicking
            try {
                await member.send(`You have been kicked from **${interaction.guild.name}**.\nReason: ${reason}\nCase ID: ${punishment.caseID}`);
            } catch (error) {
                console.log('Could not DM kicked user');
            }

            // Kick the user
            await member.kick(`${reason} (by ${interaction.user.tag})`);

            await interaction.reply({
                content: `✅ User ${user.tag} has been kicked.\n**Reason:** ${reason}\n**Case ID:** ${punishment.caseID}`,
                ephemeral: false
            });

        } catch (error) {
            console.error('Kick command error:', error);
            await interaction.reply({
                content: '❌ Failed to kick user. Check permissions and try again.',
                ephemeral: true
            });
        }
    }
};
