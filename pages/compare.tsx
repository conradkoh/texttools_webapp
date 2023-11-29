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
    const leftSet = StringSet.ParseRawText(left, {
      name: 'left',
      ignoreCase: true,
    });
    const rightSet = StringSet.ParseRawText(right, {
      name: 'right',
      ignoreCase: true,
    });

    let leftSubRight = leftSet.difference(rightSet);
    let rightSubLeft = rightSet.difference(leftSet);
    let leftIntersectRight = rightSet.intersection(leftSet);
    log('-------------------------------------');
    log(
      `✅  Comparison Results   |   count = (L: ${leftSet.length}, R: ${rightSet.length})`
    );
    log('-------------------------------------');
    if (leftSubRight.length == 0 && rightSubLeft.length == 0) {
      log('Left and right contain the same content.');
    } else {
      log('++++++++++++++++++++++++++++');
      log(`> INTERSECTION (${leftIntersectRight.length})`);
      log('++++++++++++++++++++++++++++');
      log(leftIntersectRight.format({ prefix: (d) => `${d}` }));
      log('++++++++++++++++++++++++++++');
      log(`> DIFFERENCE: LEFT - RIGHT (${leftSubRight.length})`);
      log('++++++++++++++++++++++++++++');
      log(leftSubRight.format({ prefix: (d) => `${d}` }));
      log('++++++++++++++++++++++++++++');
      log(`> DIFFERENCE: RIGHT - LEFT (${rightSubLeft.length})`);
      log('++++++++++++++++++++++++++++');
      log(rightSubLeft.format({ prefix: (d) => `${d}` }));
    }
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log(`⛔️ WARNINGS (${leftSet.warnings.length + rightSet.warnings.length})`);
    for (let w of leftSet.warnings) {
      log(`[LEFT] ${w.message}: ${w.val}`);
    }
    for (let w of rightSet.warnings) {
      log(`[RIGHT] ${w.message}: ${w.val}`);
    }
  };

class StringSet {
  protected name: string;
  private data: string[];
  private map: Map<string, string>;
  private _warnings: Warning[] = [];
  constructor(name: string, data: string[]) {
    //pre-processing
    let processedData = data.map((d) => {
      return d;
    });
    //construct
    this.name = name;
    this.data = processedData;
    const result = StringSet.AsMap(processedData);
    this.map = result.map;
    this._warnings = result.warnings;
  }
  get length() {
    return this.data.length;
  }
  get warnings() {
    return this._warnings;
  }
  /**
   * [parser] Parses a raw text into a StringSet
   * @param rawData
   * @param set
   * @returns
   */
  public static ParseRawText(
    rawData: string,
    set: { name: string; ignoreCase: boolean }
  ): StringSet {
    let lines = rawData
      .split('\n')
      .map((line) => line.trim())
      .filter((i) => i);
    return new StringSet(set.name, lines);
  }
  /**
   * [formatter] Formats a string[] into output format
   * @param data
   */
  public format(opts?: {
    prefix?: (d: string) => string;
    suffix?: (d: string) => string;
  }) {
    return this.data
      .map((d) => {
        let op = d;
        if (opts?.prefix) {
          op = opts.prefix(op);
        }
        if (opts?.suffix) {
          op = opts.suffix(op);
        }
        return op;
      })
      .join('\n');
  }

  private static AsMap(data: string[]): {
    warnings: Warning[];
    map: Map<string, string>;
  } {
    return data.reduce<{ warnings: Warning[]; map: Map<string, string> }>(
      (state, cur) => {
        if (state.map.has(cur)) {
          state.warnings.push({ message: 'Duplicate value', val: cur });
        }
        state.map.set(cur, cur);
        return state;
      },
      {
        map: new Map(),
        warnings: [] as Warning[],
      }
    );
  }
  /**
   * Computes the difference between two sets. Warning: this is not commutative.
   * @param other
   * @returns
   */
  difference(other: StringSet): StringSet {
    let thisMap = this.map;
    let otherMap = other.map;
    let result = new StringSet(`difference: ${this.name} - ${other.name}`, []);
    for (let [key, value] of thisMap) {
      if (!otherMap.has(key)) {
        result.data.push(value);
      }
    }
    return result;
  }
  /**
   * Computes the intersection between two sets.
   * @param other
   * @returns
   */
  intersection(other: StringSet): StringSet {
    let thisMap = this.map;
    let otherMap = other.map;
    let result = new StringSet(
      `intersection: ${this.name} - ${other.name}`,
      []
    );
    for (let [key, value] of thisMap) {
      if (otherMap.has(key)) {
        result.data.push(value);
      }
    }
    return result;
  }
}

interface Warning {
  message: string;
  val: string;
}
export default ComparePage;
