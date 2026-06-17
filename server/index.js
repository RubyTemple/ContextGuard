require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fetch = require('node-fetch');
const { fetchWithRetry } = require('./utils');
const path = require('path');
const { processContext, estimateTokenCountSync } = require('./context');
const { logRequest, getLogs, getStats } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'qwen2.5-coder:1.5b';
const HEAVY_MODEL = process.env.HEAVY_MODEL || 'qwen2.5-coder:7b';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));

async function forwardRequest(req, res, path, body, targetModel, isHeavy) {
    const startTime = Date.now();
    let ttft = null;
    let tokensSaved = body._tokensSaved || 0;

    // Manage context size for heavy models to avoid OOM
    if (isHeavy) {
        if (!body.options) body.options = {};
        body.options.num_ctx = Math.min(body.options.num_ctx || 4096, 4096);
    }

    try {
        const payload = { ...body };
        delete payload._tokensSaved;
        const response = await fetchWithRetry(`${OLLAMA_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ollama error: ${response.status} ${errText}`);
        }

        // Handle streaming
        if (body.stream !== false) {
            // Forward headers correctly
            for (const [key, value] of response.headers.entries()) {
                res.setHeader(key, value);
            }

            response.body.on('data', (chunk) => {
                if (ttft === null) ttft = Date.now() - startTime;
                res.write(chunk);
            });

            response.body.on('end', () => {
                const totalTime = Date.now() - startTime;
                logRequest({
                    model: targetModel,
                    tokensSaved,
                    ttft: ttft || totalTime,
                    totalTime,
                    type: 'success',
                    message: `Streamed response`
                });
                res.end();
            });

            response.body.on('error', (err) => {
                console.error("Stream error:", err);
                logRequest({ model: targetModel, type: 'error', message: err.message, totalTime: Date.now() - startTime });
                res.end();
            });
        } else {
            // Non-streaming
            const data = await response.json();
            ttft = Date.now() - startTime;
            logRequest({
                model: targetModel,
                tokensSaved,
                ttft,
                totalTime: ttft,
                type: 'success',
                message: `Standard response`
            });
            res.json(data);
        }
    } catch (err) {
        console.error("Forwarding error:", err);
        logRequest({ model: targetModel, type: 'error', message: err.message, totalTime: Date.now() - startTime });
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
}

// Intercept Chat Requests
app.post(['/api/chat', '/v1/chat/completions'], async (req, res) => {
    try {
        let body = req.body;
        let messages = body.messages || [];

        // Dual-Model Smart Routing
        const isHeavy = req.headers['x-heavy-reasoning'] === 'true' ||
                        JSON.stringify(messages).toLowerCase().includes('deep think') ||
                        JSON.stringify(messages).toLowerCase().includes('heavy reasoning');

        let targetModel = isHeavy ? HEAVY_MODEL : DEFAULT_MODEL;

        // Override body model
        body.model = targetModel;

        // Context Pruning & Summarization
        const { messages: newMessages, tokensSaved, summarized } = await processContext(messages);

        body.messages = newMessages;
        body._tokensSaved = tokensSaved; // Temporary attached state

        console.log(`[Router] Routed to ${targetModel}. Tokens saved: ${tokensSaved}. Summarized: ${summarized}`);

        // Handle OpenAI vs Ollama paths slightly differently if needed
        // For now, assume Ollama natively supports both if running latest version
        // or we just forward the path exactly.
        const targetPath = req.path.includes('/v1/chat/completions') ? '/v1/chat/completions' : '/api/chat';

        await forwardRequest(req, res, targetPath, body, targetModel, isHeavy);

    } catch (err) {
        console.error("Request Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Dashboard APIs
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '100', 10);
        const logs = await getLogs(limit);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`ContextGuard Proxy running on port ${PORT}`);
    console.log(`Default Model: ${DEFAULT_MODEL}, Heavy Model: ${HEAVY_MODEL}`);
});
