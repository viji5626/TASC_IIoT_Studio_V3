/**
 * Pure utility functions for SSE stream decoding and delta tool call accumulation.
 */

export function parseSSELines(chunk: string): string[] {
  const lines = chunk.split(/\r?\n/);
  const dataLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      const payload = trimmed.slice(5).trim();
      if (payload && payload !== '[DONE]') {
        dataLines.push(payload);
      }
    }
  }

  return dataLines;
}

export function parseDeltaToolCalls(
  toolCallsDelta: Array<{
    index: number;
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }>,
  accumulated: Map<number, { id: string; name: string; arguments: string }>
): void {
  for (const call of toolCallsDelta) {
    const idx = call.index ?? 0;
    const existing = accumulated.get(idx) || { id: '', name: '', arguments: '' };

    if (call.id) {
      existing.id = call.id;
    }
    if (call.function?.name) {
      existing.name += call.function.name;
    }
    if (call.function?.arguments) {
      existing.arguments += call.function.arguments;
    }

    accumulated.set(idx, existing);
  }
}
