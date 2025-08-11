const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { pool } = require('../../models/database');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('open')
                .setDescription('Open a support ticket')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for opening ticket')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Ticket category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'General Support', value: 'general' },
                            { name: 'Ban Appeal', value: 'appeal' },
                            { name: 'Report User', value: 'report' },
                            { name: 'Bug Report', value: 'bug' },
                            { name: 'Other', value: 'other' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for closing')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add user to ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove user from ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('transcript')
                .setDescription('Generate ticket transcript')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'open':
                await handleOpenTicket(interaction);
                break;
            case 'close':
                await handleCloseTicket(interaction);
                break;
            case 'add':
                await handleAddUser(interaction);
                break;
            case 'remove':
                await handleRemoveUser(interaction);
                break;
            case 'transcript':
                await handleTranscript(interaction);
                break;
        }
    }
};

async function handleOpenTicket(interaction) {
    const reason = interaction.options.getString('reason');
    const category = interaction.options.getString('category') || 'general';
    const user = interaction.user;
    const guild = interaction.guild;

    try {
        // Check if user already has an open ticket
        const [existingTickets] = await pool.execute(
            'SELECT * FROM tickets WHERE userID = ? AND guildID = ? AND status = "open"',
            [user.id, guild.id]
        );

        if (existingTickets.length > 0) {
            return interaction.reply({
                content: '❌ You already have an open ticket!',
                ephemeral: true
            });
        }

        // Generate ticket ID
        const ticketID = `ticket-${Date.now()}`;
        
        // Create ticket channel
        const channel = await guild.channels.create({
            name: `${category}-${user.username}`,
            type: ChannelType.GuildText,
            topic: `Ticket by ${user.tag} | Reason: ${reason}`,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: ['ViewChannel']
                },
                {
                    id: user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                }
            ]
        });

        // Store ticket in database
        await pool.execute(
            'INSERT INTO tickets (ticketID, userID, guildID, channelID, status, reason) VALUES (?, ?, ?, ?, ?, ?)',
            [ticketID, user.id, guild.id, channel.id, 'open', reason]
        );

        // Send welcome message
        const embed = new EmbedBuilder()
            .setTitle('🎫 Support Ticket Created')
            .setDescription(`Hello ${user}, your ticket has been created!`)
            .addFields(
                { name: 'Reason', value: reason, inline: false },
                { name: 'Category', value: category, inline: true },
                { name: 'Ticket ID', value: ticketID, inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await channel.send({ embeds: [embed] });

        await interaction.reply({
            content: `✅ Ticket created! Please check ${channel}`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({
            content: '❌ Failed to create ticket. Please try again.',
            ephemeral: true
        });
    }
}

async function handleCloseTicket(interaction) {
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const channel = interaction.channel;

    try {
        // Check if this is a ticket channel
        const [tickets] = await pool.execute(
            'SELECT * FROM tickets WHERE channelID = ? AND status = "open"',
            [channel.id]
        );

        if (tickets.length === 0) {
            return interaction.reply({
                content: '❌ This is not an active ticket channel.',
                ephemeral: true
            });
        }

        const ticket = tickets[0];

        // Generate transcript before closing
        await generateTranscript(channel, ticket);

        // Update ticket status
        await pool.execute(
            'UPDATE tickets SET status = "closed", closedAt = NOW() WHERE ticketID = ?',
            [ticket.ticketID]
        );

        const embed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription(`Ticket closed by ${interaction.user.tag}`)
            .addFields(
                { name: 'Reason', value: reason, inline: false },
                { name: 'Ticket ID', value: ticket.ticketID, inline: true }
            )
            .setColor(0xff0000)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Delete channel after 10 seconds
        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (error) {
                console.error('Error deleting ticket channel:', error);
            }
        }, 10000);

    } catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.reply({
            content: '❌ Failed to close ticket. Please try again.',
            ephemeral: true
        });
    }
}

