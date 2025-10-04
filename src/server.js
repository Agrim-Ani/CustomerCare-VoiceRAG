import express from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import { setupSwagger } from "./swagger.js";
import twilioRoutes from "./twilioRoutes.js";
import intentRouter from "./intents/router.js";
import { config } from "./config.js";
import { log } from "./utils/logger.js";

const app = express();

/* Logging */
app.use(morgan("dev"));

/* Body parsing (Twilio sends x-www-form-urlencoded) */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/* Swagger UI */
setupSwagger(app);

/* Routes */
app.use("/intents", intentRouter);
app.use("/", twilioRoutes);

/* Health endpoint */
app.get("/healthz", (_req, res) => res.json({ ok: true }));

/* 404 handler */
app.use((req, res) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` });
});

/* Error handler */
app.use((err, _req, res, _next) => {
  log.error("Unhandled error", { err: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(config.port, () => {
  log.info(`Server running`, { url: `http://localhost:${config.port}`, env: config.env });
});
