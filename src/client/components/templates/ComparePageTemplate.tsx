import React, { useCallback } from 'react';
import { FunctionComponent } from 'react';
import styles from './ComparePageTemplate.module.scss';
interface ComparePageTemplateProps {
  left: { value: string };
  right: { value: string };
  output: { value: string };
  onLeftChange: (newVal: string) => void;
  onRightChange: (newVal: string) => void;
}
const ComparePageTemplate: FunctionComponent<ComparePageTemplateProps> = ({
  left,
  right,
  output,
  onLeftChange,
  onRightChange,
}) => {
  const handleLeftChange = useCallback(
    (e) => {
      onLeftChange(e.target.value);
    },
    [onLeftChange]
  );
  const handleRightChange = useCallback(
    (e) => {
      onRightChange(e.target.value);
    },
    [onRightChange]
  );
  return (
    <div className="px-3 py-3 w-100 h-full flex flex-col">
      <div className="flex flex-row grow grid grid-cols-2 gap-3">
        <div className="flex flex-col grow">
          <div className="mt-3">Left:</div>
          <textarea
            value={left.value}
            onChange={handleLeftChange}
            className={`grow bg-slate-100 w-full border-solid border-slate-300 ${styles.input}`}
          ></textarea>
        </div>
        <div className="flex flex-col grow">
          <div className="mt-3">Right:</div>
          <textarea
            value={right.value}
            onChange={handleRightChange}
            className={`grow bg-slate-100 w-full border-solid border-slate-300 ${styles.input}`}
          ></textarea>
        </div>
      </div>
      <div className="mt-3">Output:</div>
      <textarea
        readOnly
        value={output.value}
        className={`mt-1 w-full bg-slate-200 border-solid border-slate-300 ${styles.output}`}
      ></textarea>
    </div>
  );
};
export default ComparePageTemplate;
