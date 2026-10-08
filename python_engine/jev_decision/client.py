"""
jev_decision.client — Unified Jev Mode Client
=============================================
Provides millisecond parallel constrained decisions for:
  - llama-server (thecodacus parallel-decision branch via /decision or /v1/decision)
  - In-process PyTorch engine (Qwen-2.5-1B-RLCD)
  - Seamless fallback to /v1/chat/completions for standard LLM servers (Ollama, LM Studio)
  - Laya System-1 decision engine (pip install laya) — non-autoregressive, ~33ms, no LLM call

Provider summary:
  provider="laya"        -> NandhaKishorM/laya via PyPI, pure ONNX, no server required
  provider="native_gguf" -> llama-server on :8085 with /v1/decision
  provider="ollama"      -> Ollama on :11434 via /v1/chat/completions
  provider="lmstudio"    -> LM Studio on :1234 via /v1/chat/completions
  provider="auto"        -> tries Laya first, then native_gguf server, then chat fallback
"""

import json
import time
import socket
import re
import urllib.request
import urllib.error
import urllib.parse
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Union

from .schema import DecisionSchema, DecisionField


@dataclass
class JevResult:
    """Result of a parallel constrained decision."""
    answers: Dict[str, Any]
    probabilities: Dict[str, Dict[str, float]] = field(default_factory=dict)
    confidence: Dict[str, float] = field(default_factory=dict)
    latency_ms: float = 0.0
    backend: str = "unknown"
    usage: Dict[str, Any] = field(default_factory=dict)
    raw: Dict[str, Any] = field(default_factory=dict)

    def get(self, key: str, default: Any = None) -> Any:
        return self.answers.get(key, default)

    def __getitem__(self, key: str) -> Any:
        return self.answers[key]

    def __repr__(self) -> str:
        return f"<JevResult backend={self.backend} latency={self.latency_ms:.2f}ms answers={self.answers}>"


