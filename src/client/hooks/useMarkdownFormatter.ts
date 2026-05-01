import { useState, useCallback, useRef } from 'react';
import { CreateMLCEngine, MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';

interface FormatterState {
  status: 'idle' | 'downloading' | 'ready' | 'generating' | 'done' | 'error';
  progress: number;
  progressText: string;
  result: string;
  error: string | null;
  downloadSizeMB: number;
}

const SYSTEM_PROMPT = `You are a precise document formatter. Convert the provided text into clean Markdown.

Rules:
- Preserve ALL content. Do not add, remove, or summarize.
- Detect headings, lists, tables, and paragraphs. Use proper Markdown syntax.
- Fix obvious OCR artifacts only where clearly wrong.
- Output ONLY the formatted Markdown. No explanations.`;

const MAX_CONTEXT = 8192;
const SYSTEM_TOKENS = 250;
const CHUNK_OVERLAP_TOKENS = 200;
const TOKEN_CHARS_RATIO = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKEN_CHARS_RATIO);
}

function chunkText(text: string, maxTokens: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const combinedTokens = estimateTokens(currentChunk + '\n\n' + para);
    if (combinedTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export function useMarkdownFormatter() {
  const [state, setState] = useState<FormatterState>({
    status: 'idle',
    progress: 0,
    progressText: '',
    result: '',
    error: null,
    downloadSizeMB: 1050,
  });
  const engineRef = useRef<MLCEngine | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadModel = useCallback(async () => {
    if (engineRef.current) {
      setState((s) => ({ ...s, status: 'ready' }));
      return;
    }

    setState((s) => ({
      ...s,
      status: 'downloading',
      progress: 0,
      progressText: 'Starting download...',
      error: null,
    }));

    try {
      abortRef.current = new AbortController();

      const engine = await CreateMLCEngine(
        'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
        {
          initProgressCallback: (report: InitProgressReport) => {
            setState((s) => ({
              ...s,
              progress: report.progress,
              progressText: report.text,
            }));
          },
        },
        {
          temperature: 0.1,
          top_p: 0.95,
          context_window_size: MAX_CONTEXT,
        }
      );

      engineRef.current = engine;
      setState((s) => ({
        ...s,
        status: 'ready',
        progress: 1,
        progressText: 'Model loaded. Ready to format.',
      }));
    } catch (err: any) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err.message || 'Failed to load model',
        progress: 0,
      }));
    }
  }, []);

  const formatText = useCallback(async (rawText: string) => {
    const engine = engineRef.current;
    if (!engine) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: 'Model not loaded. Please load the model first.',
      }));
      return;
    }

    setState((s) => ({
      ...s,
      status: 'generating',
      result: '',
      error: null,
      progress: 0,
      progressText: 'Analyzing document...',
    }));

    try {
      const totalTokens = estimateTokens(rawText + SYSTEM_PROMPT);
      const chunkMaxTokens = MAX_CONTEXT - SYSTEM_TOKENS - CHUNK_OVERLAP_TOKENS;

      if (totalTokens <= chunkMaxTokens) {
        const response = await engine.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Format this text:\n\n${rawText}` },
          ],
          stream: false,
          max_tokens: 4096,
        });

        const formatted = response.choices[0]?.message?.content ?? '';
        setState((s) => ({ ...s, status: 'done', result: formatted }));
        return;
      }

      const chunks = chunkText(rawText, chunkMaxTokens);

      setState((s) => ({
        ...s,
        progressText: `Processing ${chunks.length} chunks...`,
        progress: 0,
      }));

      const results: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setState((s) => ({
          ...s,
          progress: i / chunks.length,
          progressText: `Processing chunk ${i + 1} of ${chunks.length}...`,
        }));

        const chunkPrefix = i > 0 ? 'Continue formatting the next section:\n\n' : 'Format this text:\n\n';

        const response = await engine.chat.completions.create({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `${chunkPrefix}${chunks[i]}` },
          ],
          stream: false,
          max_tokens: 4096,
        });

        const formatted = response.choices[0]?.message?.content ?? '';
        results.push(formatted);
      }

      const combined = results.join('\n\n');

      setState((s) => ({
        ...s,
        status: 'done',
        progress: 1,
        result: combined,
      }));
    } catch (err: any) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err.message || 'Failed to format text',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
      progressText: '',
      result: '',
      error: null,
      downloadSizeMB: 1050,
    });
  }, []);

  const dispose = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.unload();
      engineRef.current = null;
    }
    reset();
  }, [reset]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { state, loadModel, formatText, reset, dispose, abort };
}
