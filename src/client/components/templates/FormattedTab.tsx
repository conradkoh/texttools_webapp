import React, { useEffect, useState, useCallback } from 'react';
import { useMarkdownFormatter } from '@client/hooks/useMarkdownFormatter';
import styles from './PdfParserPageTemplate.module.scss';

interface FormattedTabProps {
  rawText: string;
}

const MarkdownContent: React.FC<{ text: string }> = ({ text }) => {
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 rounded text-xs">$1</code>')
    .replace(/^\- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/^(.+)$/gm, (m) =>
      m.startsWith('<') ? m : `<p class="mb-2">${m}</p>`
    );

  return (
    <div
      className="prose prose-sm max-w-none text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: `<div>${html}</div>` }}
    />
  );
};

const FormattedTab: React.FC<FormattedTabProps> = ({ rawText }) => {
  const { state, loadModel, formatText, reset } = useMarkdownFormatter();
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [rawText, reset]);

  const handleDownloadMarkdown = useCallback(() => {
    const blob = new Blob([state.result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.result]);

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(state.result);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopySuccess(false);
    }
  }, [state.result]);

  if (state.status === 'done') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex gap-1 shrink-0 py-2">
          <button
            className={styles.actionBtn}
            onClick={handleCopyMarkdown}
            title="Copy Markdown"
          >
            {copySuccess ? (
              <span className="text-green-600">{'\u2713'} Copied</span>
            ) : (
              <span>{'\uD83D\uDCCB'} Copy Markdown</span>
            )}
          </button>
          <button
            className={styles.actionBtn}
            onClick={handleDownloadMarkdown}
            title="Download .md"
          >
            {'\u2B07'} Download .md
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => formatText(rawText)}
            title="Re-run formatting"
          >
            {'\u21BB'} Re-run
          </button>
        </div>
        <div className="flex-grow overflow-auto bg-white border border-slate-200 rounded p-4">
          <MarkdownContent text={state.result} />
        </div>
      </div>
    );
  }

  const isDownloading = state.status === 'downloading';
  const isGenerating = state.status === 'generating';
  const isBusy = isDownloading || isGenerating;

  return (
    <div className={`h-full bg-white border border-slate-200 rounded-b p-4 overflow-auto ${styles.output}`}>
      <div className="h-full flex flex-col items-center justify-center text-center gap-3">
        <div className="text-4xl">{'\u2728'}</div>
        <div>
          <div className="text-sm font-medium text-slate-700">Format with AI</div>
          <div className="text-xs text-slate-400 mt-1 max-w-sm">
            AI-powered markdown formatting runs entirely in your browser.
            No data leaves your machine.
          </div>
        </div>

        {!isBusy && state.status !== 'ready' && (
          <>
            <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded max-w-sm">
              Requires a one-time download of{' '}
              <strong>~{state.downloadSizeMB} MB</strong> for the
              language model (SmolLM2-1.7B).
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              onClick={loadModel}
            >
              Download Model
            </button>
          </>
        )}

        {state.status === 'ready' && (
          <button
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => formatText(rawText)}
          >
            Format to Markdown
          </button>
        )}

        {isBusy && (
          <div className="w-full max-w-xs">
            <div className="text-xs text-slate-500 mb-2">
              {state.progressText || (isGenerating ? 'Generating markdown...' : 'Downloading model...')}
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressBarFill}
                style={{
                  width: `${Math.round(state.progress * 100)}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-1 text-right">
              {Math.round(state.progress * 100)}%
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded max-w-sm">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormattedTab;
