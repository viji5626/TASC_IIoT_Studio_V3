import subprocess
import urllib.request
import json
import time
import sys

GPU_VRAM_MB = 8188  # RTX 4060 8GB
USABLE_VRAM_MB = 6800 # Safe VRAM after OS/display buffer
SYSTEM_RAM_MB = 16000 # 16GB RAM

all_models = [
    {"id": "sentie1.0-3b-claude-fable-5-gpt5.2-sol-kimi-k3-glm-5.2", "name": "Sentie 3.9B Llama", "size_gb": 2.44, "params": "3.9B", "arch": "Llama"},
    {"id": "google/gemma-4-e4b", "name": "Google Gemma 4 E4B", "size_gb": 6.33, "params": "7.5B", "arch": "gemma4"},
    {"id": "gemma-4-e4b-it-ultra-uncensored-heretic", "name": "Gemma 4 E4B Heretic", "size_gb": 6.33, "params": "7.5B", "arch": "gemma4"},
    {"id": "gemma-4-e4b-uncensored-hauhaucs-aggressive", "name": "Gemma 4 E4B HauhauCS", "size_gb": 6.33, "params": "7.5B", "arch": "gemma4"},
    {"id": "qwen3.8-27b-uncensored-hauhaucs-aggressive-mtp", "name": "Qwen 3.8 27B MTP (Extreme Quant)", "size_gb": 1.83, "params": "27B", "arch": "qwen35"},
    {"id": "prism-ml/bonsai-27b", "name": "Bonsai 27B Q1_0", "size_gb": 4.73, "params": "27B", "arch": "qwen35"},
    {"id": "qwen/qwen3.5-9b", "name": "Qwen 3.5 9B", "size_gb": 6.55, "params": "9B", "arch": "qwen35"},
    {"id": "zai-org/glm-4.6v-flash", "name": "GLM 4.6V Flash", "size_gb": 7.95, "params": "9.4B", "arch": "glm4"},
    {"id": "flux2-klein-9b-uncensored-text-encoder", "name": "Flux2 Klein 9B Text Encoder", "size_gb": 8.71, "params": "9B", "arch": "qwen3", "special": "Diffusion Encoder"},
    {"id": "qwen/qwen3.8-27b", "name": "Qwen 3.8 27B Q4", "size_gb": 17.74, "params": "27B", "arch": "qwen35"},
    {"id": "nvidia-nemotron-3.5-lightning-30b-a3b", "name": "Nemotron 3.5 30B MoE", "size_gb": 24.52, "params": "30B", "arch": "nemotron_h_moe"},
    {"id": "glm-5.3-flash", "name": "GLM 5.3 Flash", "size_gb": 2.77, "params": "Unknown", "arch": "Unknown", "special": "Missing Base Weights"},
    {"id": "muse-glimmer-30b", "name": "Muse Glimmer 30B", "size_gb": 3.03, "params": "2.6B", "arch": "dflash", "special": "Draft Speculative Model"}
]

def classify_hardware_fit(model):
    if model.get("special") in ["Missing Base Weights", "Draft Speculative Model", "Diffusion Encoder"]:
        return "INCOMPATIBLE / SPECIALIZED", "N/A", "Model is a non-chat encoder, draft model, or missing weights."
    
    size_mb = model["size_gb"] * 1024
    if size_mb <= USABLE_VRAM_MB:
        return "FULL GPU OFFLOAD (100%)", "Tier 1: Ultra Fast (40-90 tok/s)", f"Fits completely in 8GB VRAM ({model['size_gb']:.2f}GB / ~6.8GB Usable VRAM)"
    elif size_mb <= (USABLE_VRAM_MB + 8000) and size_mb < (SYSTEM_RAM_MB - 3000):
        offload_pct = int((USABLE_VRAM_MB / size_mb) * 100)
        return f"PARTIAL GPU OFFLOAD (~{offload_pct}%)", "Tier 2: Balanced Hybrid (12-30 tok/s)", f"Spans {USABLE_VRAM_MB/1024:.1f}GB VRAM + {(size_mb - USABLE_VRAM_MB)/1024:.1f}GB System RAM"
    else:
        return "LIKELY TOO LARGE / CPU HEAVY", "Tier 3: Slow CPU Bottleneck (<8 tok/s)", f"Exceeds safe VRAM+RAM capacity ({model['size_gb']:.2f}GB vs 8GB VRAM / 16GB RAM)"

