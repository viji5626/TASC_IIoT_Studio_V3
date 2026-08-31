import json
import time
import urllib.request
import urllib.error
import sys

OLLAMA_URL = "http://127.0.0.1:11434"

def get_ollama_models():
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            return [m["name"] for m in data.get("models", [])]
    except Exception as e:
        print(f"Error fetching models: {e}", flush=True)
        return []

def get_ollama_ps():
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/ps")
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception:
        return {}

def test_model(model_name: str, num_ctx: int = 4096, num_gpu: int = 99, num_thread: int = 8, temperature: float = 0.3):
    print(f"\n========================================================", flush=True)
    print(f"Testing Ollama Model: {model_name}", flush=True)
    print(f"Params: num_ctx={num_ctx}, num_gpu={num_gpu}, num_thread={num_thread}, temperature={temperature}", flush=True)
    print(f"========================================================", flush=True)

    payload = {
        "model": model_name,
        "messages": [
            {"role": "user", "content": "You are an industrial automation SCADA AI. Confirm system readiness in 1 short sentence."}
        ],
        "stream": False,
        "options": {
            "num_ctx": num_ctx,
            "num_gpu": num_gpu,
            "num_thread": num_thread,
            "temperature": temperature,
            "num_predict": 40
        }
    }

    start_time = time.time()
    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/chat",
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        
        with urllib.request.urlopen(req, timeout=40) as resp:
            elapsed = time.time() - start_time
            data = json.loads(resp.read().decode('utf-8'))
            
            # Check ps
            ps_info = get_ollama_ps()
            running_models = ps_info.get("models", [])
            active_info = next((m for m in running_models if m.get("name") == model_name or m.get("model") == model_name), {})
            
            content = data.get("message", {}).get("content", "").strip()
            eval_count = data.get("eval_count", 0)
            eval_duration_ns = data.get("eval_duration", 1)
            prompt_eval_count = data.get("prompt_eval_count", 0)
            
            tok_per_sec = (eval_count / (eval_duration_ns / 1e9)) if eval_duration_ns > 0 else 0
            
            size_vram = active_info.get("size_vram", 0)
            size_total = active_info.get("size", 0)
            size_vram_gb = size_vram / (1024**3)
            size_total_gb = size_total / (1024**3)
            
            # Determine offload
            if size_total > 0 and size_vram >= size_total * 0.95:
                offload_category = "Full GPU (100% VRAM)"
            elif size_vram > 0:
                pct = int((size_vram / size_total) * 100) if size_total > 0 else 0
                offload_category = f"Partial GPU ({pct}% VRAM / Hybrid)"
            elif "cloud" in model_name:
                offload_category = "Cloud API (Zero Local VRAM)"
            else:
                offload_category = "CPU Only"

            result = {
                "model": model_name,
                "status": "PASS",
                "elapsed_sec": round(elapsed, 2),
                "tok_per_sec": round(tok_per_sec, 2),
                "eval_tokens": eval_count,
                "prompt_tokens": prompt_eval_count,
                "vram_gb": round(size_vram_gb, 2),
                "total_gb": round(size_total_gb, 2),
                "offload_category": offload_category,
                "sample_output": content[:120]
            }
            print(f"-> SUCCESS: PASS | Speed: {result['tok_per_sec']} tok/s | VRAM: {result['vram_gb']}GB / {result['total_gb']}GB ({offload_category})", flush=True)
            print(f"-> Output: {content}", flush=True)
            return result

    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f"-> HTTP Error {e.code}: {err_msg}", flush=True)
        return {
            "model": model_name,
            "status": "FAIL",
            "error": f"HTTP {e.code}: {err_msg[:200]}"
        }
    except Exception as e:
        print(f"-> Execution Error: {e}", flush=True)
        return {
            "model": model_name,
            "status": "FAIL",
            "error": str(e)
        }

def main():
    models = get_ollama_models()
    # Put local models first, then cloud models
    local_models = [m for m in models if "cloud" not in m]
    cloud_models = [m for m in models if "cloud" in m]
    ordered_models = local_models + cloud_models

    print(f"Discovered {len(ordered_models)} models in Ollama: {ordered_models}", flush=True)
    
    results = []
    for model in ordered_models:
        res = test_model(model)
        results.append(res)
        time.sleep(1)

    with open("scratch/ollama_benchmark_report.json", "w") as f:
        json.dump(results, f, indent=2)
        
    print("\n================ BENCHMARK SUMMARY ================", flush=True)
    for r in results:
        if r["status"] == "PASS":
            print(f"✔ {r['model']:<30} | {r['tok_per_sec']:>6.1f} tok/s | {r['vram_gb']:>4.1f}GB VRAM | {r['offload_category']}", flush=True)
        else:
            print(f"❌ {r['model']:<30} | FAILED: {r.get('error', 'Unknown')}", flush=True)

if __name__ == "__main__":
    main()
