import express from "express";
import twilio from "twilio";
import { handleVoiceQuery } from "./rag/query.js";
import { log } from "./utils/logger.js";
import { startTimer } from "./utils/timing.js";
// Optional: import { config } from "./config.js"; and validate Twilio signature if you want.

const router = express.Router();
const { twiml: { VoiceResponse } } = twilio;

/**
 * Entry point for Twilio Voice webhook (POST /voice)
 * Returns TwiML with <Gather> for speech input. Barge-in enabled.
 */
router.post("/voice", async (_req, res) => {
  const vr = new VoiceResponse();

  const gather = vr.gather({
    input: "speech",
    action: "/gather",
    method: "POST",
    language: "en-US",
    bargeIn: true,
    speechTimeout: "auto"
  });
  gather.say("Hello! Ask about returns, or say your order I D to get order status.");

  // Fallback if no input provided
  vr.redirect("/voice");

  res.type("text/xml").send(vr.toString());
});

/**
 * Twilio POSTs speech transcription to /gather
 */
router.post("/gather", async (req, res) => {
  const timer = startTimer();
  const userText = req.body?.SpeechResult || "";

  let answer = "Sorry, I did not catch that. Please ask about returns, or say: check order status.";
  try {
    const { text } = await handleVoiceQuery(userText);
    answer = text || answer;
  } catch (err) {
    log.error("handleVoiceQuery failed", { err: err.message });
  }

  const vr = new VoiceResponse();
  // Using Twilio's built-in TTS voice; you can switch to <Play> with a pre-generated audio URL for custom TTS
  vr.say({ voice: "Polly.Joanna" }, answer);
  vr.pause({ length: 1 });
  vr.redirect("/voice"); // loop for follow-ups

  log.info("voice_gather", { latency_ms: timer(), userText });
  res.type("text/xml").send(vr.toString());
});

export default router;
