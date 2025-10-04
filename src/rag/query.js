import { embedOne, chat } from "../llm/openai.js";
import { queryVectors } from "../vector/pinecone.js";
import { getOrderStatus } from "../intents/orderStatus.js";
import { log } from "../utils/logger.js";

export async function handleVoiceQuery(userText) {
  const text = String(userText || "").trim();
  if (!text) return { text: "I didn't hear anything. Please ask about returns, or say your order ID." };

  // naive intent routing (replace with classifier if needed)
  const lt = text.toLowerCase();
  const hasOrder = lt.includes("order") || lt.includes("status");
  const orderIdMatch = text.match(/\b[A-Z0-9]{6,}\b/);

  if (hasOrder || orderIdMatch) {
    const orderId = (orderIdMatch && orderIdMatch[0]) || "ORD12345";
    const st = await getOrderStatus(orderId);
    return { text: `Order ${st.orderId}: ${st.status}. Estimated delivery in ${st.etaDays} day(s).` };
  }

  // RAG path
  const qVec = await embedOne(text);
  const hits = await queryVectors(qVec, 4);

  if (!hits.length) {
    return { text: "I couldn't find that in our policy. Please try rephrasing or ask about returns or order status." };
  }

  const context = hits
    .map((h, i) => `[#${i + 1} ${h.metadata?.title ?? "Doc"}] ${h.metadata?.text ?? ""}`)
    .join("\n---\n");

  const citations = hits.slice(0, 2).map(h => h.metadata?.title).filter(Boolean);
  const prompt =
    "You are a concise customer-care agent. " +
    "Answer using ONLY the CONTEXT below. If unsure, say you don't know. " +
    "Always add a brief citation like (from <doc title>)." +
    `\n\nUSER: ${text}\n\nCONTEXT:\n${context}`;

  try {
    const answer = await chat(prompt);
    const cite = citations.length ? ` (from ${[...new Set(citations)].join(", ")})` : "";
    const spoken = (answer.trim() + cite).slice(0, 900); // keep TTS snappy
    return { text: spoken };
  } catch (err) {
    log.error("RAG chat failure", { err: err.message });
    return { text: "Sorry, I had trouble generating an answer. Please try again." };
  }
}
