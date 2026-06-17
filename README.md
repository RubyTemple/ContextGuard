# ContextGuard

[🇮🇹 Versione Italiana](#italiano) | [🇬🇧 English Version](#english)

---

<a id="italiano"></a>
## 🇮🇹 ContextGuard: Ottimizzatore di Contesto e Router per LLM Locali

ContextGuard è un'API Proxy e Web Dashboard leggera e pronta per la produzione, scritta in Node.js (Express). Funge da intermediario tra i tuoi strumenti di sviluppo locali (o script personalizzati) e un'istanza locale di Ollama. L'obiettivo principale è prevenire gli errori di Out-of-Memory (OOM) della VRAM e ridurre drasticamente la latenza durante task che richiedono un contesto lungo, ottimizzando la finestra di contesto in tempo reale.

### Funzionalità Principali

1. **Proxy Inverso API (Il Core Middleware)**
   - Espone endpoint compatibili con OpenAI (`/v1/chat/completions`) e Ollama (`/api/chat`).
   - **Motore Anti-OOM (Context Pruning & Summarization):** Intercetta le richieste e stima il conteggio dei token. Se supera la soglia definita, il proxy estrae il 50% dei messaggi più vecchi, li invia in background a un modello ultra-veloce configurabile per generarne un riassunto conciso. Questo riassunto viene poi iniettato come nuovo messaggio di sistema, eliminando i messaggi storici pesanti per risparmiare memoria.

2. **Routing Intelligente a Doppio Modello (Ottimizzato per GPU con VRAM Bassa)**
   - Per default, indirizza le richieste standard a un modello locale leggero per garantire l'offloading al 100% sulla GPU e velocità massime (es. per setup con 4GB VRAM).
   - Tramite un flag API esplicito (`x-heavy-reasoning: true`) o parole chiave, dirotta la richiesta a un modello più pesante e avanzato.
   - Gestione rigorosa del `num_ctx`: quando viene utilizzato il modello pesante, la finestra di contesto viene limitata dinamicamente a un massimo di 4096 token, evitando il crash della RAM o cali di prestazioni dovuti alla Cache KV.

3. **Dashboard Web UI**
   - Una Single Page Application (SPA) moderna e dark-themed sviluppata con Tailwind CSS.
   - **Statistiche in Tempo Reale:** Metriche di ottimizzazione, Time to First Token (TTFT) e token risparmiati, visualizzati con grafici Chart.js.
   - **Mappa del Contesto:** Rappresentazione visiva della finestra di contesto attiva (parti intatte, riassunte e scartate).
   - **Log del Router:** Una console dinamica con colorazione delle righe (verde per standard, giallo per riassunti, rosso per errori).

### Prerequisiti

Prima di avviare ContextGuard, assicurati di avere:
- **Docker** e **Docker Compose** installati sul tuo sistema.
- Un'istanza di **Ollama** funzionante (puoi farla gestire dal docker-compose incluso o collegarti a una esterna).
- I modelli che intendi utilizzare già scaricati in Ollama (es. `ollama run qwen2.5-coder:1.5b` e `ollama run qwen2.5-coder:7b`).

### Configurazione

ContextGuard è altamente flessibile e agnostico rispetto ai modelli scelti. Puoi personalizzare il comportamento modificando le variabili d'ambiente nel file `docker-compose.yml` o in un file `.env`:

- `OLLAMA_URL`: L'URL della tua istanza Ollama (default: `http://127.0.0.1:11434` o `http://ollama:11434` se usi docker-compose).
- `PORT`: La porta su cui esporre il proxy (default: `3000`).
- `SMALL_MODEL`: Il modello veloce utilizzato per i riassunti in background (es. `gemma2:2b`).
- `DEFAULT_MODEL`: Il modello leggero usato di default (es. `qwen2.5-coder:1.5b`).
- `HEAVY_MODEL`: Il modello pesante usato per il ragionamento complesso (es. `qwen2.5-coder:7b`).
- `MAX_TOKENS_THRESHOLD`: La soglia massima di token prima che si attivi il riassunto (default: `4000`).

### Installazione e Avvio

Il progetto è configurato per un deployment rapido tramite Docker.

```bash
# Clona il repository
git clone https://github.com/RubyTemple/ContextGuard.git
cd ContextGuard

# Assicurati che i modelli siano stati scaricati in Ollama se lo usi localmente, poi avvia i servizi
docker compose up -d
```

L'API del proxy e la Dashboard Web saranno disponibili su `http://localhost:3000`.

---

<a id="english"></a>
## 🇬🇧 ContextGuard: Local LLM Context Optimizer & Router

ContextGuard is a lightweight, production-ready Local LLM Proxy API and Web Dashboard written in Node.js (Express). It acts as a middleman between local development tools (or custom scripts) and a local Ollama instance. Its main goal is to prevent VRAM Out-of-Memory (OOM) errors and drastically reduce latency during long-context tasks by optimizing the context window on the fly.

### Key Features

1. **API Reverse Proxy (The Core Middleware)**
   - Exposes OpenAI-compatible (`/v1/chat/completions`) and Ollama-compatible (`/api/chat`) endpoints.
   - **Anti-OOM Engine (Context Pruning & Summarization):** Intercepts incoming requests and estimates the token count. If the threshold is exceeded, the proxy extracts the older 50% of the messages and sends them to a configurable ultra-fast model to generate a concise summary. This summary is injected as a new system message, dropping the original heavy historical messages to save memory.

2. **Dual-Model Smart Routing (Optimized for Low-VRAM GPUs)**
   - By default, routes standard requests to a lightweight local model to ensure 100% GPU offloading and fast speeds (e.g., for 4GB VRAM setups).
   - Using an explicit API flag (`x-heavy-reasoning: true`) or keywords, it swaps the request to a heavier, more advanced model.
   - Strict `num_ctx` management: When routing to the heavy model, the context window is dynamically limited to a max of 4096 tokens, ensuring the KV Cache does not trigger a system RAM crash.

3. **Web Dashboard UI**
   - A modern, dark-themed Single Page Application (SPA) built with Tailwind CSS.
   - **Live Stats:** Real-time optimization metrics, Time to First Token (TTFT), and tokens saved, visualized with Chart.js.
   - **Context Map Viewer:** Visual representation of the active context window (intact, summarized, and dropped parts).
   - **Router Logs:** A dynamic terminal-like log view with color-coded lines (green for hits, yellow for warnings/summarizations, red for errors).

### Prerequisites

Before starting ContextGuard, ensure you have:
- **Docker** and **Docker Compose** installed on your system.
- A running instance of **Ollama** (you can let the included docker-compose manage it or connect to an external one).
- The models you intend to use already pulled in Ollama (e.g., `ollama run qwen2.5-coder:1.5b` and `ollama run qwen2.5-coder:7b`).

### Configuration

ContextGuard is highly flexible and model-agnostic. You can customize its behavior by modifying the environment variables in the `docker-compose.yml` or a `.env` file:

- `OLLAMA_URL`: The URL of your Ollama instance (default: `http://127.0.0.1:11434` or `http://ollama:11434` if using docker-compose).
- `PORT`: The port to expose the proxy on (default: `3000`).
- `SMALL_MODEL`: The fast model used for background summarizations (e.g., `gemma2:2b`).
- `DEFAULT_MODEL`: The lightweight model used by default (e.g., `qwen2.5-coder:1.5b`).
- `HEAVY_MODEL`: The heavy model used for complex reasoning (e.g., `qwen2.5-coder:7b`).
- `MAX_TOKENS_THRESHOLD`: The maximum token threshold before summarization triggers (default: `4000`).

### Setup and Start

The project is configured for quick deployment using Docker.

```bash
# Clone the repository
git clone https://github.com/RubyTemple/ContextGuard.git
cd ContextGuard

# Ensure models are pulled in Ollama if running locally, then start services
docker compose up -d
```

The Proxy API and Web Dashboard will be available at `http://localhost:3000`.
