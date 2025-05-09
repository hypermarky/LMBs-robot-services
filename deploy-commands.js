import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

dotenv.config();

const commands = [];
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const fileUrl = pathToFileURL(filePath).href;
    const commandModule = await import(fileUrl);

    // Register slash command data
    if ('data' in commandModule && commandModule.data) { // Check if data exists
        commands.push(commandModule.data.toJSON());
        console.log(`[Deploy] Added slash command: ${commandModule.data.name}`);
    }
    // Register context menu command data
    if ('contextMenu' in commandModule && commandModule.contextMenu) { // Check if contextMenu exists
        commands.push(commandModule.contextMenu.toJSON());
        console.log(`[Deploy] Added context menu command: ${commandModule.contextMenu.name}`);
    }

    if (!('data' in commandModule && commandModule.data) && !('contextMenu' in commandModule && commandModule.contextMenu)) {
         console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "contextMenu" property.`);
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application commands.`);
        // ... (rest of your deploy logic remains the same)
        let route;
        if (process.env.GUILD_ID && process.env.CLIENT_ID) {
            route = Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID);
            console.log('Deploying commands to GUILD:', process.env.GUILD_ID);
        } else if (process.env.CLIENT_ID) {
            route = Routes.applicationCommands(process.env.CLIENT_ID);
            console.log('Deploying commands GLOBALLY.');
        } else {
            console.error("CLIENT_ID is missing in your .env file. Cannot deploy commands.");
            return;
        }

        const data = await rest.put(route, { body: commands });
        console.log(`Successfully reloaded ${data.length} application commands.`);
    } catch (error) {
        console.error(error);
    }
})();