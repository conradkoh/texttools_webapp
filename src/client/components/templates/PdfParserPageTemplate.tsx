import React, { useCallback, useState, useRef } from 'react';
import { FunctionComponent } from 'react';
import styles from './PdfParserPageTemplate.module.scss';

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

  return (
    <div className="px-3 py-3 w-100 h-full">
      <div className="h-full flex flex-col">
        <div
          className={`${styles.dropzone} ${
            dragActive ? styles.dropzoneActive : ''
          } ${selectedFile ? styles.dropzoneCompact : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!selectedFile ? handleClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />

          {!selectedFile ? (
            <div className="text-gray-400">
              <div className="text-5xl mb-2">&#128196;</div>
              <div className="text-sm font-medium">
                Drop a PDF here or click to browse
              </div>
              <div className="text-xs mt-1">Supported: .pdf files up to 50MB</div>
            </div>
          ) : (
            <div className={styles.fileChip}>
              <span className="text-sm font-medium truncate max-w-[200px]">
                &#128196; {selectedFile.name}
              </span>
              <span className="text-xs text-gray-400 ml-2">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
              <button
                className={styles.fileChipRemove}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                title="Remove file"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="mt-4">
            <div className={styles.progressBar}>
              <div className={styles.progressBarFill} />
            </div>
            <div className="text-center text-sm text-gray-500 mt-2">
              Extracting text from PDF...
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 text-red-600 text-sm p-3 bg-red-50 rounded border border-red-200">
            {error}
            <button
              className="ml-2 underline hover:no-underline"
              onClick={handleClear}
            >
              Dismiss
            </button>
          </div>
        )}

        {hasResult && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
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
                  title="Copy to clipboard"
                >
                  {copySuccess ? (
                    <span className="text-green-600">&#10003; Copied</span>
                  ) : (
                    <span>&#128203; Copy</span>
                  )}
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={handleDownload}
                  title="Download as .txt"
                >
                  &#8615; Download .txt
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

            <div className="mt-2 text-xs text-gray-400 italic">
              Phase 2 (coming soon): AI-powered markdown formatting, summarization,
              and translation — all running locally in your browser.
            </div>

            <div className="mt-1 flex-grow min-h-0">
              <textarea
                readOnly
                value={
                  parseResult?.pages && parseResult.pages.length > 1
                    ? parseResult.pages
                        .map(
                          (p) =>
                            `\u2500\u2500 Page ${p.pageNum} \u2500\u2500\n${p.text}`
                        )
                        .join('\n\n')
                    : output.value
                }
                className={`mt-1 w-full h-full bg-slate-50 border border-slate-200 rounded p-3 font-mono text-xs leading-relaxed resize-none outline-none ${styles.output}`}
                spellCheck={false}
              />
            </div>
          </>
        )}

        {!hasResult && !loading && !error && (
          <div className="mt-3 text-xs text-gray-400 italic">
            Phase 2 (coming soon): AI-powered markdown formatting, summarization,
            and translation — all running locally in your browser.
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfParserPageTemplate;
