import { useMemo } from 'react';
import './PatternGrid.css';

const PATTERNS = [
  'hstripes', 'vstripes', 'diagstripes', 'sunburst', 'checker',
  'squares', 'starburst', 'diamonds', 'boldgrid', 'chevron'
];

const PALETTES = [
  { bg: '#ff006e', c1: '#00b4d8', c2: '#ffd166' },
  { bg: '#7c4dff', c1: '#ff9100', c2: '#00e676' },
  { bg: '#06d6a0', c1: '#d500f9', c2: '#ff6b6b' },
  { bg: '#00e5ff', c1: '#ff006e', c2: '#ffd166' },
  { bg: '#ffd166', c1: '#7c4dff', c2: '#00b4d8' },
  { bg: '#ff6b6b', c1: '#00e676', c2: '#ffd166' },
  { bg: '#d500f9', c1: '#00e5ff', c2: '#ff9100' },
  { bg: '#ff9100', c1: '#7c4dff', c2: '#06d6a0' },
  { bg: '#00b4d8', c1: '#ff006e', c2: '#06d6a0' },
  { bg: '#00e676', c1: '#ff6b6b', c2: '#7c4dff' },
];

const ROWS = 4;
const COLS = 5;
const TOTAL = ROWS * COLS;
const EMPTY = new Set([5, 10, 11, 15, 16, 17]);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const PatternGrid = () => {
  const cells = useMemo(() => {
    const filledCount = TOTAL - EMPTY.size;

    const pats = [];
    const pals = [];
    for (let i = 0; i < filledCount; i++) {
      pats.push(PATTERNS[i % PATTERNS.length]);
      pals.push(PALETTES[i % PALETTES.length]);
    }
    shuffle(pats);
    shuffle(pals);

    let idx = 0;
    return Array.from({ length: TOTAL }, (_, i) => {
      if (EMPTY.has(i)) return { empty: true };
      const cell = { pattern: pats[idx], palette: pals[idx] };
      idx++;
      return cell;
    });
  }, []);

  return (
    <div className="pattern-grid" aria-hidden="true">
      {cells.map((cell, i) =>
        cell.empty ? (
          <div key={i} className="grid-cell grid-cell-empty" />
        ) : (
          <div
            key={i}
            className={`grid-cell pattern-${cell.pattern}`}
            style={{
              '--bg': cell.palette.bg,
              '--c1': cell.palette.c1,
              '--c2': cell.palette.c2,
            }}
          />
        )
      )}
    </div>
  );
};

export default PatternGrid;
