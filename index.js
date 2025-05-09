import dotenv from 'dotenv'
dotenv.config()

import { 
    Client, 
    GatewayIntentBits,
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
    ],
});

client.login(process.env.DISCORD_TOKEN)

const btn = new ButtonBuilder()
        .setCustomId('test')
        .setLabel('Do you want to test this?')
        .setStyle(ButtonStyle.Primary);

client.on("messageCreate", async (message) => {

    console.log(message)

    if (!message?.author.bot) {
        message.author.send({
            content: 'Push my btns!',
            components: [btn]
        });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.customId === 'test') {
        await interaction.reply('You tested my button bruh!!!!!')
    }
});