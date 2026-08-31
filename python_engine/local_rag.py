"""
TASC IIoT Studio — Local ChromaDB + Hierarchical RAG Engine
Implements high-speed on-premise vector storage & parent-child document retrieval.
"""

import os
import sys
import json
import time
import math
from typing import List, Dict, Any, Optional

# Sample Industrial SOPs & Register Maps for Initial Seed
DEFAULT_INDUSTRIAL_SOPS = [
    {
        "id": "sop_hvac_chiller_01",
        "title": "SOP-HVAC-01: Centrifugal Chiller Low Oil Differential Interlock",
        "parent_context": "Chapter 4: Chiller Safety Interlocks & Compressor Protection. When the oil differential pressure drops below 1.2 bar for more than 15 seconds, the safety controller initiates an immediate emergency compressor trip to prevent bearing seizure. Before restarting, verify lube pump operation and check the oil filter differential indicator.",
        "child_content": "Oil differential pressure threshold: minimum 1.2 bar. Trip delay: 15s. Action: Immediate compressor trip. Do not override interlock without mechanical supervisor signoff.",
        "category": "HVAC_CHILLER",
        "area": "Plant_Floor_1",
        "keywords": ["chiller", "oil pressure", "trip", "compressor", "interlock", "lube"]
    },
    {
        "id": "sop_pneu_header_02",
        "title": "SOP-PNEU-02: Main Pneumatic Header Pressure Drop & Bottling Line Interlock",
        "parent_context": "Chapter 2: Compressed Air Distribution. The main bottling line and robotic cartoners require a steady 5.5 bar to 6.2 bar supply. If header pressure drops below 4.5 bar, the filling line valve manifold auto-halts to prevent under-capped containers.",
        "child_content": "Pneumatic pressure minimum: 4.5 bar. Normal range: 5.5 - 6.2 bar. Action on drop: Auto-halt bottling line filling station.",
        "category": "PNEUMATICS",
        "area": "Packaging_Line_2",
        "keywords": ["pneumatic", "air pressure", "bottling", "carton", "header", "psi", "bar"]
    },
    {
        "id": "sop_elec_demand_03",
        "title": "SOP-ELEC-03: Peak Electrical Demand Limiting & Chiller Load Shedding",
        "parent_context": "Chapter 7: Peak Energy Management. Contractual maximum demand limit is 750 kW. If plant total active power exceeds 700 kW for >10 minutes, the energy management system sheds secondary AHU fans and limits Chiller #2 to 70% VFD capacity to prevent tier-3 utility penalties.",
        "child_content": "Peak demand limit: 750 kW. Stage 1 shed threshold: 700 kW (>10 min). Action: Shed AHU fans, limit Chiller 2 to 70%. Penalty rate: $450/hr.",
        "category": "ENERGY_ELECTRICAL",
        "area": "Substation_1",
        "keywords": ["energy", "power", "kw", "demand", "peak", "load shed", "utility", "chiller"]
    },
    {
        "id": "sop_driver_modbus_04",
        "title": "SOP-DRV-04: Modbus TCP Register Map & Packet Timeout Diagnostics",
        "parent_context": "Chapter 1: PLC Communication Architecture. Standard polling rate is 1000ms. If consecutive failure count reaches 5 packets, the driver flags the connection as DEGRADED. Ensure slave ID is 1 and port is 502 with TCP keepalive enabled.",
        "child_content": "Modbus standard poll: 1000ms. Failure threshold: 5 retries. Diagnostic action: Verify port 502, check PLC IP reachability, test ping latency.",
        "category": "DRIVER_COMM",
        "area": "Control_Room",
        "keywords": ["modbus", "driver", "packet loss", "timeout", "offline", "plc", "register"]
    }
]

