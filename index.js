import dotenv from 'dotenv'
dotenv.config()

import {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle, 
} from 'discord.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.login(process.env.DISCORD_TOKEN);

const btn = new ButtonBuilder()
    .setCustomId('test')
    .setLabel('Do you want to test this?')
    .setStyle(ButtonStyle.Primary);

const row = new ActionRowBuilder()
    .addComponents(btn);

client.on("messageCreate", async (message) => {


    if (!message?.author.bot) {
        try {
            await message.author.send({
                content: 'Push my btns!',
                components: [row] 
            });
        } catch (error) {
            console.error(`Could not send DM to ${message.author.tag} (ID: ${message.author.id}). Error:`, error.message);

            if (error.code === 50007) { 
                message.reply("I tried to send you a DM, but it seems your DMs are closed. Please enable DMs from server members to use this feature.").catch(console.error);
            }
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return; // Make sure it's a button interaction

    if (interaction.customId === 'test') {
        try {
            await interaction.reply('You tested my button bruh!!!!!');
        } catch (error) {
            console.error("Error replying to button interaction:", error);
        }
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('error', console.error);