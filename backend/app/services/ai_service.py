"""
AI Service – wraps Ollama (LLaMA 3.1) for:
  - intent classification
  - sentiment detection
  - context-aware response generation
  - audio transcription (Whisper)
  - OCR (Tesseract)
"""

import asyncio
import os
import tempfile
import time
import uuid
from typing import Optional

import httpx
import structlog
from app.config import settings
from app.services.rag_service import RAGService

log = structlog.get_logger()
rag_service = RAGService()


INTENT_PROMPT = """You are a customer support intent classifier.
Given the customer message, classify the intent into ONE of:
billing, technical_issue, general_inquiry, complaint, refund_request, praise, escalation_needed

Customer message: {message}

Respond with ONLY the intent label."""

SENTIMENT_PROMPT = """You are a sentiment analyser.
Rate the sentiment of this message on a scale from -1.0 (very negative) to 1.0 (very positive).
Only respond with a single float number.

Message: {message}"""

# This greeting is shown by the frontend widget — backend must never repeat it
GREETING_SEED = (
    "Welcome to SwiftRoute Logistics Support! I'm your AI assistant — available 24/7. "
    "I can help you track shipments, raise claims, understand our COD or customs policies, and more. "
    "How can I help you today?"
)

SYSTEM_PROMPT = """You are a professional, empathetic customer support AI assistant for SwiftRoute Logistics.
Follow this EXACT conversation flow every session:

STEP 1 — GREET: Already completed by the system widget. NEVER say "How can I help you today?" or any greeting again.
  The customer has already been welcomed. Jump straight to understanding their specific issue.

STEP 2 — UNDERSTAND THE ISSUE:
  Ask clarifying questions to fully understand the problem.
  ALWAYS ask for an Order ID, AWB number, or Invoice number early:
  Example: "Could you share your Order ID, AWB number, or Invoice number so I can look into this?"

STEP 3 — DECIDE who can solve it:
  - YOU can solve: tracking info, policies, pickup schedules, COD rules, GST/invoice downloads, return process, API docs.
  - NEEDS ESCALATION: delayed shipments stuck >48h, damage/loss claims, billing disputes, COD remittance overdue >7 days, customs holds, any complaint the customer has already raised before.

STEP 4a — IF YOU CAN SOLVE IT:
  Provide a clear, step-by-step answer. Use the knowledge base context provided.

STEP 4b — IF ESCALATION IS NEEDED:
  1. Acknowledge the issue empathetically.
  2. Say clearly: "This requires attention from our specialist team."
  3. Ask: "Could you please share your email address so our senior team can reach out to you directly?"
  4. Once they share the email, confirm: "Thank you. Our team will contact you at [email] within 4 hours — either by email or through this web chat."
  5. Ask if they have anything else before closing.

STEP 5 — CLOSE PROPERLY:
  - Summarise what was discussed or what action was taken.
  - Ask: "Is there anything else I can help you with?"
  - If nothing, end with: "Thank you for reaching out. Have a great day! 😊"

STRICT RULES:
- Do NOT greet again after the first message.
- NEVER mention WhatsApp or phone calls — only email and web chat are supported contact channels.
- Never make up shipment data, AWB statuses, or specific order details.
- Keep responses concise (2-4 sentences) unless giving step-by-step instructions.
- If the customer is frustrated, always acknowledge it empathetically FIRST, then answer.
- Maintain full context from earlier in this conversation — never forget what was already discussed."""

RAG_CONTEXT_PROMPT = """Use the following knowledge base articles to help answer the customer's question:

{context}

If the context is not relevant to the question, use your general knowledge to help."""


