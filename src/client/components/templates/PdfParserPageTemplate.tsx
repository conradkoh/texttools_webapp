import React, { useCallback, useState, useRef, Suspense } from 'react';
import { FunctionComponent } from 'react';
import dynamic from 'next/dynamic';
import styles from './PdfParserPageTemplate.module.scss';

const FormattedTab = dynamic(() => import('./FormattedTab'), { ssr: false });

interface PageData {
  pageNum: number;
  text: string;
}

interface ParseResult {
  text: string;
  pageCount: number;
  pages: PageData[];
}

interface PdfParserPageTemplateProps {
  output: { value: string };
  setOutput: (val: { value: string }) => void;
}

const countWords = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter((w) => w).length;

const Tab: FunctionComponent<{
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ active, label, onClick }) => (
  <button
    className={`px-4 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
      active
        ? 'bg-white text-blue-600 border border-b-white border-slate-200 -mb-[1px] relative z-10'
        : 'bg-slate-100 text-slate-500 hover:text-slate-700 border border-transparent'
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

const PdfParserPageTemplate: FunctionComponent<PdfParserPageTemplateProps> = ({
  output,
  setOutput,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'raw' | 'formatted'>('raw');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file.');
        return;
      }

      setSelectedFile(file);
      setError(null);
      setLoading(true);
      setOutput({ value: '' });
      setParseResult(null);
      setActiveTab('raw');

      try {
        const reader = new FileReader();

        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        const response = await fetch('/api/pdf-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64 }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.details || data.error || 'Failed to parse PDF');
        }

        setOutput({ value: data.text });
        setParseResult(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while parsing the PDF.');
      } finally {
        setLoading(false);
      }
    },
    [setOutput]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setOutput({ value: '' });
    setSelectedFile(null);
    setParseResult(null);
    setError(null);
    setCopySuccess(false);
    setActiveTab('raw');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setOutput]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopySuccess(false);
    }
  }, [output.value]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([output.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedFile?.name.replace(/\.pdf$/i, '') ?? 'parsed'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [output.value, selectedFile]);

  const hasResult = !loading && !error && output.value;

  const displayRawText =
    parseResult?.pages && parseResult.pages.length > 1
      ? parseResult.pages
          .map((p) => `\u2500\u2500 Page ${p.pageNum} \u2500\u2500\n${p.text}`)
          .join('\n\n')
      : output.value;

  if (hasResult) {
    return (
      <div className="px-3 py-3 h-full flex flex-col min-h-0">
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className={styles.stats}>
            {parseResult?.pageCount != null && (
              <span className={styles.stat}>
                {parseResult.pageCount}{' '}
                {parseResult.pageCount === 1 ? 'page' : 'pages'}
              </span>
            )}
            <span className={styles.stat}>
              {countWords(output.value).toLocaleString()} words
            </span>
            <span className={styles.stat}>
              {output.value.length.toLocaleString()} chars
            </span>
          </div>

          <div className="flex gap-1 ml-auto">
            <button
              className={styles.actionBtn}
              onClick={handleCopy}
              title="Copy text"
            >
              {copySuccess ? (
                <span className="text-green-600">{'\u2713'} Copied</span>
              ) : (
                <span>{'\uD83D\uDCCB'} Copy</span>
              )}
            </button>
            <button
              className={styles.actionBtn}
              onClick={handleDownload}
              title="Download .txt"
            >
              {'\u2B07'} Download
            </button>
            <button
              className={styles.actionBtn}
              onClick={handleClear}
              title="Parse a new file"
            >
              + New Parse
            </button>
          </div>
        </div>

        <div className="flex gap-0 mt-2 shrink-0 border-b border-slate-200">
          <Tab active={activeTab === 'raw'} label="Raw" onClick={() => setActiveTab('raw')} />
          <Tab active={activeTab === 'formatted'} label="Formatted" onClick={() => setActiveTab('formatted')} />
        </div>

        <div className="mt-0 flex-grow min-h-0 overflow-hidden">
          {activeTab === 'raw' ? (
            <textarea
              readOnly
              value={displayRawText}
              className={`w-full h-full bg-slate-50 border border-slate-200 border-t-0 rounded-b p-3 font-mono text-xs leading-relaxed resize-none outline-none ${styles.output}`}
              spellCheck={false}
            />
          ) : (
            <Suspense fallback={
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Loading...
              </div>
            }>
              <FormattedTab rawText={output.value} />
            </Suspense>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-center items-center px-3 py-3">
      <div
        className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''} ${styles.dropzoneFull}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        {loading ? (
          <div className="w-full max-w-xs mx-auto">
            <div className={styles.progressBar}>
              <div className={styles.progressBarFill} />
            </div>
            <div className="text-center text-sm text-gray-500 mt-2">
              Extracting text from PDF...
            </div>
          </div>
        ) : (
          <>
            <div className="text-6xl mb-4">{'\uD83D\uDCC4'}</div>
            <div className="text-base font-medium text-gray-500">
              Drop a PDF here or click to browse
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Supported: .pdf files up to 50MB
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 text-red-600 text-sm p-3 bg-red-50 rounded border border-red-200 max-w-lg">
          {error}
          <button
            className="ml-2 underline hover:no-underline"
            onClick={handleClear}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfParserPageTemplate;
