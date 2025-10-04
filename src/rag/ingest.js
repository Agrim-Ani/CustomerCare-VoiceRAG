import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { embedMany } from "../llm/openai.js";
import { upsertVectors } from "../vector/pinecone.js";
import { splitIntoChunks } from "./splitter.js";
import { log } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadDocs() {
  const dataDir = path.join(__dirname, "../../data");
  const files = await fs.readdir(dataDir);
  const docs = [];

  for (const f of files) {
    const full = path.join(dataDir, f);
    const raw = await fs.readFile(full, "utf-8");
    if (f.endsWith(".json")) {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        const title = String(item.title || f);
        const text = `${item.q || ""}\n${item.a || ""}`.trim();
        if (!text) continue;
        for (const chunk of splitIntoChunks(text)) {
          docs.push({
            id: `${f}-${title}-${chunk.slice(0, 20)}`.slice(0, 95),
            title,
            text: chunk,
            source: f
          });
        }
      }
    } else {
      const title = f.replace(/\.(md|txt)$/i, "");
      for (const chunk of splitIntoChunks(raw)) {
        docs.push({
          id: `${f}-${chunk.slice(0, 20)}`.slice(0, 95),
          title,
          text: chunk,
          source: f
        });
      }
    }
  }
  return docs;
}

(async () => {
  try {
    const docs = await loadDocs();
    if (docs.length === 0) throw new Error("No docs found in /data");
    const embeddings = await embedMany(docs.map(d => d.text));
    const payload = docs.map((d, i) => ({
      id: d.id,
      values: embeddings[i],
      metadata: { title: d.title, source: d.source, text: d.text }
    }));
    await upsertVectors(payload);
    log.info("Ingestion complete", { chunks: payload.length });
  } catch (err) {
    log.error("Ingestion failed", { err: err.message });
    process.exitCode = 1;
  }
})();
