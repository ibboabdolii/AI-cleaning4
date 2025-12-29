# AI Architecture, Costing, and UX Plan

This document outlines a pragmatic AI-first stack for a two-person team delivering a multilingual (SE/DE/ES/EN) chat-assisted booking experience across web, iOS, and Android.

## A) Cloud Architecture & Rough Monthly Costs

Assumptions (adjust per usage):
- ~3,000 chat conversations/month for MVP, ~50,000 for scaled.
- Average 1,000 input + 1,000 output tokens/turn, 8 turns per conversation.
- 20 hours/month of speech input for MVP, 300 hours for scaled.
- Light traffic for web/app assets (<1 TB egress/month for MVP, 10 TB for scaled).

### Reference Architecture (AWS-first, vendor-flexible)
- **Frontend:** Next.js (web) + Expo/React Native (mobile) deployed to Vercel (or AWS Amplify). Static assets via **CloudFront + S3**.
- **Backend API:** Fastify/Express (Node) on **AWS Fargate** (or Fly.io/Railway for simplicity). Use **AWS API Gateway + Lambda** for low-traffic webhooks where cold starts are acceptable.
- **Database:** **RDS Postgres (t4g/t3 micro → small)**. Use **Redis/ElastiCache** for session/cache if needed.
- **Auth:** **Cognito** (or Clerk/Auth0 if faster to ship; Supabase Auth if using Supabase).
- **File Storage:** **S3** with SSE + lifecycle rules.
- **Vector DB (RAG):** Managed **Pinecone/Weaviate Cloud**, or self-host **Qdrant** on a small VM/ECS service. Keep embeddings in same region as LLM calls to minimize latency.
- **LLM Access:** OpenAI GPT-4o/GPT-4o-mini via API Gateway VPC endpoints for egress control. Add **Together/Groq** as failover/cheaper paths.
- **Speech:** **AWS Transcribe** (realtime) or **Deepgram/Whisper API** as cheaper alternative. For mobile, allow on-device Whisper small/medium if feasible for privacy/offline.
- **Observability:** **CloudWatch + OpenTelemetry**, **Sentry** for frontend/backend, **Uptime Kuma/Healthchecks** for pings.
- **CI/CD:** GitHub Actions → Vercel/Fly/Railway deploys; IaC with Terraform or CDK (minimal modules).
- **Security:** **CloudFront WAF**, HTTPS via ACM, KMS-managed secrets, VPC-private DB, JWTs with short TTL + refresh, basic rate limits on chat endpoints.

### Cost Estimates (USD/month)
Costs vary by region and usage; these are directional.

| Service | MVP (low traffic) | Scaled (~50k conv/mo) | Notes |
| --- | --- | --- | --- |
| LLM API (OpenAI GPT-4o) | ~$120 (1.6M tokens input+output ≈ 1.6M/1k * $0.003) | ~$2,000 (26.7M tokens ≈ 26.7k * $0.003 + some 4o for quality) | Mix in GPT-4o mini or Groq/Llama-3 8B to cut 30–60%. |
| Vector DB (Pinecone serverless) | ~$30 | ~$200 | Could self-host Qdrant for ~$40–80 on a t3.small + EBS. |
| Embeddings (text-embedding-3-small) | ~$25 | ~$300 | Pre-compute; avoid per-request embeds. |
| Speech Recognition | ~$20 (20 hrs @ ~$1/hr Whisper API or $0.024/min Transcribe) | ~$400 (300 hrs) | Deepgram Nova/Whisper API can be ~$0.6–1/hr. |
| Backend compute (Fargate/Railway/Fly) | ~$40–80 | ~$300–500 | Autoscale to 1–2 tasks; API Gateway/Lambda for spiky traffic. |
| DB (RDS Postgres) | ~$30–60 (t4g.micro + storage) | ~$200–350 (t4g.small/medium + Multi-AZ) | Supabase Pro alt: ~$25–50 to start. |
| Storage + CDN (S3 + CloudFront) | ~$20 | ~$150–250 | Assumes <1 TB vs ~10 TB egress. Vercel CDN can cover web static. |
| Auth (Cognito) | ~$0–20 | ~$50–100 | Clerk/Auth0 will be higher (~$100–300). |
| Monitoring/Logging (CloudWatch + Sentry) | ~$20–40 | ~$80–150 | Keep log retention short; sample traces. |
| CI/CD (GitHub Actions) | ~$0–20 | ~$40–80 | Mostly free tier; self-hosted runners optional. |
| Security (WAF + secrets mgmt) | ~$30 | ~$100–150 | WAF $5/mo + $0.60/million req; Secrets Manager minimal use. |
| **Rough Total** | **~$355–455** | **~$4.4k–5.5k** | Can land lower with Fly/Railway + self-hosted Qdrant. |

## B) LLM and Speech Alternatives

