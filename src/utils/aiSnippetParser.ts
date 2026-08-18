/**
 * Paste-and-parse utility for OpenAI / NVIDIA NIM / Custom Provider API code snippets.
 * Supports Python, curl, and JavaScript/TypeScript snippets.
 */

export interface ParsedSnippet {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  extraBodyJson?: string;
  warnings: string[];
}

function extractBalancedDictOrJson(raw: string, keyName: string): string | undefined {
  const keyRegex = new RegExp(`\\b${keyName}\\s*[:=]`, 'i');
  const match = raw.match(keyRegex);
  if (!match || match.index === undefined) return undefined;

  const startSearchIdx = match.index + match[0].length;
  const startIdx = raw.indexOf('{', startSearchIdx);
  if (startIdx === -1 || startIdx - startSearchIdx > 15) return undefined;

  let depth = 0;
  let inString = false;
  let quoteChar = '';
  let escape = false;

  for (let i = startIdx; i < raw.length; i++) {
    const char = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (inString) {
      if (char === quoteChar) {
        inString = false;
      }
    } else {
      if (char === '"' || char === "'") {
        inString = true;
        quoteChar = char;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          const candidate = raw.slice(startIdx, i + 1);
          // Convert Python dictionary syntax to valid JSON
          const normalized = candidate
            .replace(/:\s*True\b/g, ': true')
            .replace(/:\s*False\b/g, ': false')
            .replace(/:\s*None\b/g, ': null')
            .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
            .replace(/,\s*([}\]])/g, '$1');

          try {
            JSON.parse(normalized);
            return normalized;
          } catch {
            try {
              const simpleReplace = candidate.replace(/'/g, '"').replace(/:\s*True\b/g, ': true').replace(/:\s*False\b/g, ': false');
              JSON.parse(simpleReplace);
              return simpleReplace;
            } catch {
              return candidate;
            }
          }
        }
      }
    }
  }
  return undefined;
}

export function parseApiSnippet(snippet: string): ParsedSnippet {
  const result: ParsedSnippet = {
    warnings: []
  };

  if (!snippet || !snippet.trim()) {
    return result;
  }

  const raw = snippet.trim();

  // 1. Extract Base URL
  const baseUrlMatch =
    raw.match(/base_url\s*=\s*["']([^"']+)["']/i) ||
    raw.match(/baseURL\s*:\s*["']([^"']+)["']/i) ||
    raw.match(/https?:\/\/[^\s"'`]+\/v1/i) ||
    raw.match(/curl\s+(?:-X\s+\w+\s+)?["']?(https?:\/\/[^\s"'`]+)/i);

  if (baseUrlMatch) {
    let url = baseUrlMatch[1] || baseUrlMatch[0];
    if (url.includes('/chat/completions')) {
      url = url.replace(/\/chat\/completions.*$/, '');
    }
    result.baseUrl = url.trim();
  }

  // 2. Extract API Key
  const apiKeyMatch =
    raw.match(/api_key\s*=\s*["']([^"']+)["']/i) ||
    raw.match(/apiKey\s*:\s*["']([^"']+)["']/i) ||
    raw.match(/Bearer\s+([a-zA-Z0-9_\-.$]+)/i) ||
    raw.match(/Authorization:\s*["']?Bearer\s+([^"'\s]+)/i);

  if (apiKeyMatch) {
    const key = apiKeyMatch[1].trim();
    result.apiKey = key;

    // Check for placeholder patterns
    if (
      key.includes('YOUR_API_KEY') ||
      key.includes('<API_KEY>') ||
      key.includes('INSERT_KEY_HERE') ||
      key === 'sk-...' ||
      key === 'nvapi-...'
    ) {
      result.warnings.push('Placeholder API Key detected. Please replace it with your actual key.');
    }
  }

  // 3. Extract Model
  const modelMatch =
    raw.match(/model\s*=\s*["']([^"']+)["']/i) ||
    raw.match(/model\s*:\s*["']([^"']+)["']/i) ||
    raw.match(/"model"\s*:\s*["']([^"']+)["']/i);

  if (modelMatch) {
    result.model = modelMatch[1].trim();
  }

  // 4. Extract numeric parameters
  const tempMatch =
    raw.match(/temperature\s*=\s*([0-9.]+)/i) ||
    raw.match(/temperature\s*:\s*([0-9.]+)/i) ||
    raw.match(/"temperature"\s*:\s*([0-9.]+)/i);
  if (tempMatch) {
    result.temperature = parseFloat(tempMatch[1]);
  }

  const maxTokensMatch =
    raw.match(/max_tokens\s*=\s*([0-9]+)/i) ||
    raw.match(/maxTokens\s*:\s*([0-9]+)/i) ||
    raw.match(/"max_tokens"\s*:\s*([0-9]+)/i);
  if (maxTokensMatch) {
    result.maxTokens = parseInt(maxTokensMatch[1], 10);
  }

  const topPMatch =
    raw.match(/top_p\s*=\s*([0-9.]+)/i) ||
    raw.match(/topP\s*:\s*([0-9.]+)/i) ||
    raw.match(/"top_p"\s*:\s*([0-9.]+)/i);
  if (topPMatch) {
    result.topP = parseFloat(topPMatch[1]);
  }

  // 5. Extract extra_body / payload if present (handles nested dicts with Python True/False/None)
  const extraBodyJson = extractBalancedDictOrJson(raw, 'extra_body');
  if (extraBodyJson) {
    result.extraBodyJson = extraBodyJson;
  }

  return result;
}