def unload_all():
    try:
        subprocess.run(["lms", "unload", "--all"], capture_output=True, text=True, timeout=30)
        time.sleep(1)
    except Exception:
        pass

def benchmark_model(model_id):
    unload_all()
    
    t_start_load = time.time()
    try:
        load_proc = subprocess.run(["lms", "load", model_id, "--ttl", "1800"], capture_output=True, text=True, errors="replace", timeout=60)
        load_time = time.time() - t_start_load
        if load_proc.returncode != 0:
            return {"loaded": False, "reason": load_proc.stderr or load_proc.stdout}
    except Exception as e:
        return {"loaded": False, "reason": str(e)}

    # Send benchmark chat
    test_prompt = "SCADA Telemetry Alert: Cooling pump 2 pressure dropped 35%. State immediate action in 15 words."
    url = "http://localhost:1234/v1/chat/completions"
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": "You are a SCADA industrial automation expert."},
            {"role": "user", "content": test_prompt}
        ],
        "max_tokens": 50,
        "temperature": 0.1
    }
    
    t0 = time.time()
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            dt = time.time() - t0
            reply = data['choices'][0]['message']['content'].strip()
            usage = data.get('usage', {})
            comp_tokens = usage.get('completion_tokens', len(reply.split()))
            tps = (comp_tokens / dt) if dt > 0 else 0
            
            return {
                "loaded": True,
                "load_time": f"{load_time:.2f}s",
                "chat_latency": f"{dt:.2f}s",
                "tokens_generated": comp_tokens,
                "speed_tps": f"{tps:.1f} tok/s",
                "reply": reply
            }
    except Exception as e:
        return {"loaded": True, "load_time": f"{load_time:.2f}s", "chat_error": str(e)}

print("================================================================================", flush=True)
print("       TASC IIoT - AUTO-SCORING & HARDWARE OFFLOAD BENCHMARK SUITE             ", flush=True)
print(f"       HARDWARE: NVIDIA RTX 4060 (8GB VRAM) | System RAM: 16GB DDR             ", flush=True)
print("================================================================================\n", flush=True)

final_scores = []

for m in all_models:
    fit_cat, tier, fit_desc = classify_hardware_fit(m)
    print(f"--> [MODEL]: {m['name']} ({m['size_gb']:.2f} GB | Arch: {m['arch']})", flush=True)
    print(f"    Category: {fit_cat}", flush=True)
    print(f"    Hardware Analysis: {fit_desc}", flush=True)
    
    bench_result = {}
    if "Tier 1" in tier or "Tier 2" in tier:
        print(f"    Testing live execution & throughput benchmark...", flush=True)
        res = benchmark_model(m["id"])
        if res.get("loaded") and "speed_tps" in res:
            print(f"    [PASS] Load: {res['load_time']} | TPS: {res['speed_tps']} | Latency: {res['chat_latency']}", flush=True)
            print(f"    Response: {repr(res['reply'])}", flush=True)
            bench_result = res
        elif res.get("loaded"):
            print(f"    [WARN] Loaded in {res.get('load_time')}, but Chat Error: {res.get('chat_error')}", flush=True)
            bench_result = res
        else:
            print(f"    [FAIL] Load Failed: {res.get('reason', '').strip()}", flush=True)
            bench_result = res
    else:
        print(f"    Skipping live execution test (Categorized as {fit_cat})", flush=True)
    
    final_scores.append({
        "id": m["id"],
        "name": m["name"],
        "size_gb": m["size_gb"],
        "params": m["params"],
        "arch": m["arch"],
        "category": fit_cat,
        "tier": tier,
        "fit_desc": fit_desc,
        "benchmark": bench_result
    })
    print("-" * 80, flush=True)

unload_all()

with open("scratch/auto_scoring_report.json", "w", encoding="utf-8") as f:
    json.dump(final_scores, f, indent=2)

print("\n\n>>> AUTO-SCORING COMPLETED. REPORT SAVED TO scratch/auto_scoring_report.json <<<", flush=True)
