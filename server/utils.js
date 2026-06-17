// Exponential backoff fetch
const fetch = require('node-fetch');

async function fetchWithRetry(url, options, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const response = await fetch(url, options);
            if (!response.ok && response.status >= 500) {
                throw new Error(`Server Error: ${response.status}`);
            }
            return response;
        } catch (err) {
            retries++;
            if (retries >= maxRetries) {
                throw err;
            }
            // Exponential backoff: 500ms, 1000ms, 2000ms...
            const delay = Math.pow(2, retries - 1) * 500;
            console.log(`[Retry] Request failed. Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

module.exports = { fetchWithRetry };
