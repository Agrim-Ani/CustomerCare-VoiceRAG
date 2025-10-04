import "dotenv/config";
import { log } from "./utils/logger.js";

function required(name, value) {
  if (value === undefined || value === null || value === "") {
    log.warn(`Missing env: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  baseUrl: process.env.PUBLIC_BASE_URL || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  openai: {
    apiKey: required("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
    embedModel: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
    chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini"
  },
  pinecone: {
    apiKey: required("PINECONE_API_KEY", process.env.PINECONE_API_KEY),
    index: process.env.PINECONE_INDEX || "alltius-voice-rag",
    cloud: process.env.PINECONE_CLOUD || "us-west1-gcp",
    env: process.env.PINECONE_ENV || "us-west1-gcp"
  }
};
