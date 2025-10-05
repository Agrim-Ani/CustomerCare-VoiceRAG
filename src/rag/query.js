// src/rag/query.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { embedOne, chat } from "../llm/openai.js";
import { queryVectors } from "../vector/pinecone.js";
import { getOrderStatus } from "../intents/orderStatus.js";
import { log } from "../utils/logger.js";

// ---------- Load fallback FAQ data at module load ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const faqsPath = path.join(__dirname, "../../data/faqs.json");

let RETURNS_FALLBACK = null;
try {
  const raw = fs.readFileSync(faqsPath, "utf-8");
  const arr = JSON.parse(raw);
  const returns = (arr || []).find(
    (x) =>
      String(x.title || "").toLowerCase().includes("return") ||
      String(x.q || "").toLowerCase().includes("return")
  );
  if (returns) {
    RETURNS_FALLBACK = `${returns.a || returns.q || ""}`.trim();
  }
} catch (e) {
  log.warn("Could not load /data/faqs.json for fallback", { err: e.message });
}

// ---------- Keyword sets ----------
const RETURN_KEYWORDS = [
  "return",
  "returns",
  "refund",
  "refunds",
  "exchange",
  "exchanges",
  "replace",
  "replacement",
  "rma",
  "send back"
];

// More forgiving Order-ID detector: captures after “order/id/number/is/:”
// Accept letters, digits, hyphen, space, and comma; then we sanitize.
const ORDER_ID_CANDIDATE =
  /\b(?:order(?:\s*(?:id|number))?\s*(?:is|:)?\s*)?([A-Z0-9][A-Z0-9\-\s,]{3,})\b/i;

// Sanitizer: keep alphanumerics only; upper-case it.
function sanitizeOrderId(s) {
  if (!s) return "";
  const cleaned = s.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  // Require at least 5–6 chars to avoid tiny words being mistaken as IDs
  return cleaned.length >= 5 ? cleaned : "";
}

function isReturnsIntent(text) {
  const lt = text.toLowerCase();
  return RETURN_KEYWORDS.some((kw) => lt.includes(kw));
}

export async function handleVoiceQuery(userText) {
  const text = String(userText || "").trim();
  if (!text) {
    return {
      text:
        "I didn't hear anything. Please ask about returns, or say your order ID to check order status."
    };
  }

  // ---------- ORDER STATUS branch ----------
  // Try to extract an ID even if commas/spaces/hyphens are present
  const idMatch = text.match(ORDER_ID_CANDIDATE);
  const candidate = sanitizeOrderId(idMatch?.[1]);

  const mentionsOrder = /\border\b|\bstatus\b|\btracking\b|\bshipment\b|\bshipped\b/i.test(text);

  if (candidate || mentionsOrder) {
    const orderId = candidate || "ORD12345";
    try {
      const st = await getOrderStatus(orderId);
      return {
        text: `Order ${orderId}: ${st.status}. Estimated delivery in ${st.etaDays} day(s).`
      };
    } catch (e) {
      log.error("Order status failure", { err: e.message, userText });
      return {
        text:
          "Sorry, I couldn't check your order right now. Please try again in a moment."
      };
    }
  }

  // ---------- RETURNS / POLICY branch (RAG) ----------
  const wantsReturns = isReturnsIntent(text);

  // Do a retrieval regardless; if no hits and user asked returns, fall back to FAQ snippet
  try {
    const qVec = await embedOne(text);
    const hits = await queryVectors(qVec, 4);

    if ((!hits || hits.length === 0) && wantsReturns && RETURNS_FALLBACK) {
      return {
        text: `${RETURNS_FALLBACK} (from Returns Policy)`
      };
    }

    if (!hits || hits.length === 0) {
      return {
        text:
          "I couldn't find that in our policy. You can ask about returns, refunds, exchanges, or say your order ID to check status."
      };
    }

    const context = hits
      .map(
        (h, i) => `[#${i + 1} ${h.metadata?.title ?? "Doc"}] ${h.metadata?.text ?? ""}`
      )
      .join("\n---\n");

    const citations = hits
      .slice(0, 2)
      .map((h) => h.metadata?.title)
      .filter(Boolean);

    const prompt =
      "You are a concise customer-care agent. " +
      "Answer using ONLY the CONTEXT below. If unsure, say you don't know. " +
      "Always add a brief citation like (from <doc title>)." +
      `\n\nUSER: ${text}\n\nCONTEXT:\n${context}`;

    const answer = await chat(prompt);
    const cite =
      citations.length ? ` (from ${[...new Set(citations)].join(", ")})` : "";
    return { text: (answer.trim() + cite).slice(0, 900) };
  } catch (err) {
    log.error("RAG query failure", { err: err.message, userText });
    // Last-resort fallback for returns
    if (wantsReturns && RETURNS_FALLBACK) {
      return { text: `${RETURNS_FALLBACK} (from Returns Policy)` };
    }
    return {
      text:
        "Sorry, I had trouble answering that. Please ask about returns or say your order ID."
    };
  }
}
