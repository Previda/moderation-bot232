const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { pool } = require('../../models/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('Advanced ticket management menu')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('menu')
                .setDescription('Show interactive ticket management menu'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all open tickets'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a ticket for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to create ticket for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for ticket')
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
                            { name: 'Staff Created', value: 'staff' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Configure ticket system settings')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'menu':
                await showTicketMenu(interaction);
                break;
            case 'list':
                await listTickets(interaction);
                break;
            case 'create':
                await createTicketForUser(interaction);
                break;
            case 'settings':
                await showTicketSettings(interaction);
                break;
        }
    }
};

async function showTicketMenu(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🎫 Advanced Ticket Management')
        .setDescription('Complete ticket management system with all features')
        .setColor(0x0099ff)
        .addFields(
            { name: '📋 Quick Actions', value: 'Use buttons below for instant ticket management', inline: false },
            { name: '🔧 Features', value: '• Create tickets for any user\n• List and manage all tickets\n• Generate transcripts\n• Set slowmode and permissions\n• Close with confirmation', inline: false }
        )
        .setTimestamp();

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_list')
                .setLabel('📋 List Tickets')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel('➕ Create Ticket')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_close_menu')
                .setLabel('🔒 Close Current')
                .setStyle(ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_add_user')
                .setLabel('👤 Add User')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ticket_remove_user')
                .setLabel('👤 Remove User')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ticket_slowmode')
                .setLabel('⏱️ Slowmode')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_transcript')
                .setLabel('📄 Transcript')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ticket_settings')
                .setLabel('⚙️ Settings')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ 
        embeds: [embed], 
        components: [row1, row2, row3] 
    });
}

async function listTickets(interaction) {
    try {
        const [tickets] = await pool.execute(
            'SELECT * FROM tickets WHERE guildID = ? AND status = "open" ORDER BY createdAt DESC',
            [interaction.guild.id]
        );

        if (tickets.length === 0) {
            return interaction.reply({
                content: '📋 No open tickets found.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Open Tickets')
            .setColor(0x00ff00)
            .setDescription(`Found ${tickets.length} open ticket(s)`)
            .setTimestamp();

        for (const ticket of tickets.slice(0, 10)) {
            const channel = interaction.guild.channels.cache.get(ticket.channelID);
            const user = await interaction.client.users.fetch(ticket.userID).catch(() => null);
            
            embed.addFields({
                name: `🎫 ${ticket.ticketID}`,
                value: `**User:** ${user ? user.tag : 'Unknown'}\n**Channel:** ${channel ? channel.toString() : 'Deleted'}\n**Reason:** ${ticket.reason}\n**Created:** <t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:R>`,
                inline: true
            });
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Error listing tickets:', error);
        await interaction.reply({
            content: '❌ Failed to list tickets.',
            ephemeral: true
        });
    }
}

async function createTicketForUser(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const category = interaction.options.getString('category') || 'staff';

    try {
        // Check if user already has an open ticket
        const [existingTickets] = await pool.execute(
            'SELECT * FROM tickets WHERE userID = ? AND guildID = ? AND status = "open"',
            [user.id, interaction.guild.id]
        );

        if (existingTickets.length > 0) {
            return interaction.reply({
                content: `❌ ${user.tag} already has an open ticket!`,
                ephemeral: true
            });
        }

        // Generate ticket ID
        const ticketID = `ticket-${Date.now()}`;
        
        // Create ticket channel
        const channel = await interaction.guild.channels.create({
            name: `${category}-${user.username}`,
            type: 0,
            topic: `Ticket by ${user.tag} | Reason: ${reason} | Created by: ${interaction.user.tag}`,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    deny: ['ViewChannel']
                },
                {
                    id: user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages']
                }
            ]
        });

        // Store ticket in database
        await pool.execute(
            'INSERT INTO tickets (ticketID, userID, guildID, channelID, status, reason) VALUES (?, ?, ?, ?, ?, ?)',
            [ticketID, user.id, interaction.guild.id, channel.id, 'open', reason]
        );

        // Send welcome message with user mention
        const welcomeEmbed = new EmbedBuilder()
            .setTitle('🎫 Support Ticket Created')
            .setDescription(`Hello ${user}, your ticket has been created by staff!`)
            .addFields(
                { name: '📝 Reason', value: reason, inline: false },
                { name: '📂 Category', value: category, inline: true },
                { name: '🆔 Ticket ID', value: ticketID, inline: true },
                { name: '👤 Created by', value: interaction.user.tag, inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await channel.send({ content: `${user}`, embeds: [welcomeEmbed] });

        await interaction.reply({
            content: `✅ Ticket created successfully for ${user.tag}!\n🎫 Channel: ${channel}\n🆔 ID: ${ticketID}`,
            ephemeral: false
        });

    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({
            content: '❌ Failed to create ticket. Please try again.',
            ephemeral: true
        });
    }
}

async function showTicketSettings(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Ticket System Settings')
        .setColor(0x0099ff)
        .setDescription('Configure your ticket system settings')
        .addFields(
            { name: '🎫 Categories Available', value: 'General, Appeal, Report, Bug, Staff', inline: false },
            { name: '📋 Features Enabled', value: '• Auto transcripts\n• User mentions\n• Permission management\n• Slowmode control', inline: false },
            { name: '🔧 Management Options', value: 'Use `/manage menu` for interactive controls', inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
