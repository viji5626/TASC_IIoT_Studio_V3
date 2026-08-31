import { AiProviderAdapter, ChatMessage, ImageAttachment } from './aiProviders/types';
import { AI_TOOL_DEFINITIONS, getRelevantAiTools, executeAiTool, getLiveContextSnapshot, getAiToolsContext } from './aiTools';
import { TASC_SYSTEM_KNOWLEDGE } from './aiKnowledgeBase';
import { gatherMultiAgentEvidence, emitAgentActivity } from './aiMultiAgentEngine';
import { recordQueryPattern } from './aiMemoryStore';
import { selectAdaptiveModel, verifyResponseRelevancy, AdaptiveRoutingDecision } from './aiAdaptiveRouter';

export const MAX_TOOL_ITERATIONS = 6;

export let chatSession: ChatMessage[] = [];

export function clearChatSession(): void {
  chatSession = [];
}

export function buildDynamicSystemPrompt(extraLearnedEvidence?: string): string {
  const liveSnapshot = getLiveContextSnapshot();

  let prompt = `You are the TASC IIoT Studio AI Assistant — an intelligent, deeply context-aware industrial IoT, SCADA, and Web-HMI engineering copilot.
You have full comprehensive architectural knowledge of every module, UI/UX screen, side menu item, communication driver, tag manager, and system setting in TASC IIoT Studio, as well as real-time tool execution capabilities.

==================================================
TASC IIOT STUDIO COMPREHENSIVE KNOWLEDGE BASE
==================================================
${TASC_SYSTEM_KNOWLEDGE}

==================================================
REAL-TIME RUNTIME PROJECT CONTEXT SNAPSHOT
==================================================
${liveSnapshot}`;

  if (extraLearnedEvidence) {
    prompt += `\n\n==================================================
LEARNED PLANT KNOWLEDGE & SPECIALIST EVIDENCE
==================================================
${extraLearnedEvidence}`;
  }

  prompt += `\n\n==================================================
OPERATIONAL GUIDELINES:
==================================================
1. Context Awareness: You already know the exact state of this project from the snapshot and specialist evidence above (drivers, total tags, bad/good quality count, dashboards, alarms, and learned plant SOP rules).
2. Deep Feature Familiarity:
   - When asked about Drivers, use \`get_driver_tags_detail\` or \`get_driver_diagnostics\` to inspect Modbus/OPC UA/Serial registers, live values, and health.
   - When asked about MQTT Topics or Tags, use \`get_tag_manager_detail\` to inspect the full topic tree and bindings.
   - When asked about Live Values, use \`get_live_tag_value\` or \`get_driver_tags_detail\`.
   - When asked to remember plant SOPs or rules, use \`remember_plant_knowledge\`.
   - When asked to remember tag aliases or nicknames, use \`learn_tag_alias\`.
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
9. DO NOT OUTPUT INTERNAL SCRATCHPAD OR THINKING PROCESS AS PART OF THE FINAL ANSWER. Always give the final user answer directly.
10. STRICT 3D & VISUAL GENERATION RULE: NEVER invoke 'generate_3d_asset' or 'generate_industrial_image' unless the user EXPLICITLY asks to generate, design, or create a 3D model/equipment or draw a schematic diagram. For answering general questions, summaries, alarms, tags, drivers, or general information, ALWAYS answer directly in text and markdown tables without generating 3D models or images.

==================================================
REPORT GENERATION WORKFLOW (MANDATORY):
==================================================
When a user asks to generate a report (any phrasing like "give me a report", "generate report", "export data report", "create analysis report"):
STEP 1 — Call \`suggest_report_additions\` FIRST. Assess the request and provide EXACTLY 3 smart suggestions the user may not have considered but that would make the report more insightful. Examples: energy deviation analysis, benchmark comparison vs. last week, OEE efficiency score, cross-tag correlation, alarm rate trend, peak demand analysis, equipment runtime hours, etc. Each suggestion must have: id (1/2/3), title (short), description (1-2 sentences explaining value).
STEP 2 — In your response AFTER calling suggest_report_additions, tell the user: "I have prepared 3 enhancement suggestions for your report. Please select which to include — type '1', '2', '3', '1 and 2', 'all 3', etc. Or reply 'none' to proceed with just the base data."
STEP 3 — WAIT for user's selection reply. After they reply selecting suggestions, call \`generate_report\` with the final combined tag list, resolution, and write concise aiSummary and aiResults text.
STEP 4 — Tell the user the report is generating and a download link will appear.
NEVER skip the suggestion step. NEVER call generate_report without first calling suggest_report_additions and receiving user selection.`;

  return prompt;
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

export interface RunAiTurnOptions {
  availableModels?: string[];
  isAutoAdaptive?: boolean;
  adapterFactory?: (modelName: string, tierConfig?: { temperature: number; contextLength: number }) => AiProviderAdapter;
}

export async function runAiTurn(
  userMessage: string,
  adapter: AiProviderAdapter,
  onDelta: (delta: string) => void,
  onToolActivity: (toolName: string | null) => void,
  signal?: AbortSignal,
  images?: ImageAttachment[],
  options?: RunAiTurnOptions
): Promise<void> {
  const turnStartMs = Date.now();
  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Run deterministic multi-agent specialists to collect evidence in <5ms
  const ctx = getAiToolsContext();
  let multiAgentEvidence = '';
  if (ctx && userMessage.trim()) {
    try {
      multiAgentEvidence = await gatherMultiAgentEvidence(userMessage, ctx);
      recordQueryPattern(userMessage, 'general', []);
    } catch (e) {
      console.warn('[AiOrchestrator] Multi-agent gathering error:', e);
    }
  }

  // 2. Pre-Flight Auto-Adaptive Model & Hyperparameter Routing
  let activeAdapter = adapter;
  let routingDecision: AdaptiveRoutingDecision | null = null;
  const isAutoMode = options?.isAutoAdaptive || adapter.model === 'auto' || adapter.model === 'auto-adaptive';

  if (isAutoMode) {
    routingDecision = selectAdaptiveModel(
      adapter.id as any,
      adapter.model || 'auto',
      userMessage,
      options?.availableModels || [],
      Boolean(images && images.length > 0)
    );

    emitAgentActivity(
      'supervisor',
      'Auto-Adaptive Router',
      'completed',
      `${routingDecision.tierLabel} → ${routingDecision.selectedModel} (${routingDecision.reason})`
    );

    if (options?.adapterFactory && routingDecision.selectedModel) {
      activeAdapter = options.adapterFactory(routingDecision.selectedModel, {
        temperature: routingDecision.temperature,
        contextLength: routingDecision.contextLength
      });
    }
  }

  // 3. Update dynamic system prompt with fresh live snapshot & specialist evidence
  const dynamicSystemPrompt = buildDynamicSystemPrompt(multiAgentEvidence);
  if (chatSession.length === 0 || chatSession[0].role !== 'system') {
    chatSession = [{ role: 'system', content: dynamicSystemPrompt }, ...chatSession.filter(m => m.role !== 'system')];
  } else {
    chatSession[0].content = dynamicSystemPrompt;
  }

  // 4. Append user message if provided
  if (userMessage.trim() || (images && images.length > 0)) {
    chatSession.push({
      role: 'user',
      content: userMessage.trim(),
      images: images && images.length > 0 ? images : undefined,
      timestamp: timeString
    });
  }

  // Sliding window: trim history to fit model context
  const MAX_HISTORY_MESSAGES = routingDecision?.contextLength && routingDecision.contextLength <= 2048 ? 12 : 24;
  if (chatSession.length > MAX_HISTORY_MESSAGES + 1) {
    const systemMsg = chatSession[0];
    const recentMessages = chatSession.slice(-MAX_HISTORY_MESSAGES);
    chatSession = [systemMsg, ...recentMessages];
  }

  let iterations = 0;
  let hasEscalated = false;

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
    let currentTurnReasoning = '';
    let pendingToolCalls: Array<{ id: string; name: string; arguments: string }> | undefined = undefined;

    try {
      const relevantTools = getRelevantAiTools(userMessage);
      const stream = activeAdapter.sendStream(chatSession, relevantTools, signal);

      for await (const chunk of stream) {
        if (signal?.aborted) {
          chatSession.push({
            role: 'assistant',
            content: (currentTurnText || currentTurnReasoning) + ' [Cancelled]',
            timestamp: timeString,
            responseTimeMs: Date.now() - turnStartMs
          });
          return;
        }

        if (chunk.reasoningDelta) {
          currentTurnReasoning += chunk.reasoningDelta;
          if (!currentTurnText) {
            onDelta(`💭 *Thinking...*\n\n${currentTurnReasoning}`);
          }
        }

        const textChunk = chunk.delta || (chunk as any).textDelta;
        if (textChunk) {
          currentTurnText += textChunk;
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
          content: (currentTurnText || currentTurnReasoning) + ' [Cancelled]',
          timestamp: timeString,
          responseTimeMs: Date.now() - turnStartMs
        });
        return;
      }

      // OOM Auto-Recovery: GPU out-of-memory → retry with smallest available model in CPU mode
      const isOomError = err.message && (
        err.message.includes('[OOM]') ||
        err.message.toLowerCase().includes('out-of-memory') ||
        err.message.toLowerCase().includes('alloc_buffer') ||
        err.message.toLowerCase().includes('ggml_backend') ||
        err.message.toLowerCase().includes('cuda_host') ||
        err.message.toLowerCase().includes('failed to allocate')
      );

      if (isOomError && !hasEscalated && options?.adapterFactory && (options?.availableModels?.length || 0) > 0) {
        hasEscalated = true;
        const smallestModel = options.availableModels!.find(m => {
          const l = m.toLowerCase();
          return l.includes('1b') || l.includes('1.5b') || l.includes('2b') || l.includes('3b') || l.includes('mini') || l.includes('phi');
        }) || options.availableModels![0];

        emitAgentActivity(
          'supervisor',
          'OOM Recovery',
          'running',
          `⚠️ GPU memory exhausted. Auto-switching to lightweight model "${smallestModel}" in CPU mode...`
        );

        onDelta(`⚠️ **GPU Memory Error** — The selected model is too large for your GPU.\nAuto-switching to a smaller model (${smallestModel}) in CPU-only mode...\n\n`);
        activeAdapter = options.adapterFactory(smallestModel, { temperature: 0.1, contextLength: 2048 });
        // Remove the failed user message echo and retry
        currentTurnText = '';
        currentTurnReasoning = '';
        continue;
      }

      throw err;
    }

    // If model made tool calls, execute them and continue the multi-turn loop
    if (pendingToolCalls && pendingToolCalls.length > 0) {
      chatSession.push({
        role: 'assistant',
        content: '',
        toolCalls: pendingToolCalls
      });

      for (const call of pendingToolCalls) {
        onToolActivity(call.name);
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          parsedArgs = {};
        }

        const toolResult = await executeAiTool(call.name, parsedArgs, userMessage);

        chatSession.push({
          role: 'tool',
          toolName: call.name,
          toolCallId: call.id,
          content: toolResult
        });
      }

      onToolActivity(null);
    } else {
      // Turn is complete with text
      let rawFinalText = currentTurnText.trim();
      if (!rawFinalText && currentTurnReasoning.trim()) {
        rawFinalText = currentTurnReasoning.trim();
      }
      if (!rawFinalText) {
        const lastToolMsg = [...chatSession].reverse().find(m => m.role === 'tool');
        if (lastToolMsg?.content) {
          rawFinalText = String(lastToolMsg.content);
        } else {
          rawFinalText = 'No text response received from model. Please verify model status in Settings.';
        }
      }

      const { cleanText, thoughtProcess } = sanitizeModelResponseText(rawFinalText);

      // Post-Generation Relevancy Verification Guard
      const relevancy = verifyResponseRelevancy(userMessage, cleanText);

      // If response failed integrity/relevancy and we haven't retried yet in auto mode, escalate once
      if (relevancy.shouldEscalate && !hasEscalated && isAutoMode && options?.adapterFactory && (options?.availableModels?.length || 0) > 1) {
        hasEscalated = true;
        emitAgentActivity(
          'supervisor',
          'Relevancy Guard',
          'running',
          `Response flagged (${relevancy.reason}). Auto-escalating to high-precision reasoning model...`
        );

        // Pick highest capability model
        const heavyModel = options!.availableModels!.find(m => m.includes('12b') || m.includes('14b') || m.includes('32b') || m.includes('mistral') || m.includes('gpt-4o') || m.includes('flash')) || options!.availableModels![0];
        activeAdapter = options!.adapterFactory(heavyModel, { temperature: 0.2, contextLength: 8192 });
        continue;
      }

      chatSession.push({
        role: 'assistant',
        content: relevancy.cleanedText || cleanText || rawFinalText,
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
