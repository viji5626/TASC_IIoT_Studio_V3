import { AiProviderAdapter, ChatMessage, ImageAttachment } from './aiProviders/types';
import { AI_TOOL_DEFINITIONS, executeAiTool, getLiveContextSnapshot } from './aiTools';
import { TASC_SYSTEM_KNOWLEDGE } from './aiKnowledgeBase';

export const MAX_TOOL_ITERATIONS = 6;

export let chatSession: ChatMessage[] = [];

export function clearChatSession(): void {
  chatSession = [];
}

export function buildDynamicSystemPrompt(): string {
  const liveSnapshot = getLiveContextSnapshot();

  return `You are the TASC IIoT Studio AI Assistant — an intelligent, deeply context-aware industrial IoT, SCADA, and Web-HMI engineering copilot.
You have full comprehensive architectural knowledge of every module, UI/UX screen, side menu item, communication driver, tag manager, and system setting in TASC IIoT Studio, as well as real-time tool execution capabilities.

==================================================
TASC IIOT STUDIO COMPREHENSIVE KNOWLEDGE BASE
==================================================
${TASC_SYSTEM_KNOWLEDGE}

==================================================
REAL-TIME RUNTIME PROJECT CONTEXT SNAPSHOT
==================================================
${liveSnapshot}

==================================================
OPERATIONAL GUIDELINES:
==================================================
1. Context Awareness: You already know the exact state of this project from the snapshot above (drivers, total tags, bad/good quality count, dashboards, and alarms).
2. Deep Feature Familiarity:
   - When asked about Drivers, use \`get_driver_tags_detail\` or \`get_driver_diagnostics\` to inspect Modbus/OPC UA/Serial registers, live values, and health.
   - When asked about MQTT Topics or Tags, use \`get_tag_manager_detail\` to inspect the full topic tree and bindings.
   - When asked about Live Values, use \`get_live_tag_value\` or \`get_driver_tags_detail\`.
   - When asked about Settings / Modes, refer to the knowledge base and \`get_system_settings_and_info\`.
   - When asked about Alarms, use \`get_active_alarms\` or \`get_alarm_history\`.
3. Output Quality:
   - Always respond in the language used by the user (English, Hindi, etc.) unless instructed otherwise.
   - Present telemetry and status summaries in structured Markdown tables with clear status emojis (✅, ⚠️, ❌).
   - Be precise, accurate, safety-minded, and fast.

==================================================
RESPONSE DISCIPLINE (MANDATORY — FOLLOW STRICTLY):
==================================================
1. BE CONCISE: Max 3-5 sentences for simple queries. Use markdown tables for multi-row data. NO unnecessary elaboration.
2. NEVER HALLUCINATE: If a tool returns no result or data is missing, say "not found" or "no data available". NEVER invent panel names, tag values, driver details, or features.
3. NEVER REPEAT THE QUESTION back to the user.
4. YES/NO QUESTIONS: Lead with the direct answer, then 1 line of evidence.
5. DO NOT describe features the user didn't ask about. Stay on-topic.
6. TOOL USAGE — SNAPSHOT FIRST: The live snapshot above ALREADY contains driver count/status, tag counts (good/bad), alarm count, dashboard list, and user role. Answer directly from the snapshot for summary questions. Call tools ONLY when you need:
   - Individual tag live values (use get_live_tag_value)
   - Tag-level register/address inspection (use get_driver_tags_detail)
   - Historical data queries (use query_historian)
   - Alarm history log (use get_alarm_history)
   - Deep topic tree analysis (use get_tag_manager_detail)
7. TABLES: When listing 3+ items, ALWAYS use a markdown table. Keep columns minimal and relevant.
8. NO FILLER PHRASES: Do not say "Sure!", "Great question!", "Let me help you with that!", "Absolutely!", or any filler. Start directly with the answer.
9. DO NOT OUTPUT INTERNAL SCRATCHPAD OR THINKING PROCESS AS PART OF THE FINAL ANSWER. Always give the final user answer directly.`;
}

