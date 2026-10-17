import { Router } from "express";
import crypto from "crypto";
import { sendText } from "../services/whatsapp.service.js";
import {
  buildSummary,
  toWhatsAppText,
} from "../services/dailySummary.service.js";

const router = Router();

// 1) Meta verifies your URL
router.get("/webhook", (req, res) => {
  const {
    "hub.mode": mode,
    "hub.verify_token": token,
    "hub.challenge": challenge,
  } = req.query;
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN)
    return res.status(200).send(challenge);
  res.sendStatus(403);
});

function validSignature(req) {
  const sig = req.get("x-hub-signature-256");
  if (!sig || !req.rawBody) return false;
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", process.env.WHATSAPP_APP_SECRET)
      .update(req.rawBody)
      .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 2) Incoming messages
router.post("/webhook", (req, res) => {
  if (!validSignature(req)) return res.sendStatus(401);
  res.sendStatus(200); // answer Meta immediately, process after

  handle(req.body).catch((e) => console.error("[whatsapp webhook]", e.message));
});

async function handle(body) {
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return; // status updates etc.

  const from = msg.from; // e.g. 923001234567
  if (from !== process.env.OWNER_WHATSAPP) return; // ignore everyone except the owner

  if (msg.type !== "text")
    return sendText(from, "I can read text messages only for now.");

  const text = msg.text.body.trim().toLowerCase();

  if (["details", "summary", "today", "report"].includes(text)) {
    const summary = await buildSummary();
    return sendText(from, toWhatsAppText(summary));
  }

  // Step A2: the AI agent replaces this line
  return sendText(
    from,
    'Send "details" for today\'s report. The AI assistant is coming next.',
  );
}

export default router;
