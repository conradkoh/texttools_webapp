import { MainLayout } from '@client/components/layouts/MainLayout';
import SideNav from '@client/components/layouts/SideNav/SideNav';
import ComparePageTemplate from '@client/components/templates/ComparePageTemplate';
import React, { useCallback, useEffect, useState } from 'react';
import { FunctionComponent } from 'react';
interface ComparePageProps {}
const PERSIST_KEY_LEFT_VALUE = 'compare-left-value';
const PERSIST_KEY_RIGHT_VALUE = 'compare-right-value';
const ComparePage: FunctionComponent<ComparePageProps> = (props) => {
  const [left, setLeft] = useState({
    value: '',
  });
  const [right, setRight] = useState({
    value: '',
  });
  useEffect(() => {
    setLeft({ value: localStorage?.getItem?.(PERSIST_KEY_LEFT_VALUE) || '' });
  }, []);

  useEffect(() => {
    setRight({ value: localStorage?.getItem?.(PERSIST_KEY_RIGHT_VALUE) || '' });
  }, []);
  const [output, setOutput] = useState({ value: '' });
  const handleLeftChange = useCallback((value) => {
    setLeft({ value });
  }, []);
  const handleRightChange = useCallback((value) => {
    setRight({ value });
  }, []);

  //persist state
  useEffect(() => {
    localStorage.setItem(PERSIST_KEY_LEFT_VALUE, left.value);
    localStorage.setItem(PERSIST_KEY_RIGHT_VALUE, right.value);
  }, [left.value, right.value]);

  const updateConsoleOutput = useCallback(() => {
    let op = '';
    compareLines({
      log: (v) => {
        op += `${v}\n`;
      },
    })(left.value, right.value);
    setOutput({ value: op });
  }, [left, right]);

  //rerun compute whenever console output can be generated
  useEffect(() => {
    updateConsoleOutput();
  }, [updateConsoleOutput]);
  return (
    <MainLayout title={'Compare'}>
      <ComparePageTemplate
        left={left}
        right={right}
        output={output}
        onLeftChange={handleLeftChange}
        onRightChange={handleRightChange}
      />
    </MainLayout>
  );
};

const compareLines =
  (deps: { log: (val: string) => void }) => (left: string, right: string) => {
    const { log } = deps;
    if (!left.trim()) {
      log(`Waiting for input on left...`);
      return;
    }
    if (!right.trim()) {
      log(`Waiting for input on right...`);
      return;
    }
    let left_lines = left
      .split('\n')
      .map((line) => line.trim())
      .filter((i) => i);
    let right_lines = right
      .split('\n')
      .map((line) => line.trim())
      .filter((i) => i);
    let left_index = left_lines.reduce<Record<string, { name: string }>>(
      (state, cur, idx) => {
        if (state[cur]) {
          log(`⚠️ warning: duplicate found in left: ${cur}`);
        }
        state[cur] = { name: cur };
        return state;
      },
      {}
    );
    let right_index = right_lines.reduce<Record<string, { name: string }>>(
      (state, cur, idx) => {
        if (state[cur]) {
          log(`⚠️ warning: duplicate found in right: ${cur}`);
        }
        state[cur] = { name: cur };
        return state;
      },
      {}
    );

    let leftOp = '';
    let leftCount = 0;
    //Find left items missing in right
    for (let name of left_lines) {
      let found = right_index[name] ? true : false;
      if (!found) {
        leftCount++;
        leftOp += `${leftCount}. ${name} found in left but not found in right.\n`;
      }
    }

    let rightOp = '';
    let rightCount = 0;
    //Find right items missing in left
    for (let name of right_lines) {
      let found = left_index[name] ? true : false;
      if (!found) {
        rightCount++;
        rightOp += `${rightCount}. ${name} found in right but not found in left.\n`;
      }
    }
    log('-------------------------------------');
    log(
      `✅  Comparison Results   |   count = (L: ${left_lines.length}, R: ${right_lines.length})`
    );
    log('-------------------------------------');
    if (!leftOp && !rightOp) {
      log('Left and right contain the same content.');
    } else {
      log(leftOp.trim());
      log('++++++++++++++++++++++++++++');
      log(rightOp.trim());
    }
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  };
export default ComparePage;