async function handleAddUser(interaction) {
    const user = interaction.options.getUser('user');
    const channel = interaction.channel;

    try {
        await channel.permissionOverwrites.create(user, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        await interaction.reply({
            content: `✅ Added ${user.tag} to the ticket.`,
            ephemeral: false
        });
    } catch (error) {
        console.error('Error adding user to ticket:', error);
        await interaction.reply({
            content: '❌ Failed to add user to ticket.',
            ephemeral: true
        });
    }
}

async function handleRemoveUser(interaction) {
    const user = interaction.options.getUser('user');
    const channel = interaction.channel;

    try {
        await channel.permissionOverwrites.delete(user);

        await interaction.reply({
            content: `✅ Removed ${user.tag} from the ticket.`,
            ephemeral: false
        });
    } catch (error) {
        console.error('Error removing user from ticket:', error);
        await interaction.reply({
            content: '❌ Failed to remove user from ticket.',
            ephemeral: true
        });
    }
}

async function handleTranscript(interaction) {
    const channel = interaction.channel;

    try {
        const [tickets] = await pool.execute(
            'SELECT * FROM tickets WHERE channelID = ?',
            [channel.id]
        );

        if (tickets.length === 0) {
            return interaction.reply({
                content: '❌ This is not a ticket channel.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const transcript = await generateTranscript(channel, tickets[0]);
        
        await interaction.editReply({
            content: '✅ Transcript generated!',
            files: [transcript]
        });

    } catch (error) {
        console.error('Error generating transcript:', error);
        await interaction.editReply({
            content: '❌ Failed to generate transcript.'
        });
    }
}

async function generateTranscript(channel, ticket) {
    try {
        // Fetch all messages
        const messages = [];
        let lastMessageId;

        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) options.before = lastMessageId;

            const fetchedMessages = await channel.messages.fetch(options);
            if (fetchedMessages.size === 0) break;

            messages.push(...fetchedMessages.values());
            lastMessageId = fetchedMessages.last().id;
        }

        // Sort messages by timestamp
        messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        // Generate HTML transcript
        let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Ticket Transcript - ${ticket.ticketID}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #36393f; color: #dcddde; }
        .header { background: #2f3136; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .message { margin: 10px 0; padding: 10px; background: #40444b; border-radius: 5px; }
        .author { font-weight: bold; color: #7289da; }
        .timestamp { color: #72767d; font-size: 12px; }
        .content { margin-top: 5px; }
        .embed { border-left: 4px solid #7289da; padding-left: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Ticket Transcript</h1>
        <p><strong>Ticket ID:</strong> ${ticket.ticketID}</p>
        <p><strong>User:</strong> ${ticket.userID}</p>
        <p><strong>Reason:</strong> ${ticket.reason}</p>
        <p><strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}</p>
        <p><strong>Channel:</strong> #${channel.name}</p>
    </div>
`;

        for (const message of messages) {
            html += `
    <div class="message">
        <div class="author">${message.author.tag}</div>
        <div class="timestamp">${message.createdAt.toLocaleString()}</div>
        <div class="content">${message.content || '<em>No content</em>'}</div>
`;
            
            if (message.embeds.length > 0) {
                for (const embed of message.embeds) {
                    html += `<div class="embed"><strong>Embed:</strong> ${embed.title || 'No title'}<br>${embed.description || ''}</div>`;
                }
            }

            if (message.attachments.size > 0) {
                for (const attachment of message.attachments.values()) {
                    html += `<div>📎 <a href="${attachment.url}">${attachment.name}</a></div>`;
                }
            }

            html += `    </div>`;
        }

        html += `
</body>
</html>`;

        // Save transcript file
        const transcriptPath = path.join(__dirname, '../../transcripts');
        if (!fs.existsSync(transcriptPath)) {
            fs.mkdirSync(transcriptPath, { recursive: true });
        }

        const filename = `transcript-${ticket.ticketID}-${Date.now()}.html`;
        const filepath = path.join(transcriptPath, filename);
        
        fs.writeFileSync(filepath, html);

        return {
            attachment: filepath,
            name: filename
        };

    } catch (error) {
        console.error('Error generating transcript:', error);
        throw error;
    }
}
