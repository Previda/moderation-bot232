const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initDatabase } = require('./src/models/database');
const { handleDMCommand } = require('./src/utils/dmHandler');
const { handleTicketMenu, handleTicketMenuInteraction, handleModalSubmit } = require('./src/utils/ticketMenu');
require('dotenv').config();

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Load commands from all subdirectories
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) {
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        }
    }
}

// Global error handler for invalid commands
client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        
        // Global invalid command handler
        if (!command) {
            console.log(`❌ Invalid command attempted: /${interaction.commandName} by ${interaction.user.tag}`);
            return interaction.reply({ 
                content: '❌ **Invalid command!** Use `/commands` to see all available commands.', 
                ephemeral: true 
            });
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Command execution error:', error);
            const reply = { content: '❌ There was an error executing this command!', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }
});

// Handle DM messages and ticket menu commands
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Handle DM commands
    if (message.channel.type === 1) { // DM channel
        if (message.content.startsWith('!')) {
            await handleDMCommand(message);
        }
    }
    
    // Handle ticket menu command in guild channels
    if (message.guild && message.content.toLowerCase() === '!ticket') {
        await handleTicketMenu(message);
    }
});

// Handle button interactions and modals
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        // Handle ticket menu button interactions
        if (interaction.customId.startsWith('ticket_') || interaction.customId.startsWith('close_ticket_') || interaction.customId === 'cancel_close') {
            await handleTicketMenuInteraction(interaction);
        }
    } else if (interaction.isModalSubmit()) {
        // Handle modal submissions
        await handleModalSubmit(interaction);
    }
});

// Bot ready event
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} is online!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers`);
    console.log(`⚡ Loaded ${client.commands.size} commands`);
    
    // Initialize database
    await initDatabase();
    console.log('🗄️ Database initialized');
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
