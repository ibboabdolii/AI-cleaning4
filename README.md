# CleanAI MVP

Monorepo scaffold:
- apps/web (Vite + React + TS)
- apps/api-gateway (Node.js + TS)
- apps/dialog-service (Node.js + TS)
- apps/nlu-service (Python FastAPI)
- packages/schemas, packages/shared
- infra/docker-compose + scripts
- docs (rfc, runbook, api)

## Local development
- Run `npm run dev:api` to start the local chat API stub on port 8787.
- Run `npm run dev` for Vite (or `npm run dev:full` to start both together).
- During dev, `/api/ai/chat` is proxied to the local stub so chat replies return JSON instead of HTML.
