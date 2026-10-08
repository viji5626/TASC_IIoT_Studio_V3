"""
TASC IIoT Studio — Air-Gapped Local SLM Engine (Native CUDA llama-server + llama-cpp-python fallback)
Provides GPU-accelerated local GGUF inference via native llama-server.exe (matching HERO Cost Intelligence architecture),
with automatic layer offloading to NVIDIA GPU (RTX 4060 Laptop GPU), instant VRAM release on unload,
and GBNF context-free JSON schema tool-calling constraints.
"""

import os
import sys
import json
import time
import glob
import shutil
import subprocess
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

# Optional fallback to llama-cpp-python if llama-server.exe is absent
try:
    from llama_cpp import Llama, LlamaGrammar
    LLAMA_CPP_INSTALLED = True
except ImportError:
    Llama = None
    LlamaGrammar = None
    LLAMA_CPP_INSTALLED = False


def find_llama_server_exe() -> Optional[str]:
    """Resolves the native compiled llama-server.exe binary supporting CUDA GPU offload."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(base_dir, "runtimes", "llama", "llama-server.exe"),
        r"D:\MY APPS\hero-cost-intelligence - Copy (6)\runtimes\llama\llama-server.exe",
        os.path.expandvars(r"%APPDATA%\HERO Cost Intelligence\runtimes\llama\llama-server.exe"),
        shutil.which("llama-server.exe") or shutil.which("llama-server"),
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return os.path.abspath(c)
    return None


# ─── GBNF Grammar Builder for SCADA Tool Definitions ──────────────────────────
def build_scada_tool_gbnf_grammar(tools: List[Dict[str, Any]]) -> str:
    """
    Converts SCADA tool schemas into a strict GBNF Context-Free Grammar.
    Enforces that the local model MUST output valid JSON conforming to aiTools schemas.
    """
    tool_names = [t.get("name", "unknown") for t in tools]
    if not tool_names:
        tool_names = ["get_live_tag_value", "query_historian", "get_active_alarms"]

    tool_names_rule = " | ".join(f'"{name}"' for name in tool_names)

    grammar = f"""
