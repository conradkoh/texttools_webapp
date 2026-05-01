import React, { useCallback, useState, useRef } from 'react';
import { FunctionComponent } from 'react';
import styles from './PdfParserPageTemplate.module.scss';

interface PdfParserPageTemplateProps {
  output: { value: string };
  setOutput: (val: { value: string }) => void;
}

const PdfParserPageTemplate: FunctionComponent<PdfParserPageTemplateProps> = ({
  output,
  setOutput,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pdfBase64: base64 }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.details || data.error || 'Failed to parse PDF');
        }

        setOutput({ value: data.text });
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

  return (
    <>
      <div className="px-3 py-3 w-100 h-full">
        <div className="h-full flex flex-col">
          <div
            className={`${styles.dropzone} ${
              dragActive ? styles.dropzoneActive : ''
            }`}
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
            {selectedFile ? (
              <div className={styles.fileInfo}>
                <div className="font-bold">{selectedFile.name}</div>
                <div className="text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                <div className="text-4xl mb-2">&#128196;</div>
                <div>Drop a PDF file here or click to browse</div>
              </div>
            )}
          </div>

          {loading && (
            <div className="mt-3 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
              Parsing PDF...
            </div>
          )}

          {error && (
            <div className="mt-3 text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          {selectedFile && !loading && (
            <div className="mt-3">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => {
                  setOutput({ value: '' });
                  setSelectedFile(null);
                  setError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                Clear
              </button>
            </div>
          )}

          <div className="mt-3">Output:</div>
          <textarea
            readOnly
            value={output.value}
            className={`mt-1 w-full grow bg-slate-200 border-solid border-slate-300 ${styles.output}`}
          ></textarea>
        </div>
      </div>
    </>
  );
};

export default PdfParserPageTemplate;