class LocalIndustrialRAG:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.path.join(os.path.dirname(__file__), "data", "chroma_db")
        self.documents: List[Dict[str, Any]] = []
        self.chroma_client = None
        self.collection = None
        self._init_store()

    def _init_store(self):
        """Initializes ChromaDB collection if installed, or falls back to lightweight in-memory vector store."""
        try:
            import chromadb
            os.makedirs(self.db_path, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=self.db_path)
            self.collection = self.chroma_client.get_or_create_collection(
                name="tasc_industrial_knowledge",
                metadata={"description": "TASC IIoT Studio SCADA SOPs & Register Maps"}
            )
            # Ingest default SOPs if empty
            if self.collection.count() == 0:
                self.ingest_documents(DEFAULT_INDUSTRIAL_SOPS)
        except Exception as e:
            # Fallback to internal keyword + BM25/Cosine store
            self.documents = list(DEFAULT_INDUSTRIAL_SOPS)

    def ingest_documents(self, docs: List[Dict[str, Any]]) -> int:
        """Ingests documents with Parent-Child hierarchical metadata."""
        if not docs:
            return 0

        count = 0
        if self.collection:
            ids = [d["id"] for d in docs]
            documents = [f"{d['title']}\n{d['child_content']}" for d in docs]
            metadatas = [{
                "title": d.get("title", ""),
                "parent_context": d.get("parent_context", ""),
                "category": d.get("category", "GENERAL"),
                "area": d.get("area", "PLANT"),
                "keywords": ",".join(d.get("keywords", []))
            } for d in docs]

            try:
                self.collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
                count = len(docs)
            except Exception as e:
                pass

        # Also maintain in memory for instant local search
        for d in docs:
            existing = next((i for i, x in enumerate(self.documents) if x["id"] == d["id"]), None)
            if existing is not None:
                self.documents[existing] = d
            else:
                self.documents.append(d)
                count += 1

        return count

    def query(self, query_text: str, top_k: int = 3, category_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Queries the vector store and returns Parent-Child grounded evidence."""
        query_text = query_text.strip().lower()
        if not query_text:
            return []

        results = []

        # 1. Query ChromaDB if available
        if self.collection:
            try:
                where_clause = {"category": category_filter} if category_filter else None
                chroma_res = self.collection.query(
                    query_texts=[query_text],
                    n_results=top_k,
                    where=where_clause
                )

                if chroma_res and chroma_res.get("ids") and chroma_res["ids"][0]:
                    for idx, doc_id in enumerate(chroma_res["ids"][0]):
                        meta = chroma_res["metadatas"][0][idx] if chroma_res.get("metadatas") else {}
                        doc_text = chroma_res["documents"][0][idx] if chroma_res.get("documents") else ""
                        dist = chroma_res["distances"][0][idx] if chroma_res.get("distances") else 0.5
                        score = round(max(0.0, 1.0 - (dist / 2.0)), 3)

                        results.append({
                            "id": doc_id,
                            "title": meta.get("title", "Plant SOP"),
                            "parentContext": meta.get("parent_context", ""),
                            "childContent": doc_text,
                            "category": meta.get("category", ""),
                            "score": score,
                            "source": "ChromaDB_Hierarchical"
                        })
                    return results
            except Exception:
                pass

        # 2. Fast Fallback: Lexical + Keyword matching
        q_words = set(query_text.split())
        scored_docs = []

        for doc in self.documents:
            if category_filter and doc.get("category") != category_filter:
                continue

            doc_text = f"{doc.get('title', '')} {doc.get('child_content', '')} {doc.get('parent_context', '')} {' '.join(doc.get('keywords', []))}".lower()
            overlap = sum(1 for w in q_words if w in doc_text)
            if overlap > 0:
                score = round(min(1.0, overlap / max(1, len(q_words))), 3)
                scored_docs.append((score, doc))

        scored_docs.sort(key=lambda x: x[0], reverse=True)

        for score, doc in scored_docs[:top_k]:
            results.append({
                "id": doc["id"],
                "title": doc.get("title", "Plant SOP"),
                "parentContext": doc.get("parent_context", ""),
                "childContent": doc.get("child_content", ""),
                "category": doc.get("category", ""),
                "score": score,
                "source": "Local_Hierarchical_Fallback"
            })

        return results

# Global RAG Instance
local_rag_engine = LocalIndustrialRAG()
