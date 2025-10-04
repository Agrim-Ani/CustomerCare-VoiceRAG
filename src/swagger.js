import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupSwagger(app) {
  try {
    const specPath = path.join(__dirname, "../swagger.json");
    const raw = fs.readFileSync(specPath, "utf-8");
    const spec = JSON.parse(raw);
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  } catch (err) {
    log.warn("Swagger setup failed (missing or invalid swagger.json)", { err: err.message });
  }
}
