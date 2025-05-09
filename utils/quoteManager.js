import fs from 'fs';
import path from 'path';

const QUOTES_FILE = path.join(process.cwd(), 'quotes.json');
let quotes = [];

function loadQuotes() {
    try {
        if (fs.existsSync(QUOTES_FILE)) {
            const data = fs.readFileSync(QUOTES_FILE, 'utf8');
            quotes = JSON.parse(data);
            console.log(`[QuoteManager] Loaded ${quotes.length} quotes.`);
        } else {
            quotes = [];
            fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2));
            console.log('[QuoteManager] quotes.json not found, created a new empty one.');
        }
    } catch (error) {
        console.error('[QuoteManager] Error loading quotes:', error);
        quotes = [];
    }
}

function saveQuotes() {
    try {
        fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2));
    } catch (error) {
        console.error('[QuoteManager] Error saving quotes:', error);
    }
}

function getQuotes(guildId) {
    return quotes.filter(q => q.guildId === guildId);
}

function addQuote({ text, quoterName, quoterId, adderTag, adderId, guildId, originalMessageId, context }) {
    const newQuote = {
        id: quotes.length > 0 ? Math.max(0, ...quotes.map(q => q.id || 0)) + 1 : 1,
        text,
        quoterName,
        quoterId,
        adderTag,
        adderId,
        timestamp: new Date().toISOString(),
        guildId,
        originalMessageId,
        context, 
    };
    quotes.push(newQuote);
    saveQuotes();
    return newQuote;
}

function findQuoteById(id, guildId) {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return null;
    return getQuotes(guildId).find(q => q.id === numericId);
}

function findQuotesByQuoter(quoterNameOrId, guildId) {
    const searchLower = quoterNameOrId.toLowerCase();
    return getQuotes(guildId).filter(q =>
        q.quoterName.toLowerCase().includes(searchLower) || q.quoterId === quoterNameOrId
    );
}

function deleteQuote(id, guildId, userId, isAdmin) {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return { success: false, message: 'Invalid quote ID.' };

    const quoteIndex = quotes.findIndex(q => q.id === numericId && q.guildId === guildId);

    if (quoteIndex === -1) {
        return { success: false, message: `No quote found with ID ${numericId} on this server.` };
    }

    const quoteToDelete = quotes[quoteIndex];
    if (quoteToDelete.adderId === userId || isAdmin) {
        const deletedQuote = quotes.splice(quoteIndex, 1)[0];
        saveQuotes();
        return { success: true, quote: deletedQuote, message: `Quote ID ${deletedQuote.id} has been deleted.` };
    } else {
        return { success: false, message: "You can only delete quotes you added, or you need Administrator permissions." };
    }
}

// Load quotes when the module is initialized
loadQuotes();

export {
    loadQuotes,
    saveQuotes,
    getQuotes,
    addQuote,
    findQuoteById,
    findQuotesByQuoter,
    deleteQuote,
};