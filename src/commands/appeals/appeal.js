const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getPunishmentByCase, updateAppealStatus } = require('../../utils/punishmentUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('appeal')
        .setDescription('Appeal system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('submit')
                .setDescription('Submit an appeal for a punishment')
                .addStringOption(option =>
                    option.setName('case_id')
                        .setDescription('Case ID to appeal (e.g., CASE-ABC123)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the status of your appeal')
                .addStringOption(option =>
                    option.setName('case_id')
                        .setDescription('Case ID to check')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('review')
                .setDescription('Review pending appeals (Staff only)')
                .addStringOption(option =>
                    option.setName('case_id')
                        .setDescription('Case ID to review')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'submit':
                await handleAppealSubmit(interaction);
                break;
            case 'status':
                await handleAppealStatus(interaction);
                break;
            case 'review':
                await handleAppealReview(interaction);
                break;
        }
    }
};

async function handleAppealSubmit(interaction) {
    const caseID = interaction.options.getString('case_id').toUpperCase();

    try {
        const punishment = await getPunishmentByCase(caseID);
        
        if (!punishment) {
            return interaction.reply({
                content: '❌ Case not found. Please check the case ID and try again.',
                ephemeral: true
            });
        }

        if (punishment.userID !== interaction.user.id) {
            return interaction.reply({
                content: '❌ You can only appeal your own cases.',
                ephemeral: true
            });
        }

        if (punishment.appealStatus && punishment.appealStatus !== 'none') {
            return interaction.reply({
                content: `❌ This case has already been appealed. Status: ${punishment.appealStatus}`,
                ephemeral: true
            });
        }

        // Create appeal modal
        const modal = new ModalBuilder()
            .setCustomId(`appeal_modal_${caseID}`)
            .setTitle(`Appeal Case ${caseID}`);

        const reasonInput = new TextInputBuilder()
            .setCustomId('appeal_reason')
            .setLabel('Why should this punishment be appealed?')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Explain why you believe this punishment was unfair or incorrect...')
            .setRequired(true)
            .setMaxLength(1000);

        const evidenceInput = new TextInputBuilder()
            .setCustomId('appeal_evidence')
            .setLabel('Additional Evidence (Optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Provide any additional evidence or context...')
            .setRequired(false)
            .setMaxLength(1000);

        const contactInput = new TextInputBuilder()
            .setCustomId('appeal_contact')
            .setLabel('Preferred Contact Method')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Discord DM, Email, etc.')
            .setRequired(false)
            .setMaxLength(100);

        const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
        const secondActionRow = new ActionRowBuilder().addComponents(evidenceInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(contactInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        await interaction.showModal(modal);

    } catch (error) {
        console.error('Error handling appeal submit:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing your appeal.',
            ephemeral: true
        });
    }
}

async function handleAppealStatus(interaction) {
    const caseID = interaction.options.getString('case_id').toUpperCase();

    try {
        const punishment = await getPunishmentByCase(caseID);
        
        if (!punishment) {
            return interaction.reply({
                content: '❌ Case not found. Please check the case ID and try again.',
                ephemeral: true
            });
        }

        if (punishment.userID !== interaction.user.id) {
            return interaction.reply({
                content: '❌ You can only check the status of your own appeals.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Appeal Status: ${caseID}`)
            .setColor(getStatusColor(punishment.appealStatus))
            .addFields(
                { name: '⚖️ Original Punishment', value: punishment.type.toUpperCase(), inline: true },
                { name: '📅 Date', value: new Date(punishment.timestamp).toLocaleString(), inline: true },
                { name: '📝 Reason', value: punishment.reason || 'No reason provided', inline: false },
                { name: '🔍 Appeal Status', value: getStatusText(punishment.appealStatus), inline: true },
                { name: '📊 Reviewed', value: punishment.appealReviewed ? '✅ Yes' : '⏳ Pending', inline: true }
            )
            .setTimestamp();

        if (punishment.appealReason) {
            try {
                const appealData = JSON.parse(punishment.appealReason);
                embed.addFields(
                    { name: '📝 Your Appeal Reason', value: appealData.reason || 'No reason provided', inline: false }
                );
            } catch (e) {
                embed.addFields(
                    { name: '📝 Your Appeal', value: punishment.appealReason, inline: false }
                );
            }
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error checking appeal status:', error);
        await interaction.reply({
            content: '❌ An error occurred while checking appeal status.',
            ephemeral: true
        });
    }
}

async function handleAppealReview(interaction) {
    // Check if user has permission to review appeals
    if (!interaction.member.permissions.has('ModerateMembers')) {
        return interaction.reply({
            content: '❌ You need Moderate Members permission to review appeals.',
            ephemeral: true
        });
    }

    const caseID = interaction.options.getString('case_id');

    if (caseID) {
        // Review specific case
        await reviewSpecificAppeal(interaction, caseID.toUpperCase());
    } else {
        // List all pending appeals
        await listPendingAppeals(interaction);
    }
}

async function reviewSpecificAppeal(interaction, caseID) {
    try {
        const punishment = await getPunishmentByCase(caseID);
        
        if (!punishment) {
            return interaction.reply({
                content: '❌ Case not found.',
                ephemeral: true
            });
        }

        if (!punishment.appealStatus || punishment.appealStatus === 'none') {
            return interaction.reply({
                content: '❌ This case has no pending appeal.',
                ephemeral: true
            });
        }

        const user = await interaction.client.users.fetch(punishment.userID).catch(() => null);
        
        const embed = new EmbedBuilder()
            .setTitle(`📋 Appeal Review: ${caseID}`)
            .setColor(0xffa500)
            .addFields(
                { name: '👤 User', value: user ? user.tag : 'Unknown', inline: true },
                { name: '⚖️ Punishment', value: punishment.type.toUpperCase(), inline: true },
                { name: '📅 Date', value: new Date(punishment.timestamp).toLocaleString(), inline: true },
                { name: '📝 Original Reason', value: punishment.reason || 'No reason provided', inline: false }
            );

        if (punishment.appealReason) {
            try {
                const appealData = JSON.parse(punishment.appealReason);
                embed.addFields(
                    { name: '📝 Appeal Reason', value: appealData.reason || 'No reason provided', inline: false },
                    { name: '🔍 Evidence', value: appealData.evidence || 'None provided', inline: false },
                    { name: '📞 Contact', value: appealData.contact || 'None provided', inline: true }
                );
            } catch (e) {
                embed.addFields(
                    { name: '📝 Appeal', value: punishment.appealReason, inline: false }
                );
            }
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error reviewing appeal:', error);
        await interaction.reply({
            content: '❌ An error occurred while reviewing appeal.',
            ephemeral: true
        });
    }
}

async function listPendingAppeals(interaction) {
    // This would require a database query to get pending appeals
    // For now, show a placeholder
    const embed = new EmbedBuilder()
        .setTitle('📋 Pending Appeals')
        .setColor(0xffa500)
        .setDescription('Use `/appeal review <case_id>` to review a specific appeal.')
        .addFields(
            { name: '🔍 How to Review', value: 'Provide a case ID to review that specific appeal', inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

function getStatusColor(status) {
    switch (status) {
        case 'approved': return 0x00ff00;
        case 'denied': return 0xff0000;
        case 'pending': return 0xffa500;
        default: return 0x808080;
    }
}

function getStatusText(status) {
    switch (status) {
        case 'approved': return '✅ Approved';
        case 'denied': return '❌ Denied';
        case 'pending': return '⏳ Under Review';
        case 'none': return '❌ Not Appealed';
        default: return '❓ Unknown';
    }
}
