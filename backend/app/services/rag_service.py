"""
RAG Service – FAISS-backed vector retrieval with per-tenant index management.
Embeddings: sentence-transformers all-MiniLM-L6-v2
"""

import os
import uuid
import asyncio
from typing import List, Dict
import structlog
import numpy as np
from app.config import settings

log = structlog.get_logger()

_INDEXES: Dict[str, "TenantIndex"] = {}   # tenant_id -> TenantIndex


class TenantIndex:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.texts: List[str] = []
        self.index = None
        self._build_empty()

    def _build_empty(self):
        import faiss
        self.index = faiss.IndexFlatL2(384)  # MiniLM embedding dim

    def add(self, embedding: np.ndarray, text: str) -> int:
        self.index.add(embedding.reshape(1, -1).astype("float32"))
        self.texts.append(text)
        return len(self.texts) - 1

    def search(self, query_emb: np.ndarray, k: int) -> List[Dict]:
        if self.index.ntotal == 0:
            return []
        k = min(k, self.index.ntotal)
        distances, indices = self.index.search(query_emb.reshape(1, -1).astype("float32"), k)
        return [
            {"text": self.texts[i], "score": float(distances[0][j])}
            for j, i in enumerate(indices[0])
            if i >= 0
        ]


def _get_index(tenant_id: str) -> TenantIndex:
    if tenant_id not in _INDEXES:
        _INDEXES[tenant_id] = TenantIndex(tenant_id)
    return _INDEXES[tenant_id]


class RAGService:
    def __init__(self):
        self._model = None  # lazy-loaded – SentenceTransformer imported on first use

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self._model

    def _embed(self, text: str) -> np.ndarray:
        return self._get_model().encode([text])[0]  # type: ignore

    def _chunk_text(self, text: str) -> List[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), settings.CHUNK_SIZE - settings.CHUNK_OVERLAP):
            chunk = " ".join(words[i : i + settings.CHUNK_SIZE])
            if chunk:
                chunks.append(chunk)
        return chunks

    async def ingest_text(
        self,
        text: str,
        tenant_id: str,
        source_type: str = "knowledge_base",
        source_id: str = None,
    ) -> int:
        loop = asyncio.get_event_loop()
        chunks = self._chunk_text(text)
        idx = _get_index(tenant_id)
        count = 0
        for chunk in chunks:
            emb = await loop.run_in_executor(None, self._embed, chunk)
            idx.add(emb, chunk)
            count += 1
        log.info("Ingested chunks", tenant_id=tenant_id, count=count, source=source_type)
        return count

    async def retrieve(self, query: str, tenant_id: str, k: int = None) -> List[Dict]:
        k = k or settings.TOP_K_RESULTS
        loop = asyncio.get_event_loop()
        emb = await loop.run_in_executor(None, self._embed, query)
        idx = _get_index(tenant_id)
        results = idx.search(emb, k)
        return results
