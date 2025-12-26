import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "dialog-service" }));

const port = process.env.PORT ? Number(process.env.PORT) : 8081;
app.listen(port, () => console.log(`[dialog-service] listening on :${port}`));
