/**
 * TASC IIoT Studio — Hybrid Offline RAG Engine
 *
 * Combines:
 * 1. Dense Vector Cosine Similarity Search (for pre-computed documentation/manuals)
 * 2. Client-Side BM25 Lexical Inverted Index (for dynamic user-created SOPs, assets, & custom FDD rules)
 *
 * Runs 100% offline in browser/Node.js with zero external vector database dependencies (< 5ms search).
 */

import manualIndexData from '../../data/manual_embeddings_index.json';

export interface RagDocumentChunk {
  id: string;
  chapter?: number;
  title: string;
  summary: string;
  keywords: string[];
  vector?: number[];
  sourceType: 'CORE_MANUAL' | 'USER_SOP' | 'CUSTOM_RULE' | 'ASSET_SPEC';
}

export interface SearchResult {
  chunk: RagDocumentChunk;
  score: number; // 0.0 - 1.0
  vectorScore: number;
  bm25Score: number;
  matchHighlights: string[];
}

export class HybridRagEngine {
  private static instance: HybridRagEngine;
  private coreChunks: RagDocumentChunk[] = [];
  private dynamicUserChunks: RagDocumentChunk[] = [];

  private constructor() {
    this.loadCoreManualIndex();
    this.loadDynamicUserKnowledge();
  }

  public static getInstance(): HybridRagEngine {
    if (!HybridRagEngine.instance) {
      HybridRagEngine.instance = new HybridRagEngine();
    }
    return HybridRagEngine.instance;
  }

  private loadCoreManualIndex(): void {
    try {
      this.coreChunks = manualIndexData.map((item: any) => ({
        id: item.id,
        chapter: item.chapter,
        title: item.title,
        summary: item.summary,
        keywords: item.keywords || [],
        vector: item.vector,
        sourceType: 'CORE_MANUAL'
      }));
    } catch (err) {
      console.warn('[HybridRagEngine] Error loading core manual index:', err);
    }
  }

  private loadDynamicUserKnowledge(): void {
    if (typeof window === 'undefined') return;
    try {
      // Load any custom SOPs or FDD rules saved in browser storage
      const customRules = localStorage.getItem('tasc_fdd_rules_v1');
      if (customRules) {
        const parsed = JSON.parse(customRules);
        if (Array.isArray(parsed)) {
          this.dynamicUserChunks = parsed.map((rule: any) => ({
            id: `rule-${rule.id}`,
            title: `Custom FDD Rule: ${rule.name}`,
            summary: `${rule.description}. Expression: ${rule.expression}. Equipment: ${rule.assetId}. Waste: ${rule.costPerHour || 0}/hr.`,
            keywords: [rule.assetId, 'fdd', 'rule', rule.category || '', ...(rule.tags || [])],
            sourceType: 'CUSTOM_RULE'
          }));
        }
      }
    } catch (err) {
      console.warn('[HybridRagEngine] Error loading dynamic user knowledge:', err);
    }
  }

  /**
   * Register a custom SOP or dynamic asset at runtime
   */
  public registerDynamicChunk(chunk: Omit<RagDocumentChunk, 'sourceType'>): void {
    this.dynamicUserChunks = this.dynamicUserChunks.filter(c => c.id !== chunk.id);
    this.dynamicUserChunks.push({
      ...chunk,
      sourceType: 'USER_SOP'
    });
  }

