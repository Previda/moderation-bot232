const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const Ticket = require('../../schemas/Ticket');
const Appeal = require('../../schemas/Appeal');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reverse')
        .setDescription('Reverse/restore tickets and appeals')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ticket-close')
                .setDescription('Reopen a closed ticket')
                .addStringOption(option =>
                    option.setName('ticket_id')
                        .setDescription('Ticket ID to reopen')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for reopening')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ticket-archive')
                .setDescription('Restore an archived ticket')
                .addStringOption(option =>
                    option.setName('ticket_id')
                        .setDescription('Ticket ID to restore')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for restoring')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('appeal-deny')
                .setDescription('Reverse an appeal denial (reopen appeal)')
                .addStringOption(option =>
                    option.setName('appeal_id')
                        .setDescription('Appeal ID to reopen')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for reopening appeal')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('appeal-approve')
                .setDescription('Reverse an appeal approval (deny appeal)')
                .addStringOption(option =>
                    option.setName('appeal_id')
                        .setDescription('Appeal ID to deny')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for denying appeal')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bulk-tickets')
                .setDescription('Bulk reopen/restore tickets')
                .addStringOption(option =>
                    option.setName('status')
                        .setDescription('Current status of tickets to reverse')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Closed', value: 'closed' },
                            { name: 'Archived', value: 'archived' }
                        ))
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of recent tickets to reverse')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(20))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for bulk reverse')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'ticket-close':
                await this.reverseTicketClose(interaction);
                break;
            case 'ticket-archive':
                await this.reverseTicketArchive(interaction);
                break;
            case 'appeal-deny':
                await this.reverseAppealDeny(interaction);
                break;
            case 'appeal-approve':
                await this.reverseAppealApprove(interaction);
                break;
            case 'bulk-tickets':
                await this.reverseBulkTickets(interaction);
                break;
        }
    },

    async reverseTicketClose(interaction) {
        const ticketId = interaction.options.getString('ticket_id');
        const reason = interaction.options.getString('reason') || 'Ticket reopened by staff';

        try {
            const ticket = await Ticket.findByTicketId(ticketId);
            
            if (!ticket) {
                return interaction.reply({ content: '❌ Ticket not found', ephemeral: true });
            }

            if (ticket.status !== 'closed') {
                return interaction.reply({ content: '❌ This ticket is not closed', ephemeral: true });
            }

            // Reopen the ticket
            await Ticket.updateStatus(ticket.id, 'open');

            // Try to recreate the channel if it was deleted
            let channel = interaction.guild.channels.cache.get(ticket.channelID);
            
            if (!channel) {
                // Create new channel
                channel = await interaction.guild.channels.create({
                    name: `ticket-${ticket.userID.slice(-4)}`,
                    type: ChannelType.GuildText,
                    parent: interaction.channel.parent,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: ['ViewChannel']
                        },
                        {
                            id: ticket.userID,
                            allow: ['ViewChannel', 'SendMessages']
                        }
                    ]
                });

                // Update ticket with new channel ID
                await Ticket.update(ticket.id, { channelID: channel.id });
            }

            const embed = new EmbedBuilder()
                .setTitle('🔄 Ticket Reopened')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Ticket ID', value: ticketId, inline: true },
                    { name: 'User', value: `<@${ticket.userID}>`, inline: true },
                    { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                    { name: 'Reopened By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Notify in the ticket channel
            await channel.send({
                content: `🔄 **Ticket Reopened**\nReopened by: <@${interaction.user.id}>\nReason: ${reason}`
            });

        } catch (error) {
            console.error('Error reopening ticket:', error);
            await interaction.reply({ content: '❌ Failed to reopen ticket', ephemeral: true });
        }
    },

    async reverseTicketArchive(interaction) {
        const ticketId = interaction.options.getString('ticket_id');
        const reason = interaction.options.getString('reason') || 'Ticket restored from archive';

        try {
            const ticket = await Ticket.findByTicketId(ticketId);
            
            if (!ticket) {
                return interaction.reply({ content: '❌ Ticket not found', ephemeral: true });
            }

            if (ticket.status !== 'archived') {
                return interaction.reply({ content: '❌ This ticket is not archived', ephemeral: true });
            }

            // Restore the ticket to open status
            await Ticket.updateStatus(ticket.id, 'open');

            // Recreate the channel
            const channel = await interaction.guild.channels.create({
                name: `ticket-${ticket.userID.slice(-4)}`,
                type: ChannelType.GuildText,
                parent: interaction.channel.parent,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: ticket.userID,
                        allow: ['ViewChannel', 'SendMessages']
                    }
                ]
            });

            // Update ticket with new channel ID
            await Ticket.update(ticket.id, { channelID: channel.id });

            const embed = new EmbedBuilder()
                .setTitle('🔄 Ticket Restored from Archive')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Ticket ID', value: ticketId, inline: true },
                    { name: 'User', value: `<@${ticket.userID}>`, inline: true },
                    { name: 'New Channel', value: `<#${channel.id}>`, inline: true },
                    { name: 'Restored By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Welcome message in restored channel
            await channel.send({
                content: `🔄 **Ticket Restored**\nThis ticket has been restored from the archive.\nRestored by: <@${interaction.user.id}>\nReason: ${reason}`
            });

        } catch (error) {
            console.error('Error restoring ticket:', error);
            await interaction.reply({ content: '❌ Failed to restore ticket', ephemeral: true });
        }
    },

    async reverseAppealDeny(interaction) {
        const appealId = interaction.options.getString('appeal_id');
        const reason = interaction.options.getString('reason') || 'Appeal reopened for review';

        try {
            const appeal = await Appeal.findById(appealId);
            
            if (!appeal) {
                return interaction.reply({ content: '❌ Appeal not found', ephemeral: true });
            }

            if (appeal.status !== 'denied') {
                return interaction.reply({ content: '❌ This appeal is not denied', ephemeral: true });
            }

            // Reopen the appeal
            await Appeal.updateStatus(appealId, 'pending', interaction.user.id, reason);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Appeal Reopened')
                .setColor('#ffaa00')
                .addFields(
                    { name: 'Appeal ID', value: appealId, inline: true },
                    { name: 'User', value: `<@${appeal.userID}>`, inline: true },
                    { name: 'Case ID', value: appeal.caseID || 'N/A', inline: true },
                    { name: 'Reopened By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Status', value: 'Pending Review', inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error reopening appeal:', error);
            await interaction.reply({ content: '❌ Failed to reopen appeal', ephemeral: true });
        }
    },

    async reverseAppealApprove(interaction) {
        const appealId = interaction.options.getString('appeal_id');
        const reason = interaction.options.getString('reason') || 'Appeal approval reversed';

        try {
            const appeal = await Appeal.findById(appealId);
            
            if (!appeal) {
                return interaction.reply({ content: '❌ Appeal not found', ephemeral: true });
            }

            if (appeal.status !== 'approved') {
                return interaction.reply({ content: '❌ This appeal is not approved', ephemeral: true });
            }

            // Deny the appeal
            await Appeal.updateStatus(appealId, 'denied', interaction.user.id, reason);

            const embed = new EmbedBuilder()
                .setTitle('🔄 Appeal Approval Reversed')
                .setColor('#ff0000')
                .addFields(
                    { name: 'Appeal ID', value: appealId, inline: true },
                    { name: 'User', value: `<@${appeal.userID}>`, inline: true },
                    { name: 'Case ID', value: appeal.caseID || 'N/A', inline: true },
                    { name: 'Reversed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'New Status', value: 'Denied', inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error reversing appeal approval:', error);
            await interaction.reply({ content: '❌ Failed to reverse appeal approval', ephemeral: true });
        }
    },

    async reverseBulkTickets(interaction) {
        const status = interaction.options.getString('status');
        const count = interaction.options.getInteger('count');
        const reason = interaction.options.getString('reason') || `Bulk ${status} tickets reversed`;

        try {
            await interaction.deferReply();

            const tickets = await Ticket.findByGuildId(interaction.guild.id, status, count);
            
            if (tickets.length === 0) {
                return interaction.editReply({ content: `❌ No ${status} tickets found` });
            }

            let reversedCount = 0;
            const newStatus = status === 'closed' ? 'open' : 'open'; // Both closed and archived go to open

            for (const ticket of tickets) {
                try {
                    await Ticket.updateStatus(ticket.id, newStatus);
                    
                    // Try to recreate channel if needed
                    if (status === 'archived' || !interaction.guild.channels.cache.get(ticket.channelID)) {
                        const channel = await interaction.guild.channels.create({
                            name: `ticket-${ticket.userID.slice(-4)}`,
                            type: ChannelType.GuildText,
                            parent: interaction.channel.parent,
                            permissionOverwrites: [
                                {
                                    id: interaction.guild.id,
                                    deny: ['ViewChannel']
                                },
                                {
                                    id: ticket.userID,
                                    allow: ['ViewChannel', 'SendMessages']
                                }
                            ]
                        });

                        await Ticket.update(ticket.id, { channelID: channel.id });
                    }
                    
                    reversedCount++;
                } catch (error) {
                    console.error(`Failed to reverse ticket ${ticket.ticketID}:`, error);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(`🔄 Bulk Ticket Reverse Complete`)
                .setColor('#00ff00')
                .addFields(
                    { name: 'Original Status', value: status.charAt(0).toUpperCase() + status.slice(1), inline: true },
                    { name: 'Tickets Reversed', value: `${reversedCount}/${tickets.length}`, inline: true },
                    { name: 'New Status', value: 'Open', inline: true },
                    { name: 'Performed By', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error performing bulk ticket reverse:', error);
            await interaction.editReply({ content: '❌ Failed to perform bulk ticket reverse' });
        }
    }
};
