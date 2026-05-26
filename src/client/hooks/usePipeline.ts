import { useState, useCallback, useRef } from 'react';
import { pipeline } from '@xenova/transformers';

export interface Entity {
  entity_group: string;
  score: number;
  word: string;
  start: number;
  end: number;
}

interface PipelineStageDef {
  id: string;
  name: string;
  run: (input: string, onProgress?: (phase: string, pct: number) => void) => Promise<{ output: string; metadata?: Record<string, unknown> }>;
}

export interface StageResult {
  stageId: string;
  stageName: string;
  input: string;
  output: string;
  status: 'idle' | 'running' | 'done' | 'error';
  error?: string;
  metadata?: Record<string, unknown>;
  progressPhase?: string;
  progressPct?: number;
}

export interface PipelineState {
  stages: StageResult[];
  running: boolean;
}

function entityGroupLabel(group: string): string {
  switch (group) {
    case 'PER': return 'PERSON';
    case 'LOC': return 'LOCATION';
    case 'ORG': return 'ORGANIZATION';
    case 'MISC': return 'MISC';
    default: return group;
  }
}

export interface Redaction {
  original: string;
  replacement: string;
}

export function redactEntities(input: string, entities: Entity[]): { output: string; redactions: Redaction[] } {
  const seen = new Set<string>();
  const redactions: Redaction[] = [];

  for (const entity of entities) {
    const key = `${entity.start}-${entity.end}`;
    if (seen.has(key)) continue;
    seen.add(key);

    redactions.push({
      original: entity.word,
      replacement: `[${entityGroupLabel(entity.entity_group)}]`,
    });
  }

  redactions.sort((a, b) => input.indexOf(b.original) - input.indexOf(a.original));

  let output = input;
  for (const r of redactions) {
    output = output.replace(r.original, r.replacement);
  }

  return { output, redactions };
}

function createRedactionStage(): PipelineStageDef {
  let pipe: any = null;

  return {
    id: 'redaction',
    name: 'Entity Redaction',
    run: async (input: string, onProgress) => {
      if (!pipe) {
        onProgress?.('Downloading NER model...', 0);
        pipe = await pipeline('ner', 'Xenova/bert-base-NER', {
          progress_callback: (p: { status?: string; loaded?: number; total?: number }) => {
            if (p.status === 'progress' && p.loaded != null && p.total != null) {
              onProgress?.('Downloading NER model...', p.loaded / p.total);
            }
            if (p.status === 'done') {
              onProgress?.('Loading model...', 1);
            }
          },
        });
      } else {
        onProgress?.('Processing entities...', 0.5);
      }

      const entities: Entity[] = await pipe(input, {
        aggregation_strategy: 'simple',
      });

      onProgress?.('Redacting entities...', 1);

      const { output, redactions } = redactEntities(input, entities);

      return {
        output,
        metadata: {
          entitiesFound: entities.length,
          entityTypes: [...new Set(entities.map((e) => e.entity_group))],
          redactions,
        },
      };
    },
  };
}

interface PatternRule {
  label: string;
  regex: RegExp;
}

const PATTERNS: PatternRule[] = [
  { label: 'NRIC', regex: /[STFGMstfgm]\d{7}[A-Za-z]/g },
  { label: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: 'CREDIT_CARD', regex: /\b(?:\d{4}[- ]?){3}\d{4}\b/g },
  { label: 'ACCOUNT', regex: /\b\d{8,17}\b/g },
  { label: 'PHONE', regex: /(?:\b\d{3,4}[- .]\d{3,4}[- .]\d{4}\b|\(\d{3}\)\s?\d{3}[- .]\d{4})/g },
  { label: 'EMAIL', regex: /\b[\w.%-]+@[\w.-]+\.\w{2,}\b/g },
  { label: 'URL', regex: /https?:\/\/[^\s]+/g },
];

export function redactPatterns(input: string): { output: string; matches: Array<{ label: string; value: string }> } {
  const matches: Array<{ label: string; value: string }> = [];

  let output = input;
  for (const rule of PATTERNS) {
    const found = output.match(rule.regex);
    if (found) {
      for (const match of found) {
        matches.push({ label: rule.label, value: match });
      }
    }
    output = output.replace(rule.regex, `[${rule.label}]`);
  }

  return { output, matches };
}

function createPatternRedactionStage(): PipelineStageDef {
  return {
    id: 'pattern',
    name: 'Pattern Redaction',
    run: async (input: string, onProgress) => {
      onProgress?.('Scanning patterns...', 0);
      const { output, matches } = redactPatterns(input);
      onProgress?.('Done', 1);
      return {
        output,
        metadata: {
          patternsFound: matches.length,
          patternTypes: [...new Set(matches.map((m) => m.label))],
          patternMatches: matches,
        },
      };
    },
  };
}

const STAGE_DEFS: PipelineStageDef[] = [createRedactionStage(), createPatternRedactionStage()];

function createIdleStages(): StageResult[] {
  return STAGE_DEFS.map((def) => ({
    stageId: def.id,
    stageName: def.name,
    input: '',
    output: '',
    status: 'idle' as const,
  }));
}

export function usePipeline() {
  const stageDefs = useRef(STAGE_DEFS);

  const [state, setState] = useState<PipelineState>({
    stages: createIdleStages(),
    running: false,
  });

  const runAll = useCallback(async (input: string) => {
    const idleStages = createIdleStages();
    setState({ stages: idleStages, running: true });

    const results: StageResult[] = [];
    let currentInput = input;

    for (let i = 0; i < stageDefs.current.length; i++) {
      const def = stageDefs.current[i];
      const stage: StageResult = {
        stageId: def.id,
        stageName: def.name,
        input: currentInput,
        output: '',
        status: 'running',
      };

      const onProgress = (phase: string, pct: number) => {
        setState((s) => ({
          ...s,
          stages: s.stages.map((st) =>
            st.stageId === def.id ? { ...st, progressPhase: phase, progressPct: pct } : st
          ),
        }));
      };

      setState((s) => ({
        ...s,
        stages: [
          ...results,
          stage,
          ...idleStages.slice(results.length + 1).map((st) => ({ ...st, status: 'idle' as const })),
        ],
      }));

      try {
        const { output, metadata } = await def.run(currentInput, onProgress);
        stage.output = output;
        stage.status = 'done';
        stage.metadata = metadata;
        currentInput = output;
      } catch (err: any) {
        stage.status = 'error';
        stage.error = err.message || 'Stage failed';
      }

      results.push(stage);
      setState((s) => ({
        ...s,
        stages: [
          ...results,
          ...idleStages.slice(results.length).map((st) => ({ ...st, status: 'idle' as const })),
        ],
      }));

      if (stage.status === 'error') break;
    }

    setState((s) => ({ ...s, running: false }));
  }, []);

  const reset = useCallback(() => {
    setState({ stages: createIdleStages(), running: false });
  }, []);

  return { state, runAll, reset };
}
