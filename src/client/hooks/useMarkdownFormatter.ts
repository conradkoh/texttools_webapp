import { useState, useCallback } from 'react';

interface FormatterState {
  status: 'idle' | 'busy' | 'done' | 'error';
  progress: number;
  progressLabel: string;
  result: string;
  error: string | null;
  cached: boolean;
  editLog: never[];
}

export function useMarkdownFormatter() {
  const [state] = useState<FormatterState>({
    status: 'idle',
    progress: 0,
    progressLabel: '',
    result: '',
    error: null,
    cached: false,
    editLog: [],
  });

  const formatText = useCallback(async (_rawText: string) => {}, []);

  const reset = useCallback(() => {}, []);

  const dispose = useCallback(async () => {}, []);

  return { state, formatText, reset, dispose };
}
