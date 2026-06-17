# ContextGuard

[🇮🇹 Versione Italiana](#italiano) | [🇬🇧 English Version](#english)

---

<a id="italiano"></a>
## 🇮🇹 ContextGuard: Ottimizzatore di Contesto e Router per LLM Locali

ContextGuard è un'API Proxy e Web Dashboard leggera e pronta per la produzione, scritta in Node.js (Express). Funge da intermediario tra i tuoi strumenti di sviluppo locali (o script personalizzati) e un'istanza locale di Ollama. L'obiettivo principale è prevenire gli errori di Out-of-Memory (OOM) della VRAM e ridurre drasticamente la latenza durante task che richiedono un contesto lungo, ottimizzando la finestra di contesto in tempo reale.

### Funzionalità Principali

1. **Proxy Inverso API (Il Core Middleware)**
   - Espone endpoint compatibili con OpenAI (`/v1/chat/completions`) e Ollama (`/api/chat`).
   - **Motore Anti-OOM (Context Pruning & Summarization):** Intercetta le richieste e stima il conteggio dei token. Se supera la soglia definita, il proxy estrae il 50% dei messaggi più vecchi, li invia in background a un modello ultra-veloce (es. `gemma2:2b` o `qwen2.5-coder:1.5b`) per generarne un riassunto conciso. Questo riassunto viene poi iniettato come nuovo messaggio di sistema, eliminando i messaggi storici pesanti per risparmiare memoria.

2. **Routing Intelligente a Doppio Modello (Ottimizzato per GPU con VRAM Bassa - Es. GTX 1650 4GB)**
   - Per default, indirizza le richieste standard a un modello locale leggero (`qwen2.5-coder:1.5b`) per garantire l'offloading al 100% sulla GPU.
   - Tramite un flag API esplicito (`x-heavy-reasoning: true`) o parole chiave, dirotta la richiesta a un modello più pesante (`qwen2.5-coder:7b`).
   - Gestione rigorosa del `num_ctx`: quando viene utilizzato il modello da 7B, la finestra di contesto viene limitata dinamicamente a un massimo di 4096 token, evitando il crash della RAM o cali di prestazioni dovuti alla Cache KV.

3. **Dashboard Web UI**
   - Una Single Page Application (SPA) moderna e dark-themed sviluppata con Tailwind CSS.
   - **Statistiche in Tempo Reale:** Metriche di ottimizzazione, Time to First Token (TTFT) e token risparmiati, visualizzati con grafici Chart.js.
   - **Mappa del Contesto:** Rappresentazione visiva della finestra di contesto attiva (parti intatte, riassunte e scartate).
   - **Log del Router:** Una console dinamica con colorazione delle righe (verde per standard, giallo per riassunti, rosso per errori).

### Installazione e Utilizzo

Il progetto è configurato per un deployment rapido tramite Docker.

\`\`\`bash
# Avvia il proxy e l'istanza di Ollama
docker compose up -d
\`\`\`

L'API del proxy sarà disponibile su \`http://localhost:3000\`.
La Dashboard Web sarà accessibile da \`http://localhost:3000\`.

---

<a id="english"></a>
## 🇬🇧 ContextGuard: Local LLM Context Optimizer & Router

ContextGuard is a lightweight, production-ready Local LLM Proxy API and Web Dashboard written in Node.js (Express). It acts as a middleman between local development tools (or custom scripts) and a local Ollama instance. Its main goal is to prevent VRAM Out-of-Memory (OOM) errors and drastically reduce latency during long-context tasks by optimizing the context window on the fly.

### Key Features

1. **API Reverse Proxy (The Core Middleware)**
   - Exposes OpenAI-compatible (`/v1/chat/completions`) and Ollama-compatible (`/api/chat`) endpoints.
   - **Anti-OOM Engine (Context Pruning & Summarization):** Intercepts incoming requests and estimates the token count. If the threshold is exceeded, the proxy extracts the older 50% of the messages and sends them to a smaller, ultra-fast model (e.g., `gemma2:2b` or `qwen2.5-coder:1.5b`) to generate a concise summary. This summary is injected as a new system message, dropping the original heavy historical messages.

2. **Dual-Model Smart Routing (Optimized for Low-VRAM GPUs - E.g. GTX 1650 4GB)**
   - By default, routes standard requests to a lightweight local model (`qwen2.5-coder:1.5b`) to ensure 100% GPU offloading.
   - Using an explicit API flag (`x-heavy-reasoning: true`) or keywords, it swaps the request to a heavier model (`qwen2.5-coder:7b`).
   - Strict `num_ctx` management: When routing to the 7B model, the context window is dynamically limited to a max of 4096 tokens, ensuring the KV Cache does not trigger a system RAM crash.

3. **Web Dashboard UI**
   - A modern, dark-themed Single Page Application (SPA) built with Tailwind CSS.
   - **Live Stats:** Real-time optimization metrics, Time to First Token (TTFT), and tokens saved, visualized with Chart.js.
   - **Context Map Viewer:** Visual representation of the active context window (intact, summarized, and dropped parts).
   - **Router Logs:** A dynamic terminal-like log view with color-coded lines (green for hits, yellow for warnings/summarizations, red for errors).

### Setup and Usage

The project is configured for quick deployment using Docker.

\`\`\`bash
# Start the proxy and Ollama instance
docker compose up -d
\`\`\`

The proxy API will run on \`http://localhost:3000\`.
The Web Dashboard will be available at \`http://localhost:3000\`.
