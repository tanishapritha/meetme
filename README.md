# MeetMe

Enterprise-grade meeting intelligence platform. Real-time transcription, document-grounded insights, and proactive context injection.

## Stack
- **Framework:** Next.js 14 (App Router)
- **Intelligence:** OpenRouter / Gemini
- **Transcription:** Deepgram (Nova-2)
- **Persistence:** Dexie.js (Local-first)
- **UI:** Tailwind CSS + Framer Motion

## Development
```bash
npm install
npm run dev
```

## Architecture
- **Server Actions:** All heavy intelligence and API calls are handled server-side to protect keys and offload compute.
- **RAG Engine:** Local-first vector search running in the browser for maximum privacy and low latency.
- **Micro-Briefings:** Real-time entity extraction from ingested assets.
