import subprocess
import urllib.request
import json
import time
import sys

def run_lms_load(model_id):
    print(f"--> [LM Studio] Loading {model_id} via lms CLI...", flush=True)
    try:
        res = subprocess.run(["lms", "load", model_id, "--ttl", "3600"], capture_output=True, text=True, errors="replace", timeout=120)
        if res.returncode != 0:
            return False, res.stderr or res.stdout
        return True, res.stdout
    except Exception as e:
        return False, str(e)

def chat_test(model_id, prompt="Give a 1-sentence status of SCADA telemetry."):
    url = "http://localhost:1234/v1/chat/completions"
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": "You are a SCADA industrial automation assistant."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 80,
        "temperature": 0.2
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            res = json.loads(response.read().decode('utf-8'))
            dt = time.time() - t0
            msg = res['choices'][0]['message']['content'].strip()
            return True, dt, msg
    except urllib.error.HTTPError as e:
        err = e.read().decode('utf-8', errors='ignore')
        return False, 0, f"HTTP {e.code}: {err}"
    except Exception as e:
        return False, 0, str(e)

small_models = [
    ("sentie1.0-3b-claude-fable-5-gpt5.2-sol-kimi-k3-glm-5.2", "Sentie 3.9B Llama (Ultra-Light)"),
    ("google/gemma-4-e4b", "Google Gemma 4 E4B 7.5B"),
    ("gemma-4-e4b-it-ultra-uncensored-heretic", "Gemma 4 E4B Heretic 7.5B"),
    ("gemma-4-e4b-uncensored-hauhaucs-aggressive", "Gemma 4 E4B HauhauCS 7.5B"),
    ("zai-org/glm-4.6v-flash", "Zhipu GLM 4.6V Flash 9.4B"),
    ("qwen/qwen3.5-9b", "Qwen 3.5 9B"),
    ("flux2-klein-9b-uncensored-text-encoder", "Flux2 Klein 9B Text Encoder"),
    ("glm-5.3-flash", "GLM 5.3 Flash (Problematic)"),
    ("muse-glimmer-30b", "Muse Glimmer 30B (dflash)")
]

results = []

print("================================================================", flush=True)
print("     COMPREHENSIVE SMALL MODEL DIAGNOSTIC & VERIFICATION       ", flush=True)
print("================================================================", flush=True)

for mid, name in small_models:
    print(f"\n[MODEL]: {name} (ID: {mid})", flush=True)
    load_ok, load_out = run_lms_load(mid)
    if not load_ok:
        print(f"  [LOAD FAILED]: {load_out.strip()}", flush=True)
        results.append({
            "name": name,
            "id": mid,
            "load_status": "FAILED",
            "chat_status": "N/A",
            "reason": load_out.strip()
        })
        continue
    
    print("  [LOADED OK] Sending chat test...", flush=True)
    chat_ok, latency, reply = chat_test(mid)
    if chat_ok:
        print(f"  [CHAT SUCCESS] ({latency:.2f}s): {repr(reply)}", flush=True)
        results.append({
            "name": name,
            "id": mid,
            "load_status": "OK",
            "chat_status": "SUCCESS",
            "latency": f"{latency:.2f}s",
            "sample_response": reply
        })
    else:
        print(f"  [CHAT FAILED]: {reply}", flush=True)
        results.append({
            "name": name,
            "id": mid,
            "load_status": "OK",
            "chat_status": "FAILED",
            "reason": reply
        })

print("\n\n========================= FINAL REPORT =========================", flush=True)
with open("scratch/diagnostic_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)
print(json.dumps(results, indent=2), flush=True)
