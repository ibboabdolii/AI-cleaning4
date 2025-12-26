# CleanAI Demo (HTML + Express)

## Run (Windows / macOS / Linux)
1) Install Node.js (recommended Node 18+)
2) Install deps:
   - `npm install`
3) Start:
   - `npm run dev`
4) Open:
   - http://localhost:3000

## Why AI didn’t respond before?
- Opening `index.html` via `file://` has no backend, so `/api/ai/chat` does not exist.
- Some preview/sandbox environments proxy requests via `postMessage`; `AbortSignal` cannot be cloned and can trigger:
  - `DataCloneError: AbortSignal object could not be cloned`
This demo avoids AbortController entirely and manages requests via queue + requestId.

## Tailwind CDN warning
`cdn.tailwindcss.com` is fine for demos.
For production:
- Install Tailwind via PostCSS or Tailwind CLI
- Generate a static CSS bundle and remove the CDN script tag
Docs: Tailwind CSS Installation

## API
POST /api/ai/chat
Body:
{
  tenantId, locale, channel, messages, context
}
Response:
{
  assistantMessage, quickActions?, cards?, nav?
}
