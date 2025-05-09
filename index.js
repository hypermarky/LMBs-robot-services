import { Client, GatewayIntentBits, Collection, Events, ActivityType, Activity } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import dbPool from './utils/db.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
const commandsPath = path.join(process.cwd(), 'commands');

async function loadCommands() {
    if (!fs.existsSync(commandsPath)) {
        console.warn(`[CommandHandler] Commands directory not found at: ${commandsPath}. Skipping command loading.`);
        return;
    }
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    console.log(`[CommandHandler DEBUG] Found command files in '${commandsPath}': ${commandFiles.join(', ')}`);

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        try {
            const commandModule = await import(fileUrl);

            if (commandModule.data && typeof commandModule.data.name === 'string') {
                client.commands.set(commandModule.data.name, commandModule);
                console.log(`[CommandHandler] Loaded SLASH command: ${commandModule.data.name} from ${file}`);
            }

            if (commandModule.contextMenu && typeof commandModule.contextMenu.name === 'string') {
                client.commands.set(commandModule.contextMenu.name, commandModule);
            }

            if (!commandModule.data && !commandModule.contextMenu) {
                 console.warn(`[WARNING] The command module at ${filePath} (file: ${file}) is missing a "data" (for slash) or "contextMenu" property, or they are invalid.`);
            }

        } catch (error) {
            console.error(`[CommandHandler] Error loading command ${filePath}:`, error);
        }
    }
}

async function updateBotStatsInDB() {
    if (!client.isReady()) {
        return;
    }
    if (!dbPool) {
        console.error('[StatsDB] Database pool is not initialized/available. Skipping stats update.');
        return;
    }

    const guildCount = client.guilds.cache.size;
    let memberCount = 0;
    client.guilds.cache.forEach(guild => {
        memberCount += guild.memberCount;
    });

    try {
        const guildQuery = "INSERT INTO bot_stats (stat_name, stat_value) VALUES ('guildCount', ?) ON DUPLICATE KEY UPDATE stat_value = VALUES(stat_value)";
        await dbPool.query(guildQuery, [guildCount]);

        const memberQuery = "INSERT INTO bot_stats (stat_name, stat_value) VALUES ('memberCount', ?) ON DUPLICATE KEY UPDATE stat_value = VALUES(stat_value)";
        await dbPool.query(memberQuery, [memberCount]);

    } catch (error) {
        console.error('[StatsDB] Error updating bot stats in database:', error.message); 
    }
}

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    await loadCommands();
    client.user.setActivity('/quote help', { type: ActivityType.Listening });

    console.log(`[BotInit] Initial calculation: ${client.guilds.cache.size} guilds, ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} users.`);
    await updateBotStatsInDB();

    const updateIntervalMinutes = 15;
    setInterval(updateBotStatsInDB, updateIntervalMinutes * 60 * 1000);
    console.log(`[StatsDB] Stats will be updated periodically every ${updateIntervalMinutes} minutes.`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand() && !interaction.isContextMenuCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`No command matching "${interaction.commandName}" was found.`);
        return;
    }
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const replyOptions = { content: 'There was an error while executing this command!', flags: 64 };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(replyOptions).catch(console.error);
        } else {
            await interaction.reply(replyOptions).catch(console.error);
        }
    }
});

client.on(Events.GuildCreate, async (guild) => {
    console.log(`[Event] Joined a new guild: ${guild.name} (ID: ${guild.id})`);
    await updateBotStatsInDB();
});

client.on(Events.GuildDelete, async (guild) => {
    console.log(`[Event] Left a guild: ${guild.name} (ID: ${guild.id})`);
    await updateBotStatsInDB();
});

// Check for DISCORD_TOKEN before attempting login
if (!process.env.DISCORD_TOKEN) {
    console.error("CRITICAL: DISCORD_TOKEN environment variable is not set. Bot cannot start.");
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);