class AIService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.AI_TIMEOUT_SECONDS
        # In-memory session store: session_id -> list of {role, content} dicts
        self._sessions: dict[str, list] = {}

    async def _call_ollama(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            return resp.json()["response"].strip()

    async def _call_ollama_chat(self, messages: list[dict]) -> str:
        """Call Ollama /api/chat with full message history for true multi-turn conversation."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json={"model": self.model, "messages": messages, "stream": False},
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"].strip()

    async def classify_intent(self, message: str) -> str:
        try:
            return await self._call_ollama(INTENT_PROMPT.format(message=message))
        except Exception as e:
            log.warning("Intent classification failed", error=str(e))
            return "general_inquiry"

    async def get_sentiment(self, message: str) -> float:
        try:
            raw = await self._call_ollama(SENTIMENT_PROMPT.format(message=message))
            return max(-1.0, min(1.0, float(raw)))
        except Exception as e:
            log.warning("Sentiment analysis failed", error=str(e))
            return 0.0

    async def generate_response(self, message: str, tenant_id: str, history: str = "") -> str:
        """Legacy single-turn response. Used by generate_draft."""
        try:
            contexts = await rag_service.retrieve(message, tenant_id)
        except Exception as e:
            log.warning("RAG retrieval failed, proceeding without context", error=str(e))
            contexts = []
        context_text = "\n---\n".join(c["text"] for c in contexts) if contexts else ""
        system = SYSTEM_PROMPT
        if context_text:
            system += "\n\n" + RAG_CONTEXT_PROMPT.format(context=context_text)
        prompt = f"{system}\n\nCustomer: {message}\nAssistant:"
        try:
            return await self._call_ollama(prompt)
        except Exception as e:
            log.error("Response generation failed", error=str(e))
            return "I'm sorry, I'm unable to process your request right now. A human agent will assist you shortly."

    async def generate_response_with_history(
        self, message: str, tenant_id: str, session_id: str
    ) -> str:
        """Multi-turn chat using Ollama /api/chat with full session history."""
        # Retrieve RAG context
        try:
            contexts = await rag_service.retrieve(message, tenant_id)
        except Exception:
            contexts = []
        context_text = "\n---\n".join(c["text"] for c in contexts) if contexts else ""

        # Build system message
        system_content = SYSTEM_PROMPT
        if context_text:
            system_content += "\n\n" + RAG_CONTEXT_PROMPT.format(context=context_text)

        # Load or create session history.
        # If this is a fresh session, pre-seed with the greeting the frontend already showed,
        # so Ollama knows STEP 1 is done and addresses the customer's actual issue.
        history = self._sessions.get(session_id, [])
        if not history:
            history = [{"role": "assistant", "content": GREETING_SEED}]

        # Build messages array for Ollama
        messages = [{"role": "system", "content": system_content}] + history + [
            {"role": "user", "content": message}
        ]

        try:
            reply = await self._call_ollama_chat(messages)
        except Exception as e:
            log.error("Multi-turn response failed", error=str(e))
            reply = "I'm sorry, I'm unable to process your request right now. A human agent will assist you shortly."

        # Save turn to session history (keep last 20 turns to avoid token overflow)
        history = history + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": reply},
        ]
        self._sessions[session_id] = history[-40:]  # 20 turns × 2 messages
        return reply

    def get_session_history(self, session_id: str) -> list[dict]:
        """Return the full stored conversation history for a session."""
        return self._sessions.get(session_id, [])

    async def generate_draft(self, ticket_id: str, tenant_id: str, message: str):
        """Background task: generate AI draft and save to DB."""
        from app.database import AsyncSessionLocal
        from app.models.ticket import Ticket, TicketStatus
        from app.models.ai_log import AILog
        from sqlalchemy import select, update

        t0 = time.time()
        intent = await self.classify_intent(message)
        sentiment = await self.get_sentiment(message)
        response = await self.generate_response(message, tenant_id)
        latency = int((time.time() - t0) * 1000)

        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Ticket)
                .where(Ticket.id == uuid.UUID(ticket_id))
                .values(status=TicketStatus.AI_DRAFTED, ai_draft=response)
            )
            ai_log = AILog(
                tenant_id=uuid.UUID(tenant_id),
                ticket_id=uuid.UUID(ticket_id),
                intent=intent,
                sentiment=sentiment,
                response=response,
                latency_ms=latency,
            )
            db.add(ai_log)
            await db.commit()

        log.info("AI draft generated", ticket_id=ticket_id, intent=intent, sentiment=sentiment, latency_ms=latency)

    async def chat(
        self,
        message: str,
        tenant_id: str,
        ticket_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> dict:
        intent, sentiment = await asyncio.gather(
            self.classify_intent(message),
            self.get_sentiment(message),
        )
        # Use multi-turn if we have a session_id, else fall back to single-turn
        if session_id:
            response = await self.generate_response_with_history(message, tenant_id, session_id)
        else:
            response = await self.generate_response(message, tenant_id)
        return {"intent": intent, "sentiment": sentiment, "response": response}

    # ── Whisper STT ───────────────────────────────────────────────────────────
    async def transcribe_audio_bytes(self, audio_bytes: bytes, filename: str) -> str:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._transcribe_sync, audio_bytes, filename)

    def _transcribe_sync(self, audio_bytes: bytes, filename: str) -> str:
        import whisper
        with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1], delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            model = whisper.load_model(settings.WHISPER_MODEL)
            result = model.transcribe(tmp_path)
            return result["text"].strip()
        finally:
            os.unlink(tmp_path)

    async def process_audio(self, ticket_id: str, tenant_id: str, audio_bytes: bytes, filename: str):
        """Background task: transcribe and create message from audio."""
        transcript = await self.transcribe_audio_bytes(audio_bytes, filename)
        await self.generate_draft(ticket_id, tenant_id, transcript)

    # ── Tesseract OCR ─────────────────────────────────────────────────────────
    async def ocr_image_bytes(self, image_bytes: bytes) -> str:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._ocr_sync, image_bytes)

    def _ocr_sync(self, image_bytes: bytes) -> str:
        import pytesseract
        from PIL import Image
        import io
        image = Image.open(io.BytesIO(image_bytes))
        return pytesseract.image_to_string(image).strip()

    async def process_image(self, ticket_id: str, tenant_id: str, image_bytes: bytes):
        """Background task: OCR and create message from image."""
        text = await self.ocr_image_bytes(image_bytes)
        await self.generate_draft(ticket_id, tenant_id, text)