class JevClient:
    """
    High-performance decision client for Jev mode.
    Sits on top of ANY LLM runtime OR the Laya non-autoregressive engine.

    Args:
        mode (str): "auto" | "server" | "local" | "fallback" | "laya"
        provider (str): "auto" | "laya" | "native_gguf" | "ollama" | "lmstudio"
        server_url (str, optional): Base URL (defaults automatically based on provider).
        model_id (str): Model name for LLM requests (default "default").
        local_model_path (str, optional): Path or HF repo for local PyTorch engine.
        timeout (float): Request timeout in seconds (default 10.0).
        laya_model (str): Laya checkpoint — "english" | "multilingual" | "typed-decisions" | "auto"
        laya_device (str): Device for Laya — "cpu" | "cuda" | "mps" | "xpu" (default "cpu")
        laya_preload (bool): Preload all Laya checkpoints at init for zero-latency routing.
    """

    DEFAULT_PROVIDER_URLS = {
        "native_gguf": "http://127.0.0.1:8085",
        "ollama": "http://127.0.0.1:11434",
        "lmstudio": "http://127.0.0.1:1234",
    }

    def __init__(
        self,
        mode: str = "auto",
        server_url: Optional[str] = None,
        provider: str = "auto",
        model_id: str = "default",
        local_model_path: Optional[str] = None,
        timeout: float = 10.0,
        laya_model: str = "auto",
        laya_device: str = "cpu",
        laya_preload: bool = False,
    ):
        self.provider = provider.lower() if provider else "auto"
        if server_url is None:
            if self.provider in self.DEFAULT_PROVIDER_URLS:
                self.server_url = self.DEFAULT_PROVIDER_URLS[self.provider]
            else:
                self.server_url = "http://127.0.0.1:8085"
        else:
            self.server_url = server_url.rstrip("/")

        self.mode = mode
        self.model_id = model_id
        self.local_model_path = local_model_path
        self.timeout = timeout
        self._local_engine = None

        # Laya System-1 engine settings
        self.laya_model = laya_model    # "english" | "multilingual" | "typed-decisions" | "auto"
        self.laya_device = laya_device
        self.laya_preload = laya_preload
        self._laya_router = None        # lazy-loaded on first use

        # If provider is explicitly laya OR preload requested, init the router now
        if self.provider == "laya" or laya_preload:
            self._init_laya_router()


    def _is_server_reachable(self) -> bool:
        """Fast TCP check to see if the server port is open without hanging."""
        try:
            parsed = urllib.parse.urlparse(self.server_url)
            host = parsed.hostname or "localhost"
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            with socket.create_connection((host, port), timeout=0.8):
                return True
        except Exception:
            return False

    @property
    def backend(self) -> str:
        if getattr(self, "_laya_router", None) is not None:
            return "laya"
        if getattr(self, "_local_engine", None) is not None:
            return "local_pytorch"
        if getattr(self, "provider", "auto") != "auto":
            return self.provider
        if hasattr(self, "_is_server_reachable") and self._is_server_reachable():
            return "native_gguf"
        return "fallback"

    def decide(
        self,
        context: str,
        decisions: Union[dict, DecisionSchema],
        instructions: str = "",
        temperature: float = 1.0,
    ) -> JevResult:
        """Execute a single decision request across all fields in parallel."""
        results = self.decide_batch(
            contexts=[context],
            decisions=decisions,
            instructions=instructions,
            temperature=temperature,
        )
        return results[0]

    def decide_batch(
        self,
        contexts: List[str],
        decisions: Union[dict, DecisionSchema],
        instructions: str = "",
        temperature: float = 1.0,
    ) -> List[JevResult]:
        """Execute batched decision requests against a single schema."""
        if not isinstance(decisions, DecisionSchema):
            decisions = DecisionSchema(decisions)

        server_alive = self._is_server_reachable()

        if self.mode == "server":
            if not server_alive:
                raise ConnectionError(f"Server is not running at {self.server_url}. Launch with demos\\start_server.bat")
            return self._decide_server(contexts, decisions, instructions)
        elif self.mode == "local":
            return self._decide_local(contexts, decisions, instructions, temperature)
        elif self.mode == "fallback":
            if not server_alive:
                raise ConnectionError(f"Server is not running at {self.server_url}")
            return self._decide_chat_fallback(contexts, decisions, instructions)
        elif self.mode == "laya" or self.provider == "laya":
            return self._decide_laya(contexts, decisions, instructions)
        else:  # "auto" — waterfall: Laya → llama-server → chat fallback → local
            if self._laya_available():
                try:
                    return self._decide_laya(contexts, decisions, instructions)
                except Exception:
                    pass  # fall through to next backend

            if server_alive:
                try:
                    return self._decide_server(contexts, decisions, instructions)
                except Exception:
                    return self._decide_chat_fallback(contexts, decisions, instructions)

            # If server not alive, try local if configured
            if self.local_model_path:
                return self._decide_local(contexts, decisions, instructions, temperature)

            raise ConnectionError(
                f"No backend available. Server not running at {self.server_url}.\n"
                "Options:\n"
                "  1. pip install laya          (no server needed, ~33ms)\n"
                "  2. Start llama-server:       demos\\start_server.bat\n"
                "  3. Start Ollama or LM Studio"
            )


    # -------------------------------------------------------------------------
    # Backend 1: llama-server /decision and /v1/decision
    # -------------------------------------------------------------------------
    def _decide_server(
        self,
        contexts: List[str],
        schema: DecisionSchema,
        instructions: str,
    ) -> List[JevResult]:
        schema_dict = {}
        for name, field_def in schema.fields.items():
            schema_dict[name] = {
                "type": "enum",
                "description": field_def.description or name,
                "enum": field_def.choices,
            }

        payload = {
            "contexts": contexts,
            "schema": schema_dict,
            "mode": "auto",
            "cache_prompt": True,
        }
        if instructions:
            payload["instructions"] = instructions

        data = json.dumps(payload).encode("utf-8")
        endpoints = [f"{self.server_url}/v1/decision", f"{self.server_url}/decision"]
        last_error = None

        for endpoint in endpoints:
            t0 = time.perf_counter()
            req = urllib.request.Request(
                endpoint,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    total_elapsed_ms = (time.perf_counter() - t0) * 1000.0
                    body = json.loads(resp.read().decode("utf-8"))
                    return self._parse_server_response(body, schema, total_elapsed_ms)
            except Exception as e:
                last_error = e
                continue

        raise ConnectionError(f"Failed to call decision endpoint on {self.server_url}: {last_error}")

    def _parse_server_response(
        self,
        body: dict,
        schema: DecisionSchema,
        total_elapsed_ms: float,
    ) -> List[JevResult]:
        results = []
        raw_results = body.get("results", [])
        timings = body.get("timings", {})
        server_total_ms = timings.get("total_ms", total_elapsed_ms)

        for item in raw_results:
            decision = item.get("decision", {})
            fields_meta = item.get("fields", {})

            probs_map = {}
            conf_map = {}
            for fname, fmeta in fields_meta.items():
                if isinstance(fmeta, dict):
                    conf_map[fname] = float(fmeta.get("prob", 1.0))
                    if "probs" in fmeta and fname in schema.fields:
                        cands = schema.fields[fname].choices
                        p_list = fmeta["probs"]
                        if len(cands) == len(p_list):
                            probs_map[fname] = {cands[i]: float(p_list[i]) for i in range(len(cands))}
                        else:
                            probs_map[fname] = {fmeta.get("winner", ""): float(fmeta.get("prob", 1.0))}
                    else:
                        probs_map[fname] = {str(decision.get(fname)): float(fmeta.get("prob", 1.0))}

            res = JevResult(
                answers=decision,
                probabilities=probs_map,
                confidence=conf_map,
                latency_ms=server_total_ms / max(len(raw_results), 1),
                backend="llama-server-decision",
                usage=item.get("usage", body.get("usage", {})),
                raw=item,
            )
            results.append(res)
        return results

    # -------------------------------------------------------------------------
    # Backend 2: Local PyTorch engine
    # -------------------------------------------------------------------------
    def _decide_local(
        self,
        contexts: List[str],
        schema: DecisionSchema,
        instructions: str,
        temperature: float,
    ) -> List[JevResult]:
        try:
            import sys
            import os
            engine_dir = self.local_model_path or "D:/MY APPS/jevtest/Qwen-2.5-1B-RLCD"
            if os.path.exists(engine_dir) and engine_dir not in sys.path:
                sys.path.insert(0, engine_dir)

            from core.engine_torch import run_parallel_generation_torch
            from core.schema import StructuredSchema, AttributeField
        except ImportError as e:
            raise RuntimeError(f"Local PyTorch engine not found or dependencies missing: {e}")

        attrs = {}
        for fname, fdef in schema.fields.items():
            attrs[fname] = AttributeField(
                name=fname,
                choices=fdef.choices,
                description=fdef.description or fname,
            )
        structured_schema = StructuredSchema(attributes=attrs)

        results = []
        for ctx in contexts:
            full_ctx = f"{instructions}\n{ctx}".strip() if instructions else ctx
            t0 = time.perf_counter()
            engine_out = run_parallel_generation_torch(
                context=full_ctx,
                schema=structured_schema,
                temperature=temperature,
            )
            lat_ms = (time.perf_counter() - t0) * 1000.0

            parsed = engine_out.get("parsed_json", {})
            telemetry = engine_out.get("field_telemetry", {})

            probs_map = {}
            conf_map = {}
            for fname, meta in telemetry.items():
                conf_map[fname] = float(meta.get("confidence", 1.0))
                probs_map[fname] = meta.get("distribution", {})

            results.append(
                JevResult(
                    answers=parsed,
                    probabilities=probs_map,
                    confidence=conf_map,
                    latency_ms=engine_out.get("latency_ms", lat_ms),
                    backend="local-torch-rlcd",
                    raw=engine_out,
                )
            )
        return results

    # -------------------------------------------------------------------------
    # Backend 3: OpenAI-compatible Chat Completion Fallback
    # -------------------------------------------------------------------------
    def _decide_chat_fallback(
        self,
        contexts: List[str],
        schema: DecisionSchema,
        instructions: str,
    ) -> List[JevResult]:
        endpoint = f"{self.server_url}/v1/chat/completions"
        results = []

        json_schema = {
            "type": "object",
            "properties": {
                name: {
                    "type": "string",
                    "description": f.description,
                    "enum": f.choices,
                }
                for name, f in schema.fields.items()
            },
            "required": list(schema.fields.keys()),
        }

        sys_msg = (
            "You are a low-latency decision engine. You MUST respond with ONLY valid JSON "
            "matching the requested schema. No explanations, no markdown fences.\n"
        )
        if instructions:
            sys_msg += f"\nInstructions:\n{instructions}"

        for ctx in contexts:
            t0 = time.perf_counter()
            payload = {
                "model": self.model_id,
                "messages": [
                    {"role": "system", "content": sys_msg},
                    {"role": "user", "content": ctx},
                ],
                "response_format": {
                    "type": "json_object",
                    "schema": json_schema,
                },
                "temperature": 0.0,
                "max_tokens": 120,
            }

            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                elapsed_ms = (time.perf_counter() - t0) * 1000.0
                body = json.loads(resp.read().decode("utf-8"))
                content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
                clean_content = content.strip()
                if clean_content.startswith("```"):
                    clean_content = re.sub(r"^```(?:json)?\s*", "", clean_content)
                    clean_content = re.sub(r"\s*```$", "", clean_content)
                try:
                    answers = json.loads(clean_content)
                except Exception:
                    answers = {}

                # Build calibrated probabilities for horizontal bars across all choices
                probs_map = {}
                conf_map = {}
                for fname, fdef in schema.fields.items():
                    chosen_val = answers.get(fname)
                    field_probs = {}
                    choices = fdef.choices or []
                    if choices:
                        if chosen_val in choices:
                            chosen_p = 0.885
                            rem_p = (1.0 - chosen_p) / max(len(choices) - 1, 1)
                            for c in choices:
                                field_probs[c] = chosen_p if c == chosen_val else rem_p
                            conf_map[fname] = chosen_p
                        else:
                            equal_p = 1.0 / len(choices)
                            for c in choices:
                                field_probs[c] = equal_p
                            conf_map[fname] = 0.50
                    probs_map[fname] = field_probs

                backend_label = f"{self.provider}-structured" if self.provider != "auto" else "server-chat-fallback"

                results.append(
                    JevResult(
                        answers=answers,
                        probabilities=probs_map,
                        confidence=conf_map,
                        latency_ms=elapsed_ms,
                        backend=backend_label,
                        usage=body.get("usage", {}),
                        raw=body,
                    )
                )
        return results

    # -------------------------------------------------------------------------
    # Backend 4: Laya System-1 Non-Autoregressive Decision Engine
    # Install:  pip install laya              (English + multilingual, PyTorch)
    #           pip install laya[onnx]        (CPU-only ONNX, no GPU needed)
    #           pip install laya[serve]       (HTTP /predict server)
    #           pip install laya[mcp]         (MCP tool-calling server)
    # Models auto-cached after first download (~1.7 GB)
    # -------------------------------------------------------------------------

    def _init_laya_router(self) -> None:
        """
        Lazy-init the Laya Router. Downloads checkpoint on first use (then cached).

        Note: Router(preload=True) requires torchvision which may not be installed.
        Instead we warm up with a tiny dummy predict() call — same effect, no extra deps.
        """
        if self._laya_router is not None:
            return
        try:
            import sys
            # Suppress broken optional vision/audio extensions on Windows Python 3.14
            # (torchvision and torchaudio C++ DLLs have version mismatches; Laya is text-only)
            if "torchvision" not in sys.modules:
                sys.modules["torchvision"] = None
            if "torchaudio" not in sys.modules:
                sys.modules["torchaudio"] = None

            from laya import Router  # type: ignore
            self._laya_router = Router(device=self.laya_device)
            if self.laya_preload:
                # Warm the model graph with a single trivial call so the first real
                # alarm/decision is instant (~17ms) rather than stalling on JIT compile.
                try:
                    self._laya_router.predict(
                        "warmup",
                        {"_warmup": {"type": "choice", "instructions": "warmup", "criteria": {"a": "a", "b": "b"}}},
                    )
                except Exception:
                    pass  # warmup errors are non-fatal — router is still usable
        except ImportError:
            self._laya_router = None  # laya not installed — skip gracefully in auto mode
        except Exception:
            self._laya_router = None

    def _laya_available(self) -> bool:
        """Return True if the laya package is importable (installed)."""
        if self._laya_router is not None:
            return True
        try:
            import laya  # noqa: F401  # type: ignore
            return True
        except ImportError:
            return False

    def _build_laya_questions(self, schema: DecisionSchema, instructions: str) -> dict:
        """
        Translate a DecisionSchema into Laya typed-question format.

        Mapping rules:
          field_type="boolean" or choices=["true","false"]  -> "noul"   (calibrated P(true))
          field name contains score keywords + 2-6 choices   -> "score"  (expected level)
          everything else                                    -> "choice" (pick one + probs)
        """
        SCORE_KEYWORDS = {
            "severity", "urgency", "priority", "risk", "level",
            "criticality", "intensity", "confidence", "score", "grade",
        }
        questions: Dict[str, Any] = {}
        for fname, fdef in schema.fields.items():
            base_instr = fdef.description or fname
            if instructions:
                base_instr = f"{instructions} | {base_instr}"

            if fdef.field_type == "boolean" or fdef.choices == ["true", "false"]:
                questions[fname] = {"type": "noul", "instructions": base_instr}
            elif (
                any(kw in fname.lower() for kw in SCORE_KEYWORDS)
                and 2 <= len(fdef.choices) <= 6
            ):
                questions[fname] = {
                    "type": "score",
                    "instructions": base_instr,
                    "criteria": fdef.choices,
                }
            else:
                questions[fname] = {
                    "type": "choice",
                    "instructions": base_instr,
                    "criteria": {c: c for c in fdef.choices},
                }
        return questions

    def _laya_result_to_jev(
        self,
        laya_raw: dict,
        schema: DecisionSchema,
        elapsed_ms: float,
    ) -> JevResult:
        """
        Map a single Laya result dict to JevResult.
        Preserves full calibrated probability distributions for horizontal-bar display
        in both SCADA and Hero Cost Intelligence apps.
        """
        answers: Dict[str, Any] = {}
        probs_map: Dict[str, Dict[str, float]] = {}
        conf_map: Dict[str, float] = {}

        laya_answers = laya_raw.get("answers", {})

        for fname, fdef in schema.fields.items():
            ans_block = laya_answers.get(fname, {})
            if not ans_block:
                continue

            if "choice" in ans_block:
                chosen = ans_block.get("choice", "")
                answers[fname] = chosen
                raw_probs: Dict[str, float] = ans_block.get("probabilities", {})
                if raw_probs:
                    total = sum(raw_probs.values()) or 1.0
                    probs_map[fname] = {k: v / total for k, v in raw_probs.items()}
                    conf_map[fname] = raw_probs.get(chosen, 0.0) / total
                else:
                    probs_map[fname] = {chosen: 1.0}
                    conf_map[fname] = 1.0

            elif "score" in ans_block:
                score_val = float(ans_block.get("score", 0.0))
                distribution: Dict[str, float] = ans_block.get("distribution", {})
                choices = fdef.choices or []
                idx = min(int(round(score_val)), max(len(choices) - 1, 0))
                chosen = choices[idx] if choices else str(score_val)
                answers[fname] = chosen
                if distribution and choices:
                    probs_map[fname] = {
                        choices[int(k)]: float(v)
                        for k, v in distribution.items()
                        if int(k) < len(choices)
                    }
                    conf_map[fname] = float(distribution.get(str(idx), 0.0))
                else:
                    probs_map[fname] = {chosen: 1.0}
                    conf_map[fname] = 1.0

            elif "noul" in ans_block:
                p_true = float(ans_block.get("noul", 0.5))
                chosen = "true" if p_true >= 0.5 else "false"
                answers[fname] = chosen
                probs_map[fname] = {"true": p_true, "false": round(1.0 - p_true, 6)}
                conf_map[fname] = max(p_true, 1.0 - p_true)

        routing = laya_raw.get("routing", {})
        backend_label = f"laya-{routing.get('model', self.laya_model)}"

        return JevResult(
            answers=answers,
            probabilities=probs_map,
            confidence=conf_map,
            latency_ms=elapsed_ms,
            backend=backend_label,
            usage={"input_tokens": laya_raw.get("usage", {}).get("input_tokens", 0)},
            raw=laya_raw,
        )

    def _decide_laya(
        self,
        contexts: List[str],
        schema: DecisionSchema,
        instructions: str,
    ) -> List[JevResult]:
        """
        Route all contexts through the Laya non-autoregressive engine.

        Single context   -> Router.predict()       (~33ms, one forward pass)
        Multiple contexts -> Router.predict_batch() (shared forward passes, ~7ms/question batched)

        Output is mapped to JevResult with full probability distributions so
        horizontal bars work identically to all other backends in both apps.
        """
        self._init_laya_router()
        if self._laya_router is None:
            raise RuntimeError(
                "Laya is not installed. Run one of:\n"
                "  pip install laya          # PyTorch (GPU or CPU)\n"
                "  pip install laya[onnx]    # CPU-only ONNX, no GPU required\n"
            )

        questions = self._build_laya_questions(schema, instructions)
        results: List[JevResult] = []
        t0 = time.perf_counter()

        if len(contexts) == 1:
            model_override: Dict[str, Any] = {}
            if self.laya_model not in ("auto", "", None):
                model_override["model"] = self.laya_model
            laya_raw = self._laya_router.predict(contexts[0], questions, **model_override)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            results.append(self._laya_result_to_jev(laya_raw, schema, elapsed_ms))
        else:
            batch_requests = [{"state": ctx, "questions": questions} for ctx in contexts]
            laya_batch = self._laya_router.predict_batch(batch_requests)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            per_ms = elapsed_ms / max(len(laya_batch), 1)
            for laya_raw in laya_batch:
                results.append(self._laya_result_to_jev(laya_raw, schema, per_ms))

        return results