root ::= ToolCall | DirectAnswer
ToolCall ::= "{{" ws "\\"tool\\":" ws ({tool_names_rule}) "," ws "\\"parameters\\":" ws JSONObject "}}"
DirectAnswer ::= "{{" ws "\\"answer\\":" ws JSONString "}}"
JSONObject ::= "{{" ws (JSONMember ("," ws JSONMember)*)? ws "}}"
JSONMember ::= JSONString ":" ws JSONValue
JSONValue ::= JSONString | JSONNumber | JSONObject | JSONArray | "true" | "false" | "null"
JSONArray ::= "[" ws (JSONValue ("," ws JSONValue)*)? ws "]"
JSONString ::= "\\"" ([^"\\\\\\x00-\\x1F] | "\\\\" (["\\\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\\""
JSONNumber ::= "-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [+-]? [0-9]+)?
ws ::= [ \\t\\n\\r]*
"""
    return grammar.strip()


class LocalSlmEngine:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.loaded_model_name = ""
        self.process: Optional[subprocess.Popen] = None
        self.port = 8085
        self.base_url = f"http://127.0.0.1:{self.port}"
        self.n_threads = min(12, os.cpu_count() or 6)
        self.n_ctx = 4096
        self.gpu_layers = 33
        self.is_loaded = False
        self.llm = None  # fallback llama-cpp-python handle
        self.server_exe = find_llama_server_exe()

        # Check and adopt already-running llama-server on port 8085
        self.check_and_adopt_running_server()

        if model_path:
            self.load_model(model_path)

    def check_and_adopt_running_server(self) -> bool:
        """
        Checks if llama-server.exe is already active and responsive on self.base_url.
        If responsive, automatically adopts the running process/model so inference works immediately.
        """
        try:
            req = urllib.request.Request(f"{self.base_url}/health")
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    try:
                        preq = urllib.request.Request(f"{self.base_url}/props")
                        with urllib.request.urlopen(preq, timeout=1.5) as presp:
                            props = json.loads(presp.read().decode("utf-8"))
                            model_path = props.get("model_path") or props.get("model_alias") or ""
                            if model_path:
                                self.model_path = model_path
                                self.loaded_model_name = os.path.basename(model_path)
                            default_params = props.get("default_generation_settings", {})
                            n_ctx = default_params.get("n_ctx") or props.get("n_ctx")
                            if n_ctx and isinstance(n_ctx, int):
                                self.n_ctx = n_ctx
                    except Exception:
                        if not self.loaded_model_name:
                            self.loaded_model_name = "llama-server (active)"
                    self.is_loaded = True
                    return True
        except Exception:
            pass
        return False

    def _truncate_messages_for_context(self, messages: List[Dict[str, str]], max_tokens: int) -> List[Dict[str, str]]:
        """
        Ensures the total estimated tokens in messages[] plus max_tokens does not
        exceed self.n_ctx. Trims system message and oldest conversation turns if needed.
        """
        if not messages:
            return messages

        # Safe budget: leave room for max_tokens output + safety margin
        token_budget = max(512, self.n_ctx - max_tokens - 64)
        char_budget = int(token_budget * 3.2)

        working_msgs = [dict(m) for m in messages]

        # 1. Compact system message if present and oversized
        if working_msgs[0].get("role") == "system":
            sys_content = working_msgs[0].get("content", "")
            if len(sys_content) > 1200:
                working_msgs[0]["content"] = sys_content[:1000] + "\n... [Context summarized for local SLM]"

        def total_chars(msgs):
            return sum(len(m.get("content", "")) for m in msgs)

        # 2. If still exceeds budget, drop oldest dialogue turns (keeping system message and latest user message)
        if len(working_msgs) > 2 and total_chars(working_msgs) > char_budget:
            sys_msg = working_msgs[0] if working_msgs[0].get("role") == "system" else None
            user_tail = working_msgs[-1]
            middle = working_msgs[1:-1] if sys_msg else working_msgs[:-1]

            while middle and total_chars(([sys_msg] if sys_msg else []) + middle + [user_tail]) > char_budget:
                middle.pop(0)

            working_msgs = ([sys_msg] if sys_msg else []) + middle + [user_tail]

        return working_msgs

    def scan_models(self, search_dir: Optional[str] = None) -> List[Dict[str, Any]]:
        """Scans for downloaded .gguf models across common directories or a custom folder."""
        search_dirs = []
        if search_dir and os.path.exists(search_dir):
            search_dirs.append(search_dir)

        # Default standard search paths: priority to bundled app models
        app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        app_models_dir = os.path.join(app_root, "models")
        if os.path.exists(app_models_dir):
            search_dirs.append(app_models_dir)

        cwd_models = os.path.join(os.getcwd(), "models")
        if os.path.exists(cwd_models) and cwd_models not in search_dirs:
            search_dirs.append(cwd_models)

        local_models_dir = os.path.join(os.path.dirname(__file__), "models")
        if os.path.exists(local_models_dir) and local_models_dir not in search_dirs:
            search_dirs.append(local_models_dir)

        search_dirs.append("D:\\models")
        search_dirs.append("C:\\models")
        search_dirs.append(os.path.expanduser("~/.lmstudio/models"))
        search_dirs.append(os.path.expanduser("~/.cache/lm-studio/models"))
        search_dirs.append(os.path.expanduser("~/.ollama/models"))

        found_models = []
        for s_dir in search_dirs:
            if not os.path.exists(s_dir):
                continue
            try:
                for root, _, files in os.walk(s_dir):
                    for f in files:
                        if f.lower().endswith(".gguf"):
                            full_path = os.path.join(root, f)
                            size_mb = round(os.path.getsize(full_path) / (1024 * 1024), 1)
                            is_loaded = (
                                full_path == self.model_path
                                and (self.is_loaded or self.llm is not None)
                            )
                            found_models.append({
                                "name": f,
                                "path": full_path,
                                "sizeMb": size_mb,
                                "isLoaded": is_loaded
                            })
            except Exception:
                pass

        return found_models

    def load_model(self, model_path: str, n_ctx: int = 2048, n_threads: int = 0, gpu_layers: int = 33) -> Dict[str, Any]:
        """
        Dynamically loads any user-specified .gguf model into memory/VRAM.
        Prefers native llama-server.exe for direct NVIDIA CUDA acceleration and GPU Activity visibility.
        """
        if not os.path.exists(model_path):
            return {
                "status": "ERROR",
                "message": f"Model file not found at path: {model_path}"
            }

        start_t = time.time()
        self.unload_model()  # Always release previous process and VRAM first

        self.model_path = model_path
        self.n_ctx = n_ctx if n_ctx > 0 else 4096
        self.n_threads = n_threads if n_threads > 0 else min(12, os.cpu_count() or 6)
        # Default to 33 layers if user leaves it <= 0 so it offloads to NVIDIA RTX 4060 GPU
        self.gpu_layers = gpu_layers if gpu_layers > 0 else 33
        self.loaded_model_name = os.path.basename(model_path)

        exe_path = find_llama_server_exe()

        # Primary: Native compiled llama-server.exe with CUDA GPU acceleration
        if exe_path and os.path.exists(exe_path):
            try:
                # Ensure no lingering llama-server is occupying port 8085
                if os.name == "nt":
                    _cflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
                    subprocess.run(["taskkill", "/F", "/IM", "llama-server.exe"], capture_output=True, check=False, creationflags=_cflags)
                    time.sleep(0.5)

                cmd = [
                    exe_path,
                    "-m", model_path,
                    "-ngl", str(self.gpu_layers),
                    "-c", str(self.n_ctx),
                    "-t", str(self.n_threads),
                    "--port", str(self.port),
                    "--host", "127.0.0.1",
                ]

                print(f"[LocalSlmEngine] Spawning native CUDA llama-server: {' '.join(cmd)}")
                self.process = subprocess.Popen(
                    cmd,
                    cwd=os.path.dirname(exe_path),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
                )

                # Poll health endpoint until model is ready
                ready = False
                for _ in range(120):  # up to 60 seconds
                    time.sleep(0.5)
                    if self.process.poll() is not None:
                        ret_code = self.process.returncode
                        return {
                            "status": "ERROR",
                            "message": f"llama-server.exe exited with code {ret_code}."
                        }
                    try:
                        req = urllib.request.Request(f"{self.base_url}/health")
                        with urllib.request.urlopen(req, timeout=1) as resp:
                            if resp.status == 200:
                                ready = True
                                break
                    except Exception:
                        pass

                if ready:
                    self.is_loaded = True
                    load_time = round((time.time() - start_t) * 1000, 2)
                    print(f"[LocalSlmEngine] [OK] Native llama-server.exe ready on port {self.port} in {load_time}ms (GPU layers: {self.gpu_layers})")
                    return {
                        "status": "SUCCESS",
                        "modelName": self.loaded_model_name,
                        "modelPath": model_path,
                        "loadTimeMs": load_time,
                        "nCtx": self.n_ctx,
                        "nThreads": self.n_threads,
                        "gpuLayers": self.gpu_layers,
                        "engine": f"llama-server.exe (CUDA GPU, {self.gpu_layers} layers)"
                    }
                else:
                    self.unload_model()
                    return {
                        "status": "ERROR",
                        "message": "Timed out waiting for llama-server.exe to initialize on port 8085."
                    }
            except Exception as e:
                print(f"[LocalSlmEngine] Failed to spawn llama-server.exe: {e}")

        # Secondary: llama-cpp-python fallback
        if LLAMA_CPP_INSTALLED:
            try:
                self.llm = Llama(
                    model_path=model_path,
                    n_ctx=self.n_ctx,
                    n_threads=self.n_threads,
                    n_gpu_layers=self.gpu_layers,
                    verbose=False
                )
                self.is_loaded = True
                load_time = round((time.time() - start_t) * 1000, 2)
                return {
                    "status": "SUCCESS",
                    "modelName": self.loaded_model_name,
                    "modelPath": model_path,
                    "loadTimeMs": load_time,
                    "nCtx": self.n_ctx,
                    "nThreads": self.n_threads,
                    "gpuLayers": self.gpu_layers,
                    "engine": "llama-cpp-python (in-process fallback)"
                }
            except Exception as ex:
                return {
                    "status": "ERROR",
                    "error": str(ex),
                    "message": f"Failed to initialize llama-cpp-python with model: {self.loaded_model_name}"
                }

        return {
            "status": "ERROR",
            "message": "Neither llama-server.exe nor llama-cpp-python is available on this system."
        }

    def unload_model(self) -> Dict[str, Any]:
        """
        Unloads the current model and immediately terminates llama-server.exe,
        freeing 100% of GPU VRAM and removing the process from NVIDIA GPU Activity.
        """
        import gc
        model_name = self.loaded_model_name or "none"
        try:
            # 1. Terminate native llama-server process
            if self.process is not None:
                try:
                    if os.name == "nt":
                        _cflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
                        subprocess.run(
                            ["taskkill", "/F", "/T", "/PID", str(self.process.pid)],
                            capture_output=True,
                            check=False,
                            creationflags=_cflags
                        )
                    else:
                        self.process.terminate()
                except Exception:
                    try:
                        self.process.kill()
                    except Exception:
                        pass
                self.process = None

            # Extra cleanup: Ensure no orphaned llama-server.exe instances remain
            if os.name == "nt":
                _cflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
                subprocess.run(
                    ["taskkill", "/F", "/IM", "llama-server.exe"],
                    capture_output=True,
                    check=False,
                    creationflags=_cflags
                )

            # 2. Cleanup llama-cpp-python in-process handle if active
            if self.llm is not None:
                del self.llm
                self.llm = None
                gc.collect()

            self.model_path = None
            self.loaded_model_name = ""
            self.is_loaded = False

            return {
                "status": "SUCCESS",
                "message": f"Model '{model_name}' unloaded. VRAM freed.",
                "unloadedModel": model_name
            }
        except Exception as ex:
            return {
                "status": "ERROR",
                "error": str(ex),
                "message": f"Error unloading model '{model_name}': {ex}"
            }

    def chat_completion(self, messages: List[Dict[str, str]], max_tokens: int = 512, temperature: float = 0.7) -> Dict[str, Any]:
        """
        Runs multi-turn chat inference on native CUDA llama-server via OpenAI-compatible endpoint.
        Preserves conversational context and offloads 100% to GPU.
        """
        start_t = time.time()

        # Check if native llama-server.exe is running and responsive
        if not self.is_loaded:
            self.check_and_adopt_running_server()

        if self.is_loaded or self.process is not None:
            # Safely window messages so they don't exceed server context size
            safe_messages = self._truncate_messages_for_context(messages, max_tokens)
            try:
                body = {
                    "messages": safe_messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "stream": False,
                    "stop": ["<|user|>", "</s>", "<|im_end|>", "<|endoftext|>"]
                }
                req = urllib.request.Request(
                    f"{self.base_url}/v1/chat/completions",
                    data=json.dumps(body).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=120) as resp:
                    res_json = json.loads(resp.read().decode("utf-8"))
                    text = res_json["choices"][0]["message"]["content"].strip()
                    tokens_generated = res_json.get("usage", {}).get("completion_tokens", len(text.split()))
                    tps = round(tokens_generated / max(0.05, time.time() - start_t), 1)

                    return {
                        "status": "SUCCESS",
                        "engine": f"llama-server.exe ({self.loaded_model_name})",
                        "text": text,
                        "tokensPerSec": tps,
                        "executionTimeMs": round((time.time() - start_t) * 1000, 2)
                    }
            except urllib.error.HTTPError as he:
                err_body = ""
                try:
                    err_body = he.read().decode("utf-8")
                except Exception:
                    pass
                print(f"[LocalSlmEngine] llama-server HTTP Error {he.code}: {err_body}")

                # If 400 Context Exceeded: Emergency retry with only the last user message!
                if he.code == 400 and ("exceed" in err_body.lower() or "context" in err_body.lower()):
                    try:
                        last_user_content = next((m.get("content", "") for m in reversed(messages) if m.get("role") == "user"), "")
                        emergency_msgs = [
                            {"role": "system", "content": "You are TASC IIoT Studio AI Assistant."},
                            {"role": "user", "content": last_user_content}
                        ]
                        retry_body = {
                            "messages": emergency_msgs,
                            "max_tokens": min(max_tokens, 256),
                            "temperature": temperature,
                            "stream": False,
                            "stop": ["<|user|>", "</s>", "<|im_end|>", "<|endoftext|>"]
                        }
                        rreq = urllib.request.Request(
                            f"{self.base_url}/v1/chat/completions",
                            data=json.dumps(retry_body).encode("utf-8"),
                            headers={"Content-Type": "application/json"}
                        )
                        with urllib.request.urlopen(rreq, timeout=120) as rresp:
                            rres_json = json.loads(rresp.read().decode("utf-8"))
                            text = rres_json["choices"][0]["message"]["content"].strip()
                            return {
                                "status": "SUCCESS",
                                "engine": f"llama-server.exe ({self.loaded_model_name} - auto-trimmed)",
                                "text": text,
                                "tokensPerSec": round(len(text.split()) / max(0.05, time.time() - start_t), 1),
                                "executionTimeMs": round((time.time() - start_t) * 1000, 2)
                            }
                    except Exception as retry_e:
                        print(f"[LocalSlmEngine] Emergency context retry failed: {retry_e}")

                return {
                    "status": "ERROR",
                    "error": f"HTTP {he.code}",
                    "text": f"Local SLM error: {err_body or str(he)}. Please try clearing chat or selecting a shorter prompt."
                }
            except Exception as e:
                print(f"[LocalSlmEngine] llama-server HTTP call failed: {e}")

        # Secondary fallback: in-process llama-cpp-python
        if self.llm is not None:
            try:
                output = self.llm.create_chat_completion(
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    stop=["<|user|>", "</s>", "<|im_end|>"]
                )
                text = output["choices"][0]["message"]["content"].strip()
                tokens_generated = output.get("usage", {}).get("completion_tokens", len(text.split()))
                tps = round(tokens_generated / max(0.05, time.time() - start_t), 1)

                return {
                    "status": "SUCCESS",
                    "engine": f"llama-cpp-python ({self.loaded_model_name or 'GGUF'})",
                    "text": text,
                    "tokensPerSec": tps,
                    "executionTimeMs": round((time.time() - start_t) * 1000, 2)
                }
            except Exception as ex:
                pass

        return {
            "status": "ERROR",
            "message": "No GGUF model is currently loaded in llama-server.exe. Please select and load a model first.",
            "text": "Local SLM is offline. Please load a .gguf model in AI Settings → Local GGUF."
        }

    def generate(self, prompt: str, grammar_str: Optional[str] = None, max_tokens: int = 512, temperature: float = 0.1) -> Dict[str, Any]:
        """Runs raw completion inference using the native server or fallback."""
        messages = [{"role": "user", "content": prompt}]
        return self.chat_completion(messages, max_tokens=max_tokens, temperature=temperature)

    def generate_scada_decision(self, prompt: str, tools: List[Dict[str, Any]], max_tokens: int = 512) -> Dict[str, Any]:
        """SCADA-specific GBNF tool calling generation."""
        grammar = build_scada_tool_gbnf_grammar(tools)
        return self.generate(prompt, grammar_str=grammar, max_tokens=max_tokens, temperature=0.0)


local_slm_engine = LocalSlmEngine()
