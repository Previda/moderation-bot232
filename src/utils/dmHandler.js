const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { pool } = require('../models/database');
const { getPunishmentByCase } = require('./punishmentUtils');

// Handle DM commands
async function handleDMCommand(message) {
    const content = message.content.toLowerCase().trim();
    const args = content.split(' ');
    const command = args[0];

    if (command === '!case') {
        await handleCaseCommand(message, args[1]);
    } else if (command === '!appeal') {
        await handleAppealCommand(message, args[1]);
    } else if (command === '!help') {
        await handleHelpCommand(message);
    }
}

// Handle case lookup in DMs
async function handleCaseCommand(message, caseID) {
    if (!caseID) {
        return message.reply('❌ Please provide a case ID. Usage: `!case CASE-ABC123`');
    }

    try {
        const punishment = await getPunishmentByCase(caseID.toUpperCase());
        
        if (!punishment) {
            return message.reply('❌ Case not found. Please check the case ID and try again.');
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Case Information: ${punishment.caseID}`)
            .setColor(getColorByType(punishment.type))
            .addFields(
                { name: '⚖️ Type', value: punishment.type.toUpperCase(), inline: true },
                { name: '📅 Date', value: new Date(punishment.timestamp).toLocaleString(), inline: true },
                { name: '📝 Reason', value: punishment.reason || 'No reason provided', inline: false },
                { name: '🔍 Appeal Status', value: punishment.appealStatus || 'Not appealed', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Use !appeal <case-id> to appeal this punishment' });

        // Add appeal button if not already appealed
        let components = [];
        if (punishment.appealStatus === 'none' || !punishment.appealStatus) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`appeal_${punishment.caseID}`)
                        .setLabel('📝 Appeal This Case')
                        .setStyle(ButtonStyle.Primary)
                );
            components.push(row);
        }

        await message.reply({ 
            embeds: [embed], 
            components: components
        });

    } catch (error) {
        console.error('Error handling case command:', error);
        await message.reply('❌ An error occurred while looking up the case.');
    }
}

// Handle appeal command in DMs
async function handleAppealCommand(message, caseID) {
    if (!caseID) {
        return message.reply('❌ Please provide a case ID. Usage: `!appeal CASE-ABC123`');
    }

    try {
        const punishment = await getPunishmentByCase(caseID.toUpperCase());
        
        if (!punishment) {
            return message.reply('❌ Case not found. Please check the case ID and try again.');
        }

        if (punishment.userID !== message.author.id) {
            return message.reply('❌ You can only appeal your own cases.');
        }

        if (punishment.appealStatus && punishment.appealStatus !== 'none') {
            return message.reply(`❌ This case has already been appealed. Status: ${punishment.appealStatus}`);
        }

        // Create appeal modal
        const modal = new ModalBuilder()
            .setCustomId(`appeal_modal_${punishment.caseID}`)
            .setTitle(`Appeal Case ${punishment.caseID}`);

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

        // Since we can't show modals in DMs, we'll use a different approach
        const embed = new EmbedBuilder()
            .setTitle(`📝 Appeal Form for Case ${punishment.caseID}`)
            .setColor(0xffa500)
            .setDescription('Please answer the following questions to submit your appeal:')
            .addFields(
                { name: '1️⃣ Why should this punishment be appealed?', value: 'Reply with your reason (max 1000 characters)', inline: false },
                { name: '2️⃣ Additional Evidence (Optional)', value: 'Provide any additional evidence or context', inline: false },
                { name: '3️⃣ Preferred Contact Method (Optional)', value: 'How would you like to be contacted about this appeal?', inline: false }
            )
            .setFooter({ text: 'Please respond with your answers in order. Type "cancel" to cancel the appeal.' });

        await message.reply({ embeds: [embed] });

        // Start appeal collection process
        startAppealCollection(message.channel, message.author, punishment);

    } catch (error) {
        console.error('Error handling appeal command:', error);
        await message.reply('❌ An error occurred while processing your appeal.');
    }
}

// Handle help command in DMs
async function handleHelpCommand(message) {
    const embed = new EmbedBuilder()
        .setTitle('🤖 Bot DM Commands')
        .setColor(0x0099ff)
        .setDescription('You can use these commands in DMs with me:')
        .addFields(
            { name: '!case <case-id>', value: 'Look up information about a specific case', inline: false },
            { name: '!appeal <case-id>', value: 'Start an appeal for a punishment case', inline: false },
            { name: '!help', value: 'Show this help message', inline: false }
        )
        .addFields(
            { name: '📋 Example Usage:', value: '`!case CASE-ABC123`\n`!appeal CASE-ABC123`', inline: false }
        )
        .setFooter({ text: 'Advanced Discord Moderation Bot' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

// Start appeal collection process
async function startAppealCollection(channel, user, punishment) {
    const collector = channel.createMessageCollector({
        filter: m => m.author.id === user.id,
        time: 300000, // 5 minutes
        max: 3
    });

    let responses = [];
    let currentStep = 0;
    const questions = [
        'Why should this punishment be appealed?',
        'Additional Evidence (Optional)',
        'Preferred Contact Method (Optional)'
    ];

    collector.on('collect', async (message) => {
        if (message.content.toLowerCase() === 'cancel') {
            collector.stop('cancelled');
            return;
        }

        responses.push(message.content);
        currentStep++;

        if (currentStep < questions.length) {
            await channel.send(`✅ Response recorded. **Question ${currentStep + 1}:** ${questions[currentStep]}`);
        } else {
            collector.stop('completed');
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'cancelled') {
            await channel.send('❌ Appeal cancelled.');
            return;
        }

        if (reason === 'time') {
            await channel.send('⏰ Appeal timed out. Please try again.');
            return;
        }

        if (responses.length === 0) {
            await channel.send('❌ No responses received. Appeal cancelled.');
            return;
        }

        // Submit appeal
        try {
            await submitAppeal(punishment, responses, user);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Appeal Submitted Successfully')
                .setColor(0x00ff00)
                .addFields(
                    { name: 'Case ID', value: punishment.caseID, inline: true },
                    { name: 'Status', value: 'Under Review', inline: true },
                    { name: 'Submitted', value: new Date().toLocaleString(), inline: true }
                )
                .setDescription('Your appeal has been submitted and is now under review by the moderation team. You will be notified of the decision.')
                .setFooter({ text: 'Thank you for your patience' });

            await channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error submitting appeal:', error);
            await channel.send('❌ An error occurred while submitting your appeal. Please try again later.');
        }
    });
}

// Submit appeal to database
async function submitAppeal(punishment, responses, user) {
    const appealData = {
        reason: responses[0] || '',
        evidence: responses[1] || '',
        contact: responses[2] || '',
        submittedAt: new Date()
    };

    // Update punishment record with appeal
    await pool.execute(
        'UPDATE punishments SET appealStatus = ?, appealReason = ?, appealReviewed = FALSE WHERE caseID = ?',
        ['pending', JSON.stringify(appealData), punishment.caseID]
    );

    // Log appeal submission (you can add webhook notification here)
    console.log(`Appeal submitted for case ${punishment.caseID} by user ${user.id}`);
}

// Get color by punishment type
function getColorByType(type) {
    switch (type.toLowerCase()) {
        case 'ban': return 0xff0000;
        case 'kick': return 0xff8800;
        case 'warn': return 0xffff00;
        case 'mute': return 0x8800ff;
        default: return 0x808080;
    }
}

module.exports = {
    handleDMCommand,
    handleCaseCommand,
    handleAppealCommand,
    handleHelpCommand
};
