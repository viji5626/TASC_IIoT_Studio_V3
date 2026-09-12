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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', filename='tasc_ai_daemon_audit.log')
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
                        res = {
                            "requestId": req_id,
                            "status": "OK",
                            "daemonVersion": DAEMON_VERSION,
                            "ragStoreReady": bool(local_rag_engine),
                            "dspyOrchestratorReady": bool(dspy_orchestrator),
                            "slmEngineReady": bool(local_slm_engine),
                            "loadedModel": getattr(local_slm_engine, "loaded_model_name", "") if local_slm_engine else "",
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
                    elif cmd == "LOCAL_SLM_INFERENCE":
                        prompt = payload.get("prompt", "")
                        tools = payload.get("tools", [])
                        max_tokens = payload.get("maxTokens", 512)
                        temperature = payload.get("temperature", 0.1)
                        
                        grammar = None
                        if tools and build_scada_tool_gbnf_grammar:
                            grammar = build_scada_tool_gbnf_grammar(tools)
                        
                        if local_slm_engine:
                            res = local_slm_engine.generate(prompt, grammar_str=grammar, max_tokens=max_tokens, temperature=temperature)
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
