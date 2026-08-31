import urllib.request
import json
import time
import sys

def test_model(model_name):
    url = "http://localhost:1234/v1/chat/completions"
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": "You are an industrial SCADA assistant."},
            {"role": "user", "content": "State system status in 6 words."}
        ],
        "max_tokens": 40,
        "temperature": 0.2
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res = json.loads(response.read().decode('utf-8'))
            dt = time.time() - t0
            msg = res['choices'][0]['message']['content'].strip()
            return {"ok": True, "time": dt, "response": msg}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='ignore')
        return {"ok": False, "error": f"HTTP {e.code}: {err_msg}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

models_to_test = [
    # Small / lightweight models
    ("sentie1.0-3b-claude-fable-5-gpt5.2-sol-kimi-k3-glm-5.2", "Sentie 3.9B (Llama)"),
    ("google/gemma-4-e4b", "Gemma 4 E4B 7.5B (Official)"),
    ("gemma-4-e4b-it-ultra-uncensored-heretic", "Gemma 4 E4B Heretic 7.5B"),
    ("gemma-4-e4b-uncensored-hauhaucs-aggressive", "Gemma 4 E4B HauhauCS 7.5B"),
    ("zai-org/glm-4.6v-flash", "GLM 4.6V Flash 9.4B"),
    ("qwen/qwen3.5-9b", "Qwen 3.5 9B"),
    ("flux2-klein-9b-uncensored-text-encoder", "Flux2 Klein 9B Text Encoder"),
    ("glm-5.3-flash", "GLM 5.3 Flash (Problematic)"),
    ("muse-glimmer-30b", "Muse Glimmer (Problematic)")
]

print("=== STARTING MODEL INTEGRITY & CHAT VERIFICATION ===", flush=True)
for mid, label in models_to_test:
    print(f"\n>> Testing [{label}] (ID: {mid})...", flush=True)
    res = test_model(mid)
    if res["ok"]:
        print(f"   [PASS] {res['time']:.2f}s | Response: {res['response']}", flush=True)
    else:
        print(f"   [FAIL] Reason: {res['error']}", flush=True)
print("\n=== COMPLETED ALL TESTS ===", flush=True)
