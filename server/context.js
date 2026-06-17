const { encode } = require('gpt-tokenizer');
const { fetchWithRetry } = require('./utils');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const SMALL_MODEL = process.env.SMALL_MODEL || 'gemma2:2b';

// Dynamic threshold (we can override via env)
const MAX_TOKENS_THRESHOLD = parseInt(process.env.MAX_TOKENS_THRESHOLD || '4000', 10);

function estimateTokenCountSync(messages) {
    let count = 0;
    for (const msg of messages) {
        if (msg.content && typeof msg.content === 'string') {
            const tokens = encode(msg.content);
            count += tokens.length;
        }
    }
    return count;
}

async function summarizeMessages(messagesToSummarize) {
    const contentToSummarize = messagesToSummarize.map(m => `${m.role}: ${m.content}`).join('\n');

    const prompt = `Please provide a concise structured summary of the following conversation history. Keep it brief but retain the core context, intent, and facts.\n\n${contentToSummarize}`;

    try {
        const response = await fetchWithRetry(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: SMALL_MODEL,
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama summarization failed with status ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    } catch (err) {
        console.error("Error during summarization:", err);
        return "Summary generation failed. " + contentToSummarize.substring(0, 500) + "...";
    }
}

async function processContext(messages) {
    const currentTokenCount = estimateTokenCountSync(messages);
    let tokensSaved = 0;
    let newMessages = [...messages];
    let summarized = false;

    if (currentTokenCount > MAX_TOKENS_THRESHOLD && messages.length > 2) {
        let splitIndex = Math.floor(messages.length / 2);

        const messagesToSummarize = messages.slice(0, splitIndex);
        const keptMessages = messages.slice(splitIndex);

        const summary = await summarizeMessages(messagesToSummarize);

        const summarizedTokenCount = estimateTokenCountSync([{ content: summary }]);
        const originalSlicedCount = estimateTokenCountSync(messagesToSummarize);
        tokensSaved = originalSlicedCount - summarizedTokenCount;

        if (tokensSaved < 0) tokensSaved = 0; // Just in case summary is longer

        newMessages = [
            { role: 'system', content: `[SYSTEM SUMMARY OF PREVIOUS CONTEXT]\n${summary}` },
            ...keptMessages
        ];
        summarized = true;
    }

    return {
        messages: newMessages,
        tokensSaved,
        summarized,
        estimatedTokens: currentTokenCount
    };
}

module.exports = {
    processContext,
    estimateTokenCountSync
};
