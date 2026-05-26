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

const SidebarStage: React.FC<{
  stage: StageResult;
  index: number;
  isSelected: boolean;
  isPipelineRunning: boolean;
  onSelect: (stage: StageResult) => void;
}> = ({ stage, index, isSelected, isPipelineRunning, onSelect }) => {
  const canSelect = stage.status === 'done' || stage.status === 'error';
  const borderClass = isSelected ? 'border-blue-400 ring-1 ring-blue-200' : stage.status === 'error' ? 'border-red-300' : 'border-slate-200';
  return (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${borderClass} ${canSelect ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default opacity-60'} ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
      onClick={() => canSelect && onSelect(stage)}
      disabled={!canSelect}
    >
      <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
        {index + 1}
      </span>
      <span className={`text-xs font-medium truncate ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>
        {stage.stageName}
      </span>
      <StageStatusBadge status={stage.status} />
    </button>
  );
};

const ContentPanel: React.FC<{ stage: StageResult }> = ({ stage }) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
        {'\u25C9'}
      </span>
      <span className="text-sm font-medium text-slate-700">{stage.stageName}</span>
      <span className="text-xs text-slate-400">
        {'\u2014'} {stage.status === 'done' ? 'Done' : stage.status === 'error' ? 'Error' : ''}
      </span>
    </div>
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col border-r border-slate-200">
        <div className="text-xs font-medium text-slate-500 px-4 py-1.5 bg-slate-50 border-b border-slate-200 shrink-0">
          Input ({stage.input.length.toLocaleString()} chars)
        </div>
        <pre className="flex-1 text-xs font-mono text-slate-700 p-4 overflow-auto whitespace-pre-wrap leading-relaxed">
          {stage.input}
        </pre>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="text-xs font-medium text-slate-500 px-4 py-1.5 bg-slate-50 border-b border-slate-200 shrink-0">
          Output ({stage.output.length.toLocaleString()} chars)
        </div>
        <pre className="flex-1 text-xs font-mono text-slate-700 p-4 overflow-auto whitespace-pre-wrap leading-relaxed">
          {stage.output}
        </pre>
      </div>
    </div>
    {stage.metadata && (
      <div className="shrink-0 border-t border-slate-200 px-4 py-2 bg-slate-50">
        <div className="text-xs text-slate-500 space-y-1">
          {stage.stageId === 'redaction' && (
            <span>Entities found: {(stage.metadata as any).entitiesFound ?? 0}</span>
          )}
          {stage.stageId === 'pattern' && (
            <span>Patterns found: {(stage.metadata as any).patternsFound ?? 0}</span>
          )}
        </div>
      </div>
    )}
  </div>
);

const FinalResultPanel: React.FC<{ output: string }> = ({ output }) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
      <span className="text-sm font-medium text-slate-700">Final Pipeline Output</span>
      <span className="text-xs text-slate-400">
        ({output.length.toLocaleString()} chars)
      </span>
    </div>
    <pre className="flex-1 text-xs font-mono text-slate-700 p-4 overflow-auto whitespace-pre-wrap leading-relaxed">
      {output}
    </pre>
  </div>
);

const FormattedTab: React.FC<FormattedTabProps> = ({ rawText }) => {
  const { state, runAll, reset } = usePipeline();
  const [showPipeline, setShowPipeline] = useState(false);
  const [selectedView, setSelectedView] = useState<string | 'final' | null>(null);

  const handleRun = useCallback(() => {
    setShowPipeline(true);
    runAll(rawText);
  }, [rawText, runAll]);

  const handleReset = useCallback(() => {
    setShowPipeline(false);
    reset();
    setSelectedView(null);
  }, [reset]);

  const handleSelectStage = useCallback((stage: StageResult) => {
    setSelectedView(stage.stageId);
  }, []);

  const handleSelectFinal = useCallback(() => {
    setSelectedView('final');
  }, []);

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

  const selectedStage = selectedView && selectedView !== 'final'
    ? state.stages.find((s) => s.stageId === selectedView) ?? null
    : null;

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

      <div className="flex-1 flex min-h-0">
        <div className="w-60 shrink-0 border-r border-slate-200 overflow-y-auto p-3 space-y-1.5 bg-slate-50/50">
          {state.stages.map((stage, i) => {
            if (stage.status === 'idle' && !state.running) return null;
            return (
              <SidebarStage
                key={stage.stageId}
                stage={stage}
                index={i}
                isSelected={selectedView === stage.stageId}
                isPipelineRunning={state.running}
                onSelect={handleSelectStage}
              />
            );
          })}
          {hasRun && !state.running && finalOutput != null && (
            <button
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer hover:bg-slate-50 ${selectedView === 'final' ? 'border-blue-400 ring-1 ring-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}
              onClick={handleSelectFinal}
            >
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${selectedView === 'final' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {'\u2606'}
              </span>
              <span className={`text-xs font-medium ${selectedView === 'final' ? 'text-blue-800' : 'text-slate-700'}`}>
                Final Result
              </span>
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {selectedStage ? (
            <ContentPanel stage={selectedStage} />
          ) : selectedView === 'final' && finalOutput != null ? (
            <FinalResultPanel output={finalOutput} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="text-lg text-slate-300 mb-2">{'\u{1F50D}'}</div>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Select a stage from the sidebar to view its content, or click <strong>Final Result</strong> to see the pipeline output.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormattedTab;
