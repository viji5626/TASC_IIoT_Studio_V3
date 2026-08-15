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

export function parseApiSnippet(snippet: string): ParsedSnippet {
  const result: ParsedSnippet = {
    warnings: []
  };

  if (!snippet || !snippet.trim()) {
    return result;
  }

  const raw = snippet.trim();

  // 1. Extract Base URL
  // Match base_url="..." or baseURL: "..." or url "..." or curl url
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
  // Match api_key="..." or apiKey: "..." or Authorization: Bearer ...
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

  // 5. Extract extra_body / payload if present
  const extraBodyMatch = raw.match(/extra_body\s*=\s*({[\s\S]+?})/);
  if (extraBodyMatch) {
    try {
      // Clean python-style dict or JSON
      const jsonCandidate = extraBodyMatch[1].replace(/'/g, '"');
      JSON.parse(jsonCandidate);
      result.extraBodyJson = jsonCandidate;
    } catch {}
  }

  return result;
}
