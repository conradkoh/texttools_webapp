import React, { useState, useCallback } from 'react';
import { usePipeline, StageResult } from '@client/hooks/usePipeline';
import styles from './PdfParserPageTemplate.module.scss';

interface FormattedTabProps {
  rawText: string;
}

const StageStatusBadge: React.FC<{ status: StageResult['status'] }> = ({ status }) => {
  const config: Record<string, { color: string; label: string }> = {
    idle: { color: 'bg-slate-200 text-slate-500', label: 'Idle' },
    running: { color: 'bg-blue-100 text-blue-700 animate-pulse', label: 'Running...' },
    done: { color: 'bg-green-100 text-green-700', label: 'Done' },
    error: { color: 'bg-red-100 text-red-700', label: 'Error' },
  };
  const c = config[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.color}`}>
      {c.label}
    </span>
  );
};

const CollapsibleSection: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({
  title,
  defaultOpen = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <span className={`transform transition-transform ${open ? 'rotate-180' : ''}`}>
          {'\u25BC'}
        </span>
      </button>
      {open && <div className="p-3 bg-white">{children}</div>}
    </div>
  );
};

const StageCard: React.FC<{
  stage: StageResult;
  index: number;
  isPipelineRunning: boolean;
  onView: (stage: StageResult) => void;
}> = ({ stage, index, isPipelineRunning, onView }) => {
  const canView = stage.status === 'done' || stage.status === 'error';
  return (
    <div className={`border rounded-lg overflow-hidden ${stage.status === 'error' ? 'border-red-300' : 'border-slate-200'}`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors disabled:hover:bg-white disabled:cursor-default text-left"
        onClick={() => canView && onView(stage)}
        disabled={!canView}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-slate-800">{stage.stageName}</span>
        </div>
        <div className="flex items-center gap-2">
          {canView && (
            <span className="text-xs text-blue-500 hover:text-blue-700 font-medium">
              {'\u25C9'} View
            </span>
          )}
          <StageStatusBadge status={stage.status} />
        </div>
      </button>

      {stage.status === 'error' && (
        <div className="px-4 py-2 bg-red-50 text-xs text-red-600 border-b border-red-100">
          {stage.error || 'An error occurred'}
        </div>
      )}

      {stage.status !== 'idle' && (
        <div className="px-4 py-3 space-y-2">
          <CollapsibleSection title={`Input (${stage.input.length.toLocaleString()} chars)`}>
            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {stage.input.slice(0, 2000)}{stage.input.length > 2000 ? '...' : ''}
            </pre>
          </CollapsibleSection>

          <CollapsibleSection title={`Output (${stage.output.length.toLocaleString()} chars)`} defaultOpen={stage.status === 'done'}>
            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {stage.output.slice(0, 2000)}{stage.output.length > 2000 ? '...' : ''}
            </pre>
          </CollapsibleSection>

          {stage.metadata && (
            <div className="text-xs text-slate-500 space-y-2">
              {stage.stageId === 'redaction' && (stage.metadata as any).entityTypes?.length > 0 && (
                <>
                  <div className="font-medium text-slate-700">
                    Entities found: {(stage.metadata as any).entitiesFound}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(stage.metadata as any).entityTypes.map((type: string) => (
                      <span key={type} className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-mono">
                        {type}
                      </span>
                    ))}
                  </div>
                  {(stage.metadata as any).redactions?.length > 0 && (
                    <ul className="space-y-0.5">
                      {(stage.metadata as any).redactions.map((r: any, i: number) => (
                        <li key={i} className="truncate">
                          <span className="text-red-400 line-through">{r.original}</span>
                          {' \u2192 '}
                          <span className="text-green-600">{r.replacement}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {stage.stageId === 'pattern' && (stage.metadata as any).patternTypes?.length > 0 && (
                <>
                  <div className="font-medium text-slate-700">
                    Patterns found: {(stage.metadata as any).patternsFound}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(stage.metadata as any).patternTypes.map((type: string) => (
                      <span key={type} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-mono">
                        {type}
                      </span>
                    ))}
                  </div>
                  {(stage.metadata as any).patternMatches?.length > 0 && (
                    <ul className="space-y-0.5">
                      {(stage.metadata as any).patternMatches.map((m: any, i: number) => (
                        <li key={i} className="truncate text-slate-500">
                          <span className="text-purple-600 font-medium">{m.label}</span>
                          {' '}
                          <span className="text-red-400 line-through">{m.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {stage.stageId === 'redaction' && (stage.metadata as any).entitiesFound === 0 && (
                <div className="text-slate-400 italic">No entities detected.</div>
              )}
              {stage.stageId === 'pattern' && (stage.metadata as any).patternsFound === 0 && (
                <div className="text-slate-400 italic">No sensitive patterns found.</div>
              )}
            </div>
          )}
        </div>
      )}

      {stage.status === 'idle' && (
        <div className="px-4 py-3 text-xs text-slate-400 italic">
          {isPipelineRunning ? 'Waiting for previous stage to complete...' : 'Waiting to run...'}
        </div>
      )}

      {stage.status === 'running' && (
        <div className="px-4 py-6 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>{stage.progressPhase || 'Processing...'}</span>
          </div>
          {stage.progressPct != null && (
            <div className="w-full max-w-xs">
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(stage.progressPct * 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 text-right mt-0.5">
                {Math.round(stage.progressPct * 100)}%
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SplitView: React.FC<{ stage: StageResult; onClose: () => void }> = ({ stage, onClose }) => (
  <div className="border-t border-slate-200">
    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
      <span className="text-sm font-medium text-slate-700">
        {'\u25C9'} {stage.stageName}
      </span>
      <button
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        onClick={onClose}
      >
        {'\u2715'} Close
      </button>
    </div>
    <div className="flex h-80">
      <div className="flex-1 flex flex-col border-r border-slate-200">
        <div className="text-xs font-medium text-slate-500 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
          Input ({stage.input.length.toLocaleString()} chars)
        </div>
        <pre className="flex-1 text-xs font-mono text-slate-700 p-3 overflow-auto whitespace-pre-wrap leading-relaxed">
          {stage.input}
        </pre>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="text-xs font-medium text-slate-500 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
          Output ({stage.output.length.toLocaleString()} chars)
        </div>
        <pre className="flex-1 text-xs font-mono text-slate-700 p-3 overflow-auto whitespace-pre-wrap leading-relaxed">
          {stage.output}
        </pre>
      </div>
    </div>
  </div>
);

const PipelineConnector: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex justify-center py-1">
    <div className={`w-0.5 h-6 rounded-full ${active ? 'bg-blue-400' : 'bg-slate-200'}`} />
  </div>
);

const FormattedTab: React.FC<FormattedTabProps> = ({ rawText }) => {
  const { state, runAll, reset } = usePipeline();
  const [showPipeline, setShowPipeline] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    setShowPipeline(true);
    runAll(rawText);
  }, [rawText, runAll]);

  const handleReset = useCallback(() => {
    setShowPipeline(false);
    reset();
    setSelectedStageId(null);
  }, [reset]);

  const handleViewStage = useCallback((stage: StageResult) => {
    setSelectedStageId(stage.stageId);
  }, []);

  const handleCloseSplitView = useCallback(() => {
    setSelectedStageId(null);
  }, []);

  const selectedStage = selectedStageId
    ? state.stages.find((s) => s.stageId === selectedStageId) ?? null
    : null;

  const hasRun = state.stages.some((s) => s.status === 'done' || s.status === 'error');
  const allDone = state.stages.every((s) => s.status === 'done' || s.status === 'idle');
  const finalOutput = state.stages
    .filter((s) => s.status === 'done')
    .pop()?.output;

  if (!showPipeline) {
    return (
      <div className="h-full bg-white border border-slate-200 rounded-b flex flex-col items-center justify-center text-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{'\u2699\uFE0F'}</span>
          <span className="text-sm font-medium text-slate-700">Processing Pipeline</span>
        </div>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          A 2-stage pipeline: NER model detects names, locations, and organisations;
          pattern matching redacts account numbers, NRICs, SSNs, emails, and phones.
          Each stage can be inspected independently.
        </p>
        <button
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          onClick={handleRun}
        >
          {'\u25B6'} Run Pipeline
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border border-slate-200 rounded-b">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Pipeline</span>
          {state.running && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Running...
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {hasRun && !state.running && (
            <button className={styles.actionBtn} onClick={handleReset}>
              {'\u21BB'} Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto px-4 py-3 space-y-0">
        {state.stages.map((stage, i) => (
          <React.Fragment key={stage.stageId}>
            {i > 0 && <PipelineConnector active={stage.status !== 'idle'} />}
            <StageCard stage={stage} index={i} isPipelineRunning={state.running} onView={handleViewStage} />
          </React.Fragment>
        ))}
      </div>

      {selectedStage && (
        <div className="shrink-0">
          <SplitView stage={selectedStage} onClose={handleCloseSplitView} />
        </div>
      )}

      {allDone && !state.running && finalOutput != null && (
        <div className="shrink-0 border-t border-slate-200 px-4 py-3">
          <CollapsibleSection title={`Pipeline Output (${finalOutput.length.toLocaleString()} chars)`} defaultOpen>
            <div className="max-h-64 overflow-y-auto">
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                {finalOutput}
              </pre>
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
};

export default FormattedTab;
