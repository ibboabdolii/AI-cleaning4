import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "api-gateway" }));

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => console.log(`[api-gateway] listening on :${port}`));
