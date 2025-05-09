import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

dotenv.config();

const commands = [];
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; 
const token = process.env.DISCORD_TOKEN;

async function loadAndPrepareCommands() {
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        try {
            const commandModule = await import(fileUrl);

            if (commandModule.data) { 
                commands.push(commandModule.data.toJSON());
                console.log(`Prepared slash command: ${commandModule.data.name}`);
            }
            if (commandModule.contextMenu) { 
                commands.push(commandModule.contextMenu.toJSON());
                console.log(`Prepared context menu command: ${commandModule.contextMenu.name}`);
            }
        } catch (error) {
            console.error(`Error loading command from ${filePath} for deployment:`, error);
        }
    }
}

async function deploy() {
    await loadAndPrepareCommands();

    if (!token) {
        console.error('DISCORD_TOKEN is not set in .env file. Cannot deploy commands.');
        return;
    }
    if (!clientId) {
        console.error('CLIENT_ID is not set in .env file. Cannot deploy commands.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`Started refreshing ${commands.length} application (/) and context menu commands.`);

        if (!guildId) {
            console.warn('GUILD_ID not set in .env. Deploying globally. This can take up to an hour to show.');
             await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            console.log('Successfully reloaded application commands globally.');
        } else {
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            console.log(`Successfully reloaded application commands for guild ${guildId}.`);
        }


    } catch (error) {
        console.error(error);
    }
}

deploy();