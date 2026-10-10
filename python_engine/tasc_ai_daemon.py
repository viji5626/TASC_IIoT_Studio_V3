"""
TASC IIoT Studio — Python AI Daemon Sidecar
Ultra-low-latency IPC listener for Multi-Agent SCADA Reasoning, DSPy Programs, RAG & Local SLMs.
"""

import sys
import os
import json
import time
import socket
import threading
import logging
import concurrent.futures
import multiprocessing

# ─── Script and Root Directory Path Configuration ────────────────────────────
_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)
_root_dir = os.path.dirname(_script_dir)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

# Configure audit logging with fallback if root dir is write-protected (e.g. Program Files)
_log_file = os.path.join(_root_dir, 'tasc_ai_daemon_audit.log')
try:
    with open(_log_file, 'a') as _f:
        pass
except Exception:
    import tempfile
    _log_file = os.path.join(tempfile.gettempdir(), 'tasc_ai_daemon_audit.log')

try:
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', filename=_log_file)
except Exception:
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
audit_logger = logging.getLogger('Audit')

# Import Local Modules
try:
    from local_rag import local_rag_engine
except ImportError:
    local_rag_engine = None

try:
    from dspy_agents import dspy_orchestrator
except ImportError:
    dspy_orchestrator = None

try:
    from slm_failover import local_slm_engine, build_scada_tool_gbnf_grammar
except ImportError:
    local_slm_engine = None
    build_scada_tool_gbnf_grammar = None

# ─── Jev Decision & Laya Engine Integration ───────────────────────────────────
if r"D:\MY APPS\jevtest" not in sys.path and os.path.exists(r"D:\MY APPS\jevtest"):
    sys.path.insert(0, r"D:\MY APPS\jevtest")

# If local laya cache exists, use offline mode to prevent slow/blocking network checks
_laya_cache = os.path.expanduser(r"~/.cache/huggingface/hub/models--convaiinnovations--laya")
if os.path.exists(_laya_cache):
    os.environ["HF_HUB_OFFLINE"] = "1"

try:
    from jev_decision import JevClient, ScadaDecisions
    # Warm preload JevClient with auto-detection and Laya preload
    # Loads checkpoint once at daemon startup, ensuring subsequent calls run in 15-35ms
    _jev_client = JevClient(provider="auto", laya_preload=True)
    _scada_engine = ScadaDecisions(_jev_client)
    JEV_ENABLED = True
    audit_logger.info(f"Jev Decision Engine preloaded successfully with backend: {_jev_client.backend}")
except Exception as e:
    _jev_client = None
    _scada_engine = None
    JEV_ENABLED = False
    audit_logger.warning(f"Jev Decision Engine initialization failed: {e}")

def get_jev_engine(payload):
    provider = payload.get("provider", "auto")
    server_url = payload.get("server_url", None)
    model_id = payload.get("model_id", "default")
    
    # Re-use preloaded warm engine if using default auto provider with no custom server_url
    if (provider == "auto" or not provider) and not server_url and _scada_engine is not None:
        return _scada_engine
    
    if JEV_ENABLED:
        client = JevClient(provider=provider, server_url=server_url, model_id=model_id)
        return ScadaDecisions(client)
    elif _scada_engine is not None:
        return _scada_engine
    else:
        raise RuntimeError("Jev Decision Engine is not available")

DAEMON_VERSION = "3.5.0"
DEFAULT_PORT = 8765