- **Hosted LLM APIs (cheaper than GPT-4):**
  - **Groq** (Llama-3 8B/70B, Mixtral) – very low cost + fast throughput.
  - **Together** – pay-as-you-go for Mistral/Llama; good for fine-tuned models.
  - **Anyscale** – serving Llama/Mistral with serverless endpoints.
  - **Fireworks** – optimized serving for Llama/Mistral; supports tools/functions.
  - **OpenRouter** – meta-router with cost controls + fallbacks.
- **Open Source / Self-hosted:**
  - **Llama-3 8B/70B**, **Mistral 7B/8x7B**, **Phi-3** via **Ollama** or **vLLM** on a single GPU node (A10/A100) or even CPU for 7B at small scale.
  - **On-device (mobile):** run **Whisper tiny/small** for speech and **Phi-3 mini** or **Llama-3 8B quantized** for lightweight offline summaries; still route heavier tasks to cloud.
- **Speech alternatives:**
  - **OpenAI Whisper API** or **Deepgram Nova** (high accuracy, cheaper than Transcribe in many cases).
  - **Self-host Whisper** (medium/small) on GPU node (A10) for ~$0.60–1/hr infra cost; batch jobs fine, realtime needs GPU.
  - **Vosk** / **Coqui STT** for offline/edge (accuracy lower than Whisper/Deepgram).

## C) Tech Stack Recommendation (optimized for 2-person team)

- **Frontend:**
  - **Web:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui for speed; deploy to **Vercel**.
  - **Mobile:** **Expo (React Native)** for iOS/Android parity; reuse UI + chat logic; OTA updates via Expo.
- **Backend/API:**
  - **Node.js + Fastify** (or NestJS if you want structure) with **tRPC/JSON Schema** for types. Host on **Fly/Railway** for speed, or **Fargate** if staying AWS-native.
  - **Supabase** (Postgres + Auth + Storage) as a strong default for speed; can migrate to RDS/S3 later.
- **AI Layer:**
  - **Server-side orchestrator** using **LangChain** or **LlamaIndex** (minimal abstractions) with **OpenAI + Groq + Together** providers and RAG via **Pinecone/Qdrant**.
  - **Caching:** in-memory + Redis for prompt/response caching; enable **LLM guardrails** (JSON schema validation, content filters).
- **Auth:** **Clerk** or **Supabase Auth** for fastest path; **Cognito** if you must stay AWS-native.
- **DB:** **Postgres** (Supabase/RDS). Use **Drizzle/Prisma** for DX.
- **File/Media:** **S3** (or Supabase Storage) with signed URLs.
- **Payments:** **Stripe** (Checkout + Billing Portal) to avoid PCI scope.
- **Notifications:** **Postmark/SendGrid** (email), **Expo Notifications/FCM/APNs** (push), **SMS** via **Twilio** only where needed.
- **Analytics/Monitoring:** **Sentry**, **PostHog** (product analytics), **Logtail/CloudWatch** for logs, **GitHub Actions** for CI.

## D) UX Journey (MVP, chat-forward)

1. **Landing Page**
   - Language selector (SE/DE/ES/EN) + primary CTA: “Start booking” and secondary CTA: “Chat with us”.
   - Hero: clear value prop, trust badges, quick price estimator link.
2. **Role Selection** (Customer vs Cleaner)
   - Customer: proceeds to chat-guided booking.
   - Cleaner: goes to provider onboarding (basic info + background check CTA).
3. **Chat Assistant (ChatGPT-style)**
   - Chat panel with quick-reply chips (service type, rooms, dates, address, access notes).
   - Voice input toggle (mic) for speech-to-text; language-aware prompts.
   - Persist conversation to user session; show detected language and allow switching.
   - Guardrails: confirmation step before booking creation.
4. **Quote Summary**
   - Auto-generated from chat inputs: service type, duration, price breakdown, add-ons, discounts.
   - Editable line items before payment.
5. **Payment**
   - Stripe Checkout or Payment Element; support Apple Pay/Google Pay where available.
   - Confirmation screen with receipt + calendar invite toggle.
6. **Job Progress (optional in MVP)**
   - Simple status timeline: Scheduled → En route → In progress → Completed.
   - Push/email updates; allow reschedule/cancel.
7. **Post-Job Feedback & Review**
   - NPS + 5-star + free-text; suggest review template in user’s language.
   - Offer tip/add-on upsell if appropriate.
8. **Account Dashboard**
   - View/edit orders, invoices, addresses; support tickets; saved payment methods.
   - Providers: upcoming jobs, earnings, availability, ratings.

## Operational Tips for Cost Control
- Prefer **GPT-4o mini / Groq Llama-3 8B** for most turns; reserve GPT-4o/GPT-4 for edge cases.
- **Chunk + deduplicate** docs before embedding; store embeddings once and version them.
- Enable **response caching** on common intents (pricing, coverage areas, FAQs).
- Stream responses to reduce perceived latency and token waste.
- Set **budget alerts** (CloudWatch + AWS Budgets) and rate limits per IP/user.
- Keep **log retention short** and sample traces in production.
