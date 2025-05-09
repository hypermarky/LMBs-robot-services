import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, Collection, Events, ActivityType } from 'discord.js'; // Added ActivityType
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as quoteManager from './utils/quoteManager.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Asynchronously load all commands
async function loadCommands() {
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        try {
            const commandModule = await import(fileUrl);

            // For slash commands (Chat Input)
            if (commandModule.data && typeof commandModule.data.name === 'string') {
                client.commands.set(commandModule.data.name, commandModule);
                console.log(`[CommandHandler] Loaded SLASH command: ${commandModule.data.name}`);
            }

            // For Context Menu commands
            if (commandModule.contextMenu && typeof commandModule.contextMenu.name === 'string') {
                client.commands.set(commandModule.contextMenu.name, commandModule); // Key by context menu name
                console.log(`[CommandHandler] Loaded CONTEXT MENU command: ${commandModule.contextMenu.name}`);
            }

            if (!commandModule.data && !commandModule.contextMenu) {
                 console.log(`[WARNING] The command module at ${filePath} is missing "data" (for slash) or "contextMenu" property.`);
            }

        } catch (error) {
            console.error(`[CommandHandler] Error loading command ${filePath}:`, error);
        }
    }
}


client.once(Events.ClientReady, async c => { // Make ready event async
    await loadCommands(); // Ensure commands are loaded before bot is fully ready
    console.log(`Ready! Logged in as ${c.user.tag}`);
    client.user.setActivity('/quote help', { type: ActivityType.Listening }); // Use ActivityType enum
});

client.on(Events.InteractionCreate, async interaction => {
    // We only care about command interactions (chat input, user context, message context)
    if (!interaction.isCommand() && !interaction.isContextMenuCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching "${interaction.commandName}" was found.`);
        // Optionally reply to user, but be careful with ephemeral messages here.
        // It's often better to just log if a command truly isn't registered.
        // await interaction.reply({ content: `Command not found.`, ephemeral: true }).catch(console.error);
        return;
    }

    try {
        await command.execute(interaction); // The execute function in quote.js handles different interaction types
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const replyOptions = { content: 'There was an error while executing this command!', flags: 64 }; // 64 for ephemeral
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(replyOptions).catch(console.error);
        } else {
            await interaction.reply(replyOptions).catch(console.error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);