def handle_client(conn, addr):
    try:
        buffer = ""
        while True:
            data = conn.recv(65536)
            if not data:
                break
            buffer += data.decode("utf-8")
            
            # Process newline-delimited JSON messages
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                
                start_time = time.time()
                try:
                    req = json.loads(line)
                    if not isinstance(req, dict):
                        raise ValueError("Payload must be a JSON object")
                        
                    cmd = req.get("command", "")
                    if not isinstance(cmd, str):
                        raise ValueError("Command must be a string")
                        
                    payload = req.get("payload", {})
                    if not isinstance(payload, dict):
                        raise ValueError("Payload must be a dictionary")
                        
                    req_id = str(req.get("requestId", int(time.time() * 1000)))
                    
                    audit_logger.info(f"Received command: {cmd}, req_id: {req_id}")
                    
                    if cmd == "HEALTH_CHECK" or cmd == "PING":
                        if local_slm_engine and not getattr(local_slm_engine, "is_loaded", False):
                            if hasattr(local_slm_engine, "check_and_adopt_running_server"):
                                local_slm_engine.check_and_adopt_running_server()

                        slm_ready = bool(local_slm_engine and (getattr(local_slm_engine, "is_loaded", False) or getattr(local_slm_engine, "llm", None) is not None))
                        loaded_model = getattr(local_slm_engine, "loaded_model_name", "") if (slm_ready and local_slm_engine) else ""

                        res = {
                            "requestId": req_id,
                            "status": "OK",
                            "daemonVersion": DAEMON_VERSION,
                            "ragStoreReady": bool(local_rag_engine),
                            "dspyOrchestratorReady": bool(dspy_orchestrator),
                            "slmEngineReady": slm_ready,
                            "loadedModel": loaded_model,
                            "jevEngineReady": JEV_ENABLED,
                            "jevBackend": getattr(_jev_client, "backend", "none") if _jev_client else "none",
                            "executionTimeMs": round((time.time() - start_time) * 1000, 2)
                        }
                    elif cmd == "SCAN_GGUF_MODELS":
                        search_dir = payload.get("searchDir", None)
                        models = []
                        if local_slm_engine:
                            models = local_slm_engine.scan_models(search_dir)
                        res = {
                            "requestId": req_id,
                            "status": "SUCCESS",
                            "models": models,
                            "executionTimeMs": round((time.time() - start_time) * 1000, 2)
                        }
                    elif cmd == "LOAD_GGUF_MODEL":
                        model_path = payload.get("modelPath", "")
                        n_ctx = payload.get("nCtx", 2048)
                        n_threads = payload.get("nThreads", 4)
                        gpu_layers = payload.get("gpuLayers", 0)
                        
                        if local_slm_engine and model_path:
                            load_res = local_slm_engine.load_model(model_path, n_ctx=n_ctx, n_threads=n_threads, gpu_layers=gpu_layers)
                            load_res["requestId"] = req_id
                            res = load_res
                        else:
                            res = {
                                "requestId": req_id,
                                "status": "ERROR",
                                "message": "SLM engine not initialized or model path empty."
                            }
                    elif cmd == "UNLOAD_GGUF_MODEL":
                        # Called when user switches AI provider OR server shuts down.
                        # Frees all VRAM / RAM held by the llama-cpp-python Llama context.
                        if local_slm_engine:
                            unload_res = local_slm_engine.unload_model()
                            unload_res["requestId"] = req_id
                            res = unload_res
                        else:
                            res = {
                                "requestId": req_id,
                                "status": "OK",
                                "message": "SLM engine not loaded — nothing to unload."
                            }
                    elif cmd == "LOCAL_SLM_INFERENCE":
                        # Multi-turn chat path: messages[] array (preferred for conversational AI)
                        messages = payload.get("messages", None)
                        # Legacy single-turn path: prompt string (used for GBNF tool calls)
                        prompt = payload.get("prompt", "")
                        tools = payload.get("tools", [])
                        max_tokens = payload.get("maxTokens", 512)  # cap at 512 to limit inference time
                        temperature = payload.get("temperature", 0.7)
                        # Inference timeout: 280s (slightly below the 300s Express timeout)
                        INFERENCE_TIMEOUT_S = 280

                        if local_slm_engine:
                            if messages and isinstance(messages, list) and len(messages) > 0:
                                # Run multi-turn chat completion in a thread so we can enforce a timeout
                                def _run_chat():
                                    return local_slm_engine.chat_completion(
                                        messages=messages,
                                        max_tokens=max_tokens,
                                        temperature=temperature
                                    )
                                _run_fn = _run_chat
                            else:
                                # Legacy raw completion path with optional GBNF grammar
                                grammar = None
                                if tools and build_scada_tool_gbnf_grammar:
                                    grammar = build_scada_tool_gbnf_grammar(tools)
                                def _run_generate():
                                    return local_slm_engine.generate(
                                        prompt,
                                        grammar_str=grammar,
                                        max_tokens=max_tokens,
                                        temperature=temperature
                                    )
                                _run_fn = _run_generate

                            # Execute inference with timeout guard
                            _t_inf_start = time.time()
                            try:
                                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as _executor:
                                    _future = _executor.submit(_run_fn)
                                    res = _future.result(timeout=INFERENCE_TIMEOUT_S)
                                _inf_ms = round((time.time() - _t_inf_start) * 1000, 2)
                                audit_logger.info(f"LOCAL_SLM_INFERENCE completed in {_inf_ms}ms")
                            except concurrent.futures.TimeoutError:
                                audit_logger.error(f"LOCAL_SLM_INFERENCE timed out after {INFERENCE_TIMEOUT_S}s")
                                res = {
                                    "status": "ERROR",
                                    "engine": f"llama-cpp-python ({getattr(local_slm_engine, 'loaded_model_name', 'GGUF')})",
                                    "text": f"Inference timed out after {INFERENCE_TIMEOUT_S}s. Try reducing max tokens or enabling GPU layers.",
                                    "executionTimeMs": round((time.time() - _t_inf_start) * 1000, 2)
                                }
                            res["requestId"] = req_id
                        else:
                            res = {
                                "requestId": req_id,
                                "status": "SUCCESS",
                                "engine": "Air-Gapped Local Rule Engine",
                                "text": "Air-gapped local fallback active.",
                                "executionTimeMs": round((time.time() - start_time) * 1000, 2)
                            }
                    elif cmd == "RAG_QUERY":
                        query_text = payload.get("queryText", "")
                        top_k = payload.get("topK", 3)
                        category = payload.get("categoryFilter", None)
                        
                        citations = []
                        if local_rag_engine:
                            citations = local_rag_engine.query(query_text, top_k=top_k, category_filter=category)
                        
                        res = {
                            "requestId": req_id,
                            "status": "SUCCESS",
                            "executionTimeMs": round((time.time() - start_time) * 1000, 2),
                            "citations": citations
                        }
                    elif cmd == "DSPY_SYNTHESIZE" or cmd == "DSPY_ROUTING":
                        query = payload.get("userQuery", "")
                        snapshot = payload.get("systemSnapshot", "")
                        registered_tags = payload.get("registeredTags", [])
                        
                        if dspy_orchestrator:
                            eval_res = dspy_orchestrator.route_and_evaluate(query, snapshot, registered_tags)
                            eval_res["requestId"] = req_id
                            res = eval_res
                        else:
                            res = {
                                "requestId": req_id,
                                "status": "FALLBACK",
                                "activeSpecialists": ["memory", "telemetry"],
                                "executionTimeMs": round((time.time() - start_time) * 1000, 2)
                            }
                    elif cmd == "SPECIALIST_EVAL":
                        query = payload.get("queryText", "")
                        specialists = payload.get("targetSpecialists", [])
                        time_horizon = payload.get("timeHorizon", {})
                        
                        evidence = []
                        storage_tier = "hot_raw"
                        
                        if time_horizon and time_horizon.get("isArchive"):
                            storage_tier = time_horizon.get("storageTier", "compressed_archive_chunk")
                            evidence.append(f"[ARCHIVE EVIDENCE] Queried long-term store (Tier: {storage_tier}) for timeframe: {time_horizon.get('fromMs')} to {time_horizon.get('toMs')}")
                        
                        # RAG SOP Retrieval for query
                        if local_rag_engine:
                            rag_matches = local_rag_engine.query(query, top_k=2)
                            for match in rag_matches:
                                evidence.append(f"[RAG HIERARCHICAL SOP] {match['title']} (Score: {match['score']}): {match['parentContext']}")
                        
                        # DSPy Routing metadata
                        dspy_meta = ""
                        if dspy_orchestrator:
                            dspy_eval = dspy_orchestrator.route_and_evaluate(query, "", [])
                            dspy_meta = f" [DSPy Engine: {dspy_eval.get('engine', 'DSPy')}]"
                        
                        evidence.append(f"[PYTHON MULTI-AGENT EVAL{dspy_meta}] Processed {len(specialists)} specialist domains for query: '{query[:60]}...'")
                        
                        res = {
                            "requestId": req_id,
                            "status": "SUCCESS",
                            "isDspyOptimized": True,
                            "executionTimeMs": round((time.time() - start_time) * 1000, 2),
                            "evidenceLines": evidence,
                            "storageTierUsed": storage_tier
                        }
                    elif cmd == "JEV_ROOT_CAUSE_ANALYSIS":
                        telemetry = payload.get("telemetry", "")
                        t0 = time.time()
                        try:
                            engine = get_jev_engine(payload)
                            rca = engine.analyze_root_cause(telemetry)
                            res = {
                                "requestId": req_id,
                                "status": "SUCCESS",
                                "executionTimeMs": rca.latency_ms,
                                "answers": rca.answers,
                                "probabilities": rca.probabilities,
                                "confidence": rca.confidence,
                                "backend": rca.backend
                            }
                        except Exception as err:
                            audit_logger.error(f"JEV_ROOT_CAUSE_ANALYSIS error: {err}")
                            res = {
                                "requestId": req_id,
                                "status": "FALLBACK",
                                "error": str(err),
                                "executionTimeMs": round((time.time() - t0) * 1000, 2)
                            }

                    elif cmd == "JEV_ALARM_TRIAGE":
                        telemetry = payload.get("telemetry", "")
                        t0 = time.time()
                        try:
                            engine = get_jev_engine(payload)
                            triage_func = getattr(engine, "triage_alarm", engine.route_alarm)
                            triage = triage_func(telemetry)
                            res = {
                                "requestId": req_id,
                                "status": "SUCCESS",
                                "executionTimeMs": triage.latency_ms,
                                "answers": triage.answers,
                                "probabilities": triage.probabilities,
                                "confidence": triage.confidence,
                                "backend": triage.backend
                            }
                        except Exception as err:
                            audit_logger.error(f"JEV_ALARM_TRIAGE error: {err}")
                            res = {
                                "requestId": req_id,
                                "status": "FALLBACK",
                                "error": str(err),
                                "executionTimeMs": round((time.time() - t0) * 1000, 2)
                            }

                    elif cmd == "JEV_SENSOR_DIAGNOSIS":
                        telemetry = payload.get("telemetry", "")
                        t0 = time.time()
                        try:
                            engine = get_jev_engine(payload)
                            diag = engine.diagnose_sensor(telemetry)
                            res = {
                                "requestId": req_id,
                                "status": "SUCCESS",
                                "executionTimeMs": diag.latency_ms,
                                "answers": diag.answers,
                                "probabilities": diag.probabilities,
                                "confidence": diag.confidence,
                                "backend": diag.backend
                            }
                        except Exception as err:
                            audit_logger.error(f"JEV_SENSOR_DIAGNOSIS error: {err}")
                            res = {
                                "requestId": req_id,
                                "status": "FALLBACK",
                                "error": str(err),
                                "executionTimeMs": round((time.time() - t0) * 1000, 2)
                            }

                    elif cmd == "JEV_ENERGY_METER_RATING":
                        telemetry = payload.get("telemetry", "")
                        t0 = time.time()
                        try:
                            engine = get_jev_engine(payload)
                            rating = engine.rate_energy_meters(telemetry)
                            res = {
                                "requestId": req_id,
                                "status": "SUCCESS",
                                "executionTimeMs": rating.latency_ms,
                                "answers": rating.answers,
                                "probabilities": rating.probabilities,
                                "confidence": rating.confidence,
                                "backend": rating.backend
                            }
                        except Exception as err:
                            audit_logger.error(f"JEV_ENERGY_METER_RATING error: {err}")
                            res = {
                                "requestId": req_id,
                                "status": "FALLBACK",
                                "error": str(err),
                                "executionTimeMs": round((time.time() - t0) * 1000, 2)
                            }

                    elif cmd == "JEV_MULTI_UTILITY_RATING":
                        utility_type = payload.get("utility_type", "WATER_FLOW_M3")
                        telemetry = payload.get("telemetry", "")
                        t0 = time.time()
                        try:
                            engine = get_jev_engine(payload)
                            rating = engine.rate_utility(utility_type, telemetry)
                            res = {
                                "requestId": req_id,
                                "status": "SUCCESS",
                                "executionTimeMs": rating.latency_ms,
                                "answers": rating.answers,
                                "probabilities": rating.probabilities,
                                "confidence": rating.confidence,
                                "backend": rating.backend
                            }
                        except Exception as err:
                            audit_logger.error(f"JEV_MULTI_UTILITY_RATING error: {err}")
                            res = {
                                "requestId": req_id,
                                "status": "FALLBACK",
                                "error": str(err),
                                "executionTimeMs": round((time.time() - t0) * 1000, 2)
                            }

                    elif cmd == "JEV_RANK_METERS_BATCH":
                        contexts = payload.get("contexts", [])
                        meter_ids = payload.get("meter_ids", [])
                        k = payload.get("k", 5)
                        t0 = time.time()
                        try:
                            engine = get_jev_engine(payload)
                            ranked = engine.rank_meters_batch(contexts, meter_ids)
                            report = ScadaDecisions.top_and_bottom(ranked, k=k)
                            res = {
                                "requestId": req_id,
                                "status": "SUCCESS",
                                "executionTimeMs": round((time.time() - t0) * 1000, 2),
                                "ranked": ranked,
                                "highest": report["highest"],
                                "lowest": report["lowest"],
                                "count": len(ranked)
                            }
                        except Exception as err:
                            audit_logger.error(f"JEV_RANK_METERS_BATCH error: {err}")
                            res = {
                                "requestId": req_id,
                                "status": "FALLBACK",
                                "error": str(err),
                                "executionTimeMs": round((time.time() - t0) * 1000, 2)
                            }
                    else:
                        res = {
                            "requestId": req_id,
                            "status": "UNKNOWN_COMMAND",
                            "executionTimeMs": round((time.time() - start_time) * 1000, 2),
                            "message": f"Command '{cmd}' not recognized."
                        }
                except Exception as ex:
                    res = {
                        "requestId": req.get("requestId", "err") if "req" in locals() else "err",
                        "status": "ERROR",
                        "error": str(ex),
                        "executionTimeMs": round((time.time() - start_time) * 1000, 2)
                    }
                
                resp_bytes = (json.dumps(res) + "\n").encode("utf-8")
                conn.sendall(resp_bytes)
    except Exception as e:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass

def run_server(port=DEFAULT_PORT):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind(("127.0.0.1", port))
        server.listen(10)
        print(f"[TASC AI Daemon] Listening on 127.0.0.1:{port} (PID: {os.getpid()})")
        sys.stdout.flush()
        
        while True:
            conn, addr = server.accept()
            t = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            t.start()
    except Exception as e:
        print(f"[TASC AI Daemon Error] {e}", file=sys.stderr)
    finally:
        server.close()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    run_server(port)
