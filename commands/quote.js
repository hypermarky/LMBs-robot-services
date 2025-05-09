import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js'; // Added ApplicationCommandType and ContextMenuCommandBuilder
import * as quoteManager from '../utils/quoteManager.js';

// --- Slash Command Definition ---
export const data = new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Manages quotes for the server.')
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Adds a quote. For existing messages, right-click message -> Apps -> "Quote This Message".')
            .addUserOption(option => option.setName('user').setDescription('The user who said the quote (for manual entry).').setRequired(true))
            .addStringOption(option => option.setName('text').setDescription('The quote text (for manual entry).').setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('get')
            .setDescription('Gets a quote.')
            .addStringOption(option => option.setName('query').setDescription('Quote ID or part of the quoter\'s name/ID (optional, for random).')))
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Lists quotes.')
            .addUserOption(option => option.setName('user').setDescription('Filter quotes by this user (optional).')))
    .addSubcommand(subcommand =>
        subcommand
            .setName('delete')
            .setDescription('Deletes a quote by its ID.')
            .addIntegerOption(option => option.setName('id').setDescription('The ID of the quote to delete.').setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('help')
            .setDescription('Shows help information for quote commands.'));

// --- Message Context Menu Command Definition ---
export const contextMenu = new ContextMenuCommandBuilder()
    .setName('Quote This Message')
    .setType(ApplicationCommandType.Message); // Crucial: sets this as a message context menu

// --- Execution Logic ---
export async function execute(interaction) {
    const guildId = interaction.guild.id;
    const member = interaction.member; // The member who ran the command

    try {
        // --- Handle Message Context Menu for Quoting ---
        if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Quote This Message') {
            const targetMessage = interaction.targetMessage; // The message that was right-clicked

            if (!targetMessage || (!targetMessage.content && targetMessage.embeds.length === 0 && targetMessage.attachments.size === 0)) {
                return interaction.reply({ content: "Cannot quote an empty message (no text, embeds, or attachments).", ephemeral: true });
            }

            const quoterUser = targetMessage.author;
            let quoteTextContent = targetMessage.content;
            if (!quoteTextContent && (targetMessage.embeds.length > 0 || targetMessage.attachments.size > 0) ) {
                quoteTextContent = `[Message from ${quoterUser.username} with embeds/attachments but no text content]`;
            }
            const originalMessageId = targetMessage.id;

            const newQuote = quoteManager.addQuote({
                text: quoteTextContent,
                quoterName: quoterUser.displayName || quoterUser.username,
                quoterId: quoterUser.id,
                adderTag: interaction.user.tag,
                adderId: interaction.user.id,
                guildId,
                originalMessageId,
                channelId: targetMessage.channel.id,
                context: null,
            });

            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('Quote Added!')
                .setDescription(`"${newQuote.text}"`)
                .addFields({ name: 'Quoted', value: newQuote.quoterName, inline: true })
                .addFields({ name: 'Added by', value: interaction.user.toString(), inline: true })
                .addFields({ name: 'Original Message', value: `[Jump to Message](https://discord.com/channels/${guildId}/${targetMessage.channel.id}/${originalMessageId})` })
                .setFooter({ text: `Quote ID: ${newQuote.id}` })
                .setTimestamp(new Date(newQuote.timestamp));
            if (quoterUser.avatarURL()) embed.setThumbnail(quoterUser.avatarURL());
            return interaction.reply({ embeds: [embed] });
        }

        // --- Handle Slash Commands (Chat Input) ---
        if (interaction.isChatInputCommand() && interaction.commandName === 'quote') {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'add') {
                // This is for manual entry via /quote add user:... text:...
                const quoterUser = interaction.options.getUser('user');
                const quoteTextContent = interaction.options.getString('text');

                // No need to check for reply here, as this path is for explicit user/text input.
                // The message context menu handles "quoting an existing message".

                const newQuote = quoteManager.addQuote({
                    text: quoteTextContent,
                    quoterName: quoterUser.displayName || quoterUser.username,
                    quoterId: quoterUser.id,
                    adderTag: interaction.user.tag,
                    adderId: interaction.user.id,
                    guildId,
                    originalMessageId: null, // No original message ID for manual entry
                    context: null,
                });

                const embed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setTitle('Quote Added Manually!')
                    .setDescription(`"${newQuote.text}"`)
                    .addFields({ name: 'Quoted', value: newQuote.quoterName, inline: true })
                    .addFields({ name: 'Added by', value: interaction.user.toString(), inline: true })
                    .setFooter({ text: `Quote ID: ${newQuote.id}` })
                    .setTimestamp(new Date(newQuote.timestamp));
                if (quoterUser.avatarURL()) embed.setThumbnail(quoterUser.avatarURL());
                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'get') {
                // ... (get logic remains the same)
                const query = interaction.options.getString('query');
                const serverQuotes = quoteManager.getQuotes(guildId);

                if (serverQuotes.length === 0) {
                    return interaction.reply({ content: 'No quotes found on this server yet. Add some with `/quote add` or by right-clicking a message!', ephemeral: true });
                }

                let targetQuotes = serverQuotes;
                if (query) {
                    const byId = quoteManager.findQuoteById(query, guildId);
                    if (byId) {
                        targetQuotes = [byId];
                    } else {
                        targetQuotes = quoteManager.findQuotesByQuoter(query, guildId);
                    }
                }

                if (targetQuotes.length === 0) {
                    return interaction.reply({ content: `No quotes found matching your query: "${query || 'random'}".`, ephemeral: true });
                }

                const randomQuote = targetQuotes[Math.floor(Math.random() * targetQuotes.length)];
                const quoterFetchedUser = await interaction.client.users.fetch(randomQuote.quoterId).catch(() => ({ username: randomQuote.quoterName, displayAvatarURL: () => null }));

                const embed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setDescription(`> ${randomQuote.text}`)
                    .setAuthor({ name: randomQuote.quoterName, iconURL: quoterFetchedUser.displayAvatarURL() })
                    .setFooter({ text: `Quote ID: ${randomQuote.id} | Added by: ${randomQuote.adderTag}` })
                    .setTimestamp(new Date(randomQuote.timestamp));

                if (randomQuote.originalMessageId && randomQuote.channelId) { // Assuming you store channelId
                     embed.addFields({name: 'Original Message', value: `[Jump to Message](https://discord.com/channels/${guildId}/${randomQuote.channelId}/${randomQuote.originalMessageId})`});
                } else if (randomQuote.originalMessageId) {
                    // Fallback if channelId wasn't stored, link might not work if bot is in many channels
                    embed.addFields({name: 'Original Message Context', value: `From an earlier message (ID: ${randomQuote.originalMessageId})`});
                }
                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'list') {
                // ... (list logic remains the same)
                const userFilter = interaction.options.getUser('user');
                let serverQuotes = quoteManager.getQuotes(guildId);

                if (userFilter) {
                    serverQuotes = serverQuotes.filter(q => q.quoterId === userFilter.id);
                }

                if (serverQuotes.length === 0) {
                    return interaction.reply({ content: userFilter ? `No quotes found from ${userFilter.username} on this server.` : 'No quotes found on this server.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setTitle(userFilter ? `Quotes from ${userFilter.username}` : 'All Server Quotes');

                const fields = [];
                for (let i = 0; i < Math.min(serverQuotes.length, 25); i++) {
                    const q = serverQuotes[i];
                    fields.push({
                        name: `ID: ${q.id} - By: ${q.quoterName}`,
                        value: `"${q.text.substring(0, 100)}${q.text.length > 100 ? '...' : ''}"`
                    });
                }
                embed.setFields(fields);
                if (serverQuotes.length > 25) embed.setFooter({ text: `Showing ${fields.length} of ${serverQuotes.length} quotes.`});
                await interaction.reply({ embeds: [embed] });


            } else if (subcommand === 'delete') {
                // ... (delete logic remains the same)
                const quoteId = interaction.options.getInteger('id');
                const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
                const result = quoteManager.deleteQuote(quoteId, guildId, interaction.user.id, isAdmin);

                await interaction.reply({ content: result.message, ephemeral: result.success ? false : true });


            } else if (subcommand === 'help') {
                // ... (help logic remains the same)
                const helpEmbed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setTitle('Quote Bot Help')
                    .setDescription('Here\'s how to use the quote commands:')
                    .addFields(
                        { name: '`Right-Click Message -> Apps -> Quote This Message`', value: 'The easiest way to quote an existing message.' },
                        { name: '`/quote add user:<user> text:<"quote text">`', value: 'Manually add a new quote.' },
                        { name: '`/quote get [query]`', value: 'Shows a quote. Provide an ID or quoter name/ID to search. If empty, shows a random quote.' },
                        { name: '`/quote list [user]`', value: 'Lists quotes. Optionally filter by a specific user.' },
                        { name: '`/quote delete id:<ID>`', value: 'Deletes a quote by its ID. (Requires being the adder or Admin).' }
                    )
                    .setFooter({ text: 'Enjoy quoting!'});
                await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
            }
        }

    } catch (error) {
        console.error(`Error executing command:`, error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
}