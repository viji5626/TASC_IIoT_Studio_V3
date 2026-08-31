import urllib.request
import json
import time

models = [
    'sentie1.0-3b-claude-fable-5-gpt5.2-sol-kimi-k3-glm-5.2',
    'glm-5.3-flash',
    'muse-glimmer-30b',
    'google/gemma-4-e4b',
    'gemma-4-e4b-it-ultra-uncensored-heretic',
    'gemma-4-e4b-uncensored-hauhaucs-aggressive',
    'zai-org/glm-4.6v-flash',
    'qwen/qwen3.5-9b',
    'flux2-klein-9b-uncensored-text-encoder'
]

results = []

for m in models:
    print(f"\n--- Testing: {m} ---")
    url = "http://localhost:1234/v1/chat/completions"
    data = json.dumps({
        "model": m,
        "messages": [{"role": "user", "content": "Industrial telemetry status check. Reply in 5 words."}],
        "max_tokens": 50,
        "temperature": 0.2
    }).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    start_t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            elapsed = time.time() - start_t
            res_json = json.loads(resp.read().decode('utf-8'))
            reply = res_json['choices'][0]['message']['content']
            print(f"[SUCCESS] ({elapsed:.2f}s): {repr(reply.strip())}")
            results.append({"model": m, "status": "SUCCESS", "reply": reply.strip(), "elapsed": elapsed})
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='ignore')
        print(f"[FAILED] (HTTP {e.code}): {err_body}")
        results.append({"model": m, "status": "FAILED", "error": f"HTTP {e.code}: {err_body}"})
    except Exception as e:
        print(f"[ERROR]: {e}")
        results.append({"model": m, "status": "ERROR", "error": str(e)})

print("\n\n================ SUMMARY ================")
for r in results:
    if r['status'] == 'SUCCESS':
        print(f"[PASS] {r['model']} ({r['elapsed']:.2f}s)")
    else:
        print(f"[FAIL] {r['model']} -> {r.get('error', '')}")
