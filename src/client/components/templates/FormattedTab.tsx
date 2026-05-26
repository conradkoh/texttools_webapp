import React from 'react';
import styles from './PdfParserPageTemplate.module.scss';

interface FormattedTabProps {
  rawText: string;
}

const FormattedTab: React.FC<FormattedTabProps> = ({ rawText: _rawText }) => {
  return (
    <div className={`h-full bg-white border border-slate-200 rounded-b flex flex-col items-center justify-center text-center gap-3 p-4 ${styles.output}`}>
      <div className="text-3xl">{'\u{1F6A7}'}</div>
      <div className="text-sm font-medium text-slate-700">AI Formatting — Coming Soon</div>
      <div className="text-xs text-slate-400 max-w-xs">
        Local model extraction has been temporarily removed. This feature will be replaced with a server-side AI formatting solution.
      </div>
    </div>
  );
};

export default FormattedTab;
