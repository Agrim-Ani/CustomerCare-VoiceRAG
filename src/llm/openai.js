import OpenAI from "openai";
import { config } from "../config.js";
import { log } from "../utils/logger.js";

if (!config.openai.apiKey) {
  log.warn("OPENAI_API_KEY not set. Embeddings and chat will fail until configured.");
}

const client = new OpenAI({ apiKey: config.openai.apiKey });

export async function embedMany(texts) {
  if (!Array.isArray(texts) || texts.length === 0) throw new Error("embedMany: texts must be a non-empty array");
  try {
    const res = await client.embeddings.create({ model: config.openai.embedModel, input: texts });
    return res.data.map(d => d.embedding);
  } catch (err) {
    log.error("OpenAI embedMany error", { err: err.message });
    throw err;
  }
}

export async function embedOne(text) {
  if (typeof text !== "string" || text.trim() === "") throw new Error("embedOne: text must be a non-empty string");
  try {
    const res = await client.embeddings.create({ model: config.openai.embedModel, input: text });
    return res.data[0].embedding;
  } catch (err) {
    log.error("OpenAI embedOne error", { err: err.message });
    throw err;
  }
}

export async function chat(userContent) {
  if (!userContent || typeof userContent !== "string") throw new Error("chat: content must be a non-empty string");
  try {
    const res = await client.chat.completions.create({
      model: config.openai.chatModel,
      messages: [
        { role: "system", content: "You are a helpful, concise support agent." },
        { role: "user", content: userContent }
      ],
      temperature: 0.2,
      max_tokens: 300
    });
    return res.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    log.error("OpenAI chat error", { err: err.message });
    throw err;
  }
}