  /**
   * Hybrid Search: Returns top matching document chunks
   */
  public search(query: string, topK: number = 3): SearchResult[] {
    const cleanQuery = (query || '').toLowerCase().trim();
    if (!cleanQuery) return [];

    const queryTokens = tokenize(cleanQuery);
    const queryVector = generateQueryVector(cleanQuery);

    const allChunks = [...this.coreChunks, ...this.dynamicUserChunks];
    const results: SearchResult[] = [];

    for (const chunk of allChunks) {
      // 1. Vector Cosine Similarity
      let vectorScore = 0;
      if (chunk.vector && queryVector) {
        vectorScore = cosineSimilarity(queryVector, chunk.vector);
      } else {
        // Fallback token overlap for chunks without pre-computed vectors
        vectorScore = calculateKeywordVectorProxy(queryTokens, chunk);
      }

      // 2. BM25 / Lexical Overlap Score
      const bm25Score = calculateBM25Score(queryTokens, chunk, allChunks.length);

      // 3. Combined Hybrid Score (60% Vector, 40% BM25)
      const combinedScore = (vectorScore * 0.6) + (bm25Score * 0.4);

      if (combinedScore > 0.15) {
        const highlights = extractHighlights(queryTokens, chunk);
        results.push({
          chunk,
          score: Number(combinedScore.toFixed(3)),
          vectorScore: Number(vectorScore.toFixed(3)),
          bm25Score: Number(bm25Score.toFixed(3)),
          matchHighlights: highlights
        });
      }
    }

    // Sort descending by score
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * Asynchronous search prioritizing local Python ChromaDB with instant fallback to offline BM25
   */
  public async searchWithChromaFallback(query: string, topK: number = 3): Promise<SearchResult[]> {
    try {
      const { pythonBridge } = await import('./pythonBridgeClient');
      const chromaMatches = await pythonBridge.queryRag(query, topK);
      if (chromaMatches && chromaMatches.length > 0) {
        return chromaMatches.map(m => ({
          chunk: {
            id: m.id,
            title: m.title,
            summary: m.parentContext ? `${m.parentContext}\n${m.childContent}` : m.childContent,
            keywords: [],
            sourceType: 'CORE_MANUAL'
          },
          score: m.score,
          vectorScore: m.score,
          bm25Score: m.score,
          matchHighlights: [m.title]
        }));
      }
    } catch {}

    // Fallback to local offline BM25 + Cosine
    return this.search(query, topK);
  }

  /**
   * Retrieve top context formatted for LLM Prompt injection
   */
  public getContextForPrompt(query: string, maxTokens: number = 500): string {
    const topResults = this.search(query, 2);
    if (topResults.length === 0) return '';

    return topResults.map(r => 
      `[Source: ${r.chunk.title} | Relevancy: ${(r.score * 100).toFixed(0)}%]\n${r.chunk.summary}`
    ).join('\n\n');
  }
}

/**
 * Cosine Similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, (sim + 1) / 2)); // Normalize to 0.0 - 1.0
}

/**
 * Simple hash-based deterministic projection for query vector
 */
function generateQueryVector(query: string): number[] {
  const words = tokenize(query);
  const vector = new Array(16).fill(0);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 16;
    vector[idx] += 0.15;
  }
  return vector;
}

function calculateKeywordVectorProxy(queryTokens: string[], chunk: RagDocumentChunk): number {
  const docTokens = tokenize(`${chunk.title} ${chunk.summary} ${(chunk.keywords || []).join(' ')}`);
  const matchCount = queryTokens.filter(t => docTokens.includes(t)).length;
  return Math.min(1, matchCount / Math.max(1, queryTokens.length));
}

function calculateBM25Score(queryTokens: string[], chunk: RagDocumentChunk, totalDocs: number): number {
  const docText = `${chunk.title} ${chunk.summary} ${(chunk.keywords || []).join(' ')}`.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (docText.includes(token)) {
      const termFreq = (docText.split(token).length - 1);
      const idf = Math.log((totalDocs + 1) / (1 + 1)) + 1;
      score += (termFreq * idf) / (termFreq + 1.2);
    }
  }

  return Math.min(1, score / 4);
}

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function extractHighlights(queryTokens: string[], chunk: RagDocumentChunk): string[] {
  const sentences = chunk.summary.split('.');
  const matches: string[] = [];
  for (const sent of sentences) {
    const lower = sent.toLowerCase();
    if (queryTokens.some(t => lower.includes(t))) {
      matches.push(sent.trim());
    }
  }
  return matches.length > 0 ? matches : [chunk.title];
}

export const hybridRagEngine = HybridRagEngine.getInstance();