export function sanitizeModelResponseText(text: string): { cleanText: string; thoughtProcess?: string } {
  if (!text) return { cleanText: '' };

  let thoughtProcess: string | undefined = undefined;
  let cleanText = text;

  // 1. Extract explicit <think>...</think> tags if present (e.g. DeepSeek R1, Nemotron, Qwen)
  const thinkMatch = cleanText.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    thoughtProcess = thinkMatch[1].trim();
    cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
  }

  // 2. Handle unclosed <think> tag if stream was cut
  if (cleanText.includes('<think>')) {
    const parts = cleanText.split('<think>');
    cleanText = parts[0].trim();
    thoughtProcess = (thoughtProcess ? thoughtProcess + '\n' : '') + parts.slice(1).join('').trim();
  }

  // 3. Extract raw "Here's a thinking process:" / "Thinking process:" scratchpad blocks if model wrote it as markdown
  const rawThinkingMatch = cleanText.match(/^(?:Here's a thinking process|Thinking process|Thought process):[\s\S]*?\n\n([\s\S]+)$/i);
  if (rawThinkingMatch && rawThinkingMatch[1]?.trim()) {
    thoughtProcess = (thoughtProcess ? thoughtProcess + '\n' : '') + cleanText.slice(0, cleanText.indexOf(rawThinkingMatch[1])).trim();
    cleanText = rawThinkingMatch[1].trim();
  }

  return {
    cleanText: cleanText.trim() || text.trim(),
    thoughtProcess
  };
}

export async function runAiTurn(
  userMessage: string,
  adapter: AiProviderAdapter,
  onDelta: (delta: string) => void,
  onToolActivity: (toolName: string | null) => void,
  signal?: AbortSignal,
  images?: ImageAttachment[]
): Promise<void> {
  const turnStartMs = Date.now();
  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Update dynamic system prompt with fresh live snapshot
  const dynamicSystemPrompt = buildDynamicSystemPrompt();
  if (chatSession.length === 0 || chatSession[0].role !== 'system') {
    chatSession = [{ role: 'system', content: dynamicSystemPrompt }, ...chatSession.filter(m => m.role !== 'system')];
  } else {
    chatSession[0].content = dynamicSystemPrompt;
  }

  // Append user message if provided
  if (userMessage.trim() || (images && images.length > 0)) {
    chatSession.push({
      role: 'user',
      content: userMessage.trim(),
      images: images && images.length > 0 ? images : undefined,
      timestamp: timeString
    });
  }

  // Sliding window: trim history to prevent context overflow and drift.
  const MAX_HISTORY_MESSAGES = 24;
  if (chatSession.length > MAX_HISTORY_MESSAGES + 1) {
    const systemMsg = chatSession[0];
    const recentMessages = chatSession.slice(-MAX_HISTORY_MESSAGES);
    chatSession = [systemMsg, ...recentMessages];
  }

  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    if (signal?.aborted) {
      chatSession.push({
        role: 'assistant',
        content: '[Request cancelled by user]',
        timestamp: timeString,
        responseTimeMs: Date.now() - turnStartMs
      });
      return;
    }

    let currentTurnText = '';
    let pendingToolCalls: Array<{ id: string; name: string; arguments: string }> | undefined = undefined;

    try {
      const stream = adapter.sendStream(chatSession, AI_TOOL_DEFINITIONS, signal);

      for await (const chunk of stream) {
        if (signal?.aborted) {
          chatSession.push({
            role: 'assistant',
            content: currentTurnText + ' [Cancelled]',
            timestamp: timeString,
            responseTimeMs: Date.now() - turnStartMs
          });
          return;
        }

        if (chunk.delta) {
          currentTurnText += chunk.delta;
          const { cleanText } = sanitizeModelResponseText(currentTurnText);
          onDelta(cleanText || currentTurnText);
        }

        if (chunk.toolCalls) {
          pendingToolCalls = chunk.toolCalls;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        chatSession.push({
          role: 'assistant',
          content: currentTurnText + ' [Cancelled]',
          timestamp: timeString,
          responseTimeMs: Date.now() - turnStartMs
        });
        return;
      }
      throw err;
    }

    // If model made tool calls, execute them and continue the multi-turn loop
    if (pendingToolCalls && pendingToolCalls.length > 0) {
      // Store tool-calling assistant message with content: '' to keep context clean for next turn
      chatSession.push({
        role: 'assistant',
        content: '',
        toolCalls: pendingToolCalls
      });

      // Execute each tool call
      for (const call of pendingToolCalls) {
        onToolActivity(call.name);
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          parsedArgs = {};
        }

        const toolResult = await executeAiTool(call.name, parsedArgs);

        chatSession.push({
          role: 'tool',
          toolName: call.name,
          toolCallId: call.id,
          content: toolResult
        });
      }

      onToolActivity(null);
      // Loop continues with tool outputs feeding back to model
    } else {
      // Turn is complete with final text
      let rawFinalText = currentTurnText.trim();
      if (!rawFinalText) {
        const lastToolMsg = [...chatSession].reverse().find(m => m.role === 'tool');
        if (lastToolMsg?.content) {
          rawFinalText = String(lastToolMsg.content);
        } else {
          rawFinalText = 'No text response received from model. Please verify model status in Settings.';
        }
      }

      const { cleanText, thoughtProcess } = sanitizeModelResponseText(rawFinalText);

      chatSession.push({
        role: 'assistant',
        content: cleanText || rawFinalText,
        thoughtProcess,
        timestamp: timeString,
        responseTimeMs: Date.now() - turnStartMs
      });
      break;
    }
  }

  // Guard: If loop exited without a valid non-empty assistant response
  const lastMsg = chatSession[chatSession.length - 1];
  if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content?.trim()) {
    const lastToolMsg = [...chatSession].reverse().find(m => m.role === 'tool');
    let fallbackText = '';
    if (lastToolMsg?.content) {
      fallbackText = String(lastToolMsg.content);
    } else {
      fallbackText = 'Completed with no text response from model.';
    }

    chatSession.push({
      role: 'assistant',
      content: fallbackText,
      timestamp: timeString,
      responseTimeMs: Date.now() - turnStartMs
    });
  }
}
