require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];

// Function to load commands recursively
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            try {
                const command = require(filePath);
                if (command.data && command.data.toJSON) {
                    commands.push(command.data.toJSON());
                    console.log(`✅ Loaded command: ${command.data.name}`);
                }
            } catch (error) {
                console.error(`❌ Error loading command ${file}:`, error.message);
            }
        }
    }
}

// Load all commands
const commandsPath = path.join(__dirname, 'src', 'commands');
loadCommands(commandsPath);

console.log(`\n📊 Total commands loaded: ${commands.length}`);

// Register commands with Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('\n🔄 Started refreshing application (/) commands...');
        
        // Get the client ID from the token
        const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();
        
        // Register commands globally
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`✅ Successfully registered ${data.length} application commands globally!`);
        console.log('\n📝 Commands will be available in all servers where the bot is present.');
        console.log('⏱️ It may take up to 1 hour for global commands to propagate.');
        
        // List all registered commands
        console.log('\n📋 Registered commands:');
        data.forEach(cmd => {
            console.log(`  • /${cmd.name} - ${cmd.description}`);
        });
        
    } catch (error) {
        console.error('❌ Error registering commands:', error);
        if (error.code === 50001) {
            console.log('🔑 Missing Access: Make sure the bot token is valid and has the right permissions.');
        } else if (error.code === 10002) {
            console.log('🔑 Unknown Application: The bot token might be invalid.');
        }
    }
})();
