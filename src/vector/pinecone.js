import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "../config.js";
import { log } from "../utils/logger.js";

let index;

function getIndex() {
  if (!index) {
    if (!config.pinecone.apiKey) throw new Error("PINECONE_API_KEY is missing");
    const pc = new Pinecone({ apiKey: config.pinecone.apiKey });
    index = pc.index(config.pinecone.index);
  }
  return index;
}

export async function upsertVectors(vectors) {
  if (!Array.isArray(vectors) || vectors.length === 0) throw new Error("upsertVectors: vectors must be non-empty array");
  try {
    await getIndex().upsert(vectors);
  } catch (err) {
    log.error("Pinecone upsert error", { err: err.message });
    throw err;
  }
}

export async function queryVectors(vector, topK = 4) {
  if (!Array.isArray(vector) || vector.length === 0) throw new Error("queryVectors: vector must be non-empty array");
  try {
    const res = await getIndex().query({ vector, topK, includeMetadata: true });
    return res.matches || [];
  } catch (err) {
    log.error("Pinecone query error", { err: err.message });
    throw err;
  }
}
