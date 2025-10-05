"use client";
import { useMemo, useState, useCallback, useEffect } from "react";

/**
 * Dog House Slot — 3x5 board (Hydration-safe + Manual Editor + Empty cells)
 * Tech: Next.js (client component), Tailwind CSS, **no TypeScript**
 *
 * Key Additions
 * - **Manual Mode**: place any symbol at any cell for testing.
 * - **(Empty)** option per cell to leave it blank; helpful to visualize paylines.
 * - **Enforce Column Rule** toggle (no duplicate symbol in a column). Empty is ignored.
 * - **Fill Random** and **Clear (Empty)** helpers.
 * - Hydration-safe: any randomness happens only **after mount**.
 */

/*************************
 * SYMBOLS & PROBABILITIES
 *************************/
const WILD = "Wild_Card";
const SYMBOLS = [
  "Dog_1", // least probable
  "Dog_2",
  "Dog_3",
  "Dog_4",
  "Necklace",
  WILD,
  "Bone",
  "A",
  "K",
  "Q",
  "J",
  "10" // most probable
];

// Relative weights matching your ordering (small → large). Tweak freely.
const DEFAULT_WEIGHTS = {
  Dog_1: 1,
  Dog_2: 2,
  Dog_3: 3,
  Dog_4: 4,
  Necklace: 5,
  [WILD]: 6,
  Bone: 8,
  A: 10,
  K: 12,
  Q: 14,
  J: 16,
  "10": 18
};

/****************
 * PAYLINE SETUP
 ****************/
// Each payline is an array of 5 integers (row index per column), rows are 0..2 (top/middle/bottom)
const PAYLINES = [
  [0, 0, 0, 0, 0], // top
  [1, 1, 1, 1, 1], // middle
  [2, 2, 2, 2, 2], // bottom
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 2, 1, 0, 1],
  [1, 0, 1, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [0, 2, 2, 2, 0],
  [2, 0, 0, 0, 2]
];

/*******************
 * UTILITY HELPERS
 *******************/
function rngInt(max) { return Math.floor(Math.random() * max); }

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rngInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Weighted pick without replacement (choose k unique symbols for one column) */
function pickKDistinctWeighted(symbols, weightsObj, k) {
  const pool = symbols.slice();
  const weights = pool.map(s => weightsObj[s] ?? 1);
  const picks = [];
  for (let i = 0; i < k; i++) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < weights.length; idx++) {
      r -= weights[idx];
      if (r <= 0) break;
    }
    picks.push(pool[idx]);
    pool.splice(idx, 1);
    weights.splice(idx, 1);
  }
  return picks;
}

/*************************
 * SPIN & BOARD GENERATOR
 *************************/
function generateBoard(symbols, weightsObj) {
  const rows = 3, cols = 5;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (let c = 0; c < cols; c++) {
    const columnPicks = pickKDistinctWeighted(symbols, weightsObj, 3);
    shuffleInPlace(columnPicks); // randomize vertical order
    for (let r = 0; r < rows; r++) {
      grid[r][c] = columnPicks[r];
    }
  }
  return grid;
}

/****************
 * WIN DETECTION
 ****************/
function firstKCellsForLine(line, k) {
  return Array.from({ length: k }, (_, i) => [line[i], i]);
}

function evaluateWins(grid) {
  const wins = [];
  if (!grid) return wins;
  const nonWildTargets = SYMBOLS.filter(s => s !== WILD);

  for (let li = 0; li < PAYLINES.length; li++) {
    const line = PAYLINES[li];
    const seq = line.map((rowIndex, colIndex) => grid[rowIndex][colIndex]);

    for (const target of nonWildTargets) {
      let count = 0;
      let sawTarget = false; // avoid pure-wild-only starts
      for (let c = 0; c < 5; c++) {
        const s = seq[c];
        if (s === target || s === WILD) {
          count++;
          if (s === target) sawTarget = true;
        } else break;
      }
      if (sawTarget && count >= 3) {
        wins.push({
          lineIndex: li,
          symbol: target,
          length: count,
          cells: firstKCellsForLine(line, count)
        });
      }
    }
  }
  return wins;
}

/*********************
 * OPTIONAL: PAYTABLE
 *********************/
const DEMO_PAYOUTS = {
  Dog_1: { 3: 25, 4: 100, 5: 400 },
  Dog_2: { 3: 20, 4: 75, 5: 300 },
  Dog_3: { 3: 15, 4: 50, 5: 200 },
  Dog_4: { 3: 12, 4: 35, 5: 150 },
  Necklace: { 3: 10, 4: 25, 5: 100 },
  Bone: { 3: 8, 4: 20, 5: 75 },
  A: { 3: 6, 4: 15, 5: 50 },
  K: { 3: 5, 4: 12, 5: 40 },
  Q: { 3: 4, 4: 10, 5: 35 },
  J: { 3: 3, 4: 8, 5: 25 },
  "10": { 3: 2, 4: 6, 5: 20 }
};

function computePayout(totalBet, wins, paytable = DEMO_PAYOUTS) {
  let sum = 0;
  for (const w of wins) {
    const table = paytable[w.symbol];
    if (!table) continue;
    const mult = table[w.length] || 0;
    sum += totalBet * mult;
  }
  return sum;
}

/*******************
 * COLUMN DUP CHECKS
 *******************/
function getConflictKeySet(grid) {
  const set = new Set();
  if (!grid) return set;
  for (let c = 0; c < 5; c++) {
    const counts = {};
    for (let r = 0; r < 3; r++) {
      const s = grid[r][c];
      if (!s) continue; // ignore empty
      counts[s] = (counts[s] || 0) + 1;
    }
    Object.keys(counts).forEach(sym => {
      if (counts[sym] > 1) {
        for (let r = 0; r < 3; r++) if (grid[r][c] === sym) set.add(`${r}-${c}`);
      }
    });
  }
  return set;
}

/*********
 *  UI
 *********/
export default function DogHouseSlotPage() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [bet, setBet] = useState(1);

  const [board, setBoard] = useState(null); // hydration-safe (filled after mount)
  const [manualMode, setManualMode] = useState(false);
  const [enforceColumnRule, setEnforceColumnRule] = useState(true);

  // Empty marker: use empty string for simplicity
  const EMPTY = "";

  // Options used by manual dropdowns (Empty first)
  const SYM_OPTIONS = useMemo(() => [EMPTY, ...SYMBOLS], []);
  const labelFor = useCallback((s) => (s === EMPTY ? "(Empty)" : s.replace("_", " ")), []);

  useEffect(() => {
    setBoard(generateBoard(SYMBOLS, weights));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wins = useMemo(() => evaluateWins(board), [board]);
  const payout = useMemo(() => computePayout(bet, wins), [bet, wins]);

  const winningCellKeySet = useMemo(() => {
    const set = new Set();
    for (const w of wins) for (const [r, c] of w.cells) set.add(`${r}-${c}`);
    return set;
  }, [wins]);

  const conflictKeySet = useMemo(() => getConflictKeySet(board), [board]);

  const onSpinRandom = useCallback(() => {
    setBoard(generateBoard(SYMBOLS, weights));
  }, [weights]);

  const onClearEmpty = useCallback(() => {
    const rows = 3, cols = 5;
    setBoard(Array.from({ length: rows }, () => Array(cols).fill(EMPTY)));
  }, []);

  const handleCellChange = useCallback((r, c, value) => {
    setBoard(prev => {
      if (!prev) return prev;
      if (enforceColumnRule && value !== EMPTY) {
        for (let rr = 0; rr < 3; rr++) {
          if (rr !== r && prev[rr][c] === value) {
            return prev; // disallow duplicate within column
          }
        }
      }
      const next = prev.map(row => row.slice());
      next[r][c] = value;
      return next;
    });
  }, [enforceColumnRule]);

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center p-4 md:p-8 gap-6">
      <header className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight">The Dog House — 3×5 Slot</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm opacity-80">Bet</label>
          <div className="flex items-center rounded-xl bg-slate-700/60 overflow-hidden">
            <button onClick={() => setBet(b => Math.max(1, b - 1))} className="px-3 py-2 hover:bg-slate-700">−</button>
            <div className="px-4 py-2 min-w-14 text-center font-bold">{bet}</div>
            <button onClick={() => setBet(b => b + 1)} className="px-3 py-2 hover:bg-slate-700">+</button>
          </div>

          <div className="h-6 w-px bg-white/15" />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-emerald-500" checked={manualMode} onChange={e => setManualMode(e.target.checked)} />
            Manual Mode
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-emerald-500" checked={enforceColumnRule} onChange={e => setEnforceColumnRule(e.target.checked)} />
            Enforce Column Rule
          </label>

          {manualMode ? (
            <>
              <button onClick={onClearEmpty} className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 font-semibold">Clear (Empty)</button>
              <button onClick={onSpinRandom} className="px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 font-semibold">Fill Random</button>
            </>
          ) : (
            <button onClick={onSpinRandom} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[.98] transition font-semibold shadow-lg shadow-emerald-900/30">SPIN</button>
          )}
        </div>
      </header>

      {/* BOARD */}
      <div className="w-full max-w-5xl">
        <div className="relative w-full aspect-[5/3]">
          <div className="absolute inset-0 grid grid-cols-5 grid-rows-3 gap-2 p-2 bg-slate-900/30 rounded-3xl ring-1 ring-white/10 shadow-2xl">
            {(board ? board : Array.from({ length: 3 }, () => Array(5).fill(null))).map((row, r) =>
              (row ? row : Array(5).fill(null)).map((sym, c) => {
                const key = `${r}-${c}`;
                const isWin = board ? winningCellKeySet.has(key) : false;
                const isConflict = board ? conflictKeySet.has(key) : false;
                return (
                  <div
                    key={key}
                    className={
                      "relative rounded-2xl flex items-center justify-center text-center select-none " +
                      "border border-white/10 bg-slate-800/80 backdrop-blur-sm shadow-xl " +
                      (isWin ? " ring-4 ring-amber-400 shadow-amber-900/30 " : "") +
                      (isConflict ? " outline outline-2 outline-rose-500/80 " : "")
                    }
                  >
                    {!board ? (
                      <div className="h-6 w-16 sm:h-8 sm:w-24 md:h-10 md:w-28 rounded bg-slate-600/40 animate-pulse" />
                    ) : manualMode ? (
                      <select
                        className="text-black text-xs sm:text-sm md:text-base rounded-lg px-2 py-1 bg-white/90 shadow pointer-events-auto"
                        value={sym}
                        onChange={(e) => handleCellChange(r, c, e.target.value)}
                      >
                        {SYM_OPTIONS.map((s, idx) => (
                          <option key={String(s) + '-' + idx} value={s}>{labelFor(s)}</option>
                        ))}
                      </select>
                    ) : (
                      sym === "" ? (
                        <span className="opacity-30 text-sm">·</span>
                      ) : (
                        // TODO: Swap for <img src={`/symbols/${sym}.png`} alt={sym} className="w-3/4 h-3/4 object-contain"/>
                        <span className="px-2 text-xs sm:text-sm md:text-lg font-extrabold tracking-wide">
                          {labelFor(sym)}
                        </span>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <section className="w-full max-w-5xl grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 bg-slate-800/60 ring-1 ring-white/10">
          <h2 className="text-lg font-bold mb-2">Wins</h2>
          {!board ? (
            <p className="opacity-70">Spinning…</p>
          ) : wins.length === 0 ? (
            <p className="opacity-70">No win this spin. Try again! 🐾</p>
          ) : (
            <ul className="space-y-2">
              {wins.map((w, i) => (
                <li key={i} className="flex items-center justify-between bg-slate-900/40 rounded-xl px-3 py-2">
                  <div>
                    <div className="font-semibold">{w.symbol.replace("_", " ")}</div>
                    <div className="text-xs opacity-70">Line #{w.lineIndex + 1} • {w.length} in a row (left-to-right)</div>
                  </div>
                  <div className="text-emerald-300 text-sm font-bold">× {DEMO_PAYOUTS[w.symbol]?.[w.length] ?? 0}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl p-4 bg-slate-800/60 ring-1 ring-white/10 space-y-2">
          <h2 className="text-lg font-bold">Payout (Demo)</h2>
          <p className="text-sm opacity-80">Using demo multipliers; replace with your real paytable.</p>
          <div className="mt-1 flex items-center justify-between bg-slate-900/50 rounded-xl px-4 py-3">
            <div className="text-sm">Bet</div>
            <div className="font-bold">{bet}</div>
          </div>
          <div className="flex items-center justify-between bg-slate-900/50 rounded-xl px-4 py-3">
            <div className="text-sm">Total Payout</div>
            <div className="font-extrabold text-emerald-400">{!board ? 0 : payout}</div>
          </div>
          {board && conflictKeySet.size > 0 && (
            <div className="text-rose-300 text-xs">Warning: duplicate symbols detected in one or more columns (violates column rule).</div>
          )}
        </div>
      </section>

      {/* WEIGHTS (debug) */}
      <details className="w-full max-w-5xl open:rounded-2xl open:bg-slate-800/40 open:ring-1 open:ring-white/10">
        <summary className="cursor-pointer px-4 py-3 text-sm opacity-80">Symbol Weights (Debug)</summary>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {SYMBOLS.map((s) => (
            <div key={s} className="flex items-center justify-between bg-slate-900/40 rounded-xl px-3 py-2">
              <span className="text-xs sm:text-sm font-semibold">{s.replace("_", " ")}</span>
              <div className="flex items-center">
                <button className="px-2 text-lg" onClick={() => setWeights(w => ({...w, [s]: Math.max(1, (w[s] ?? 1) - 1)}))}>−</button>
                <span className="w-8 text-center font-bold">{weights[s] ?? 1}</span>
                <button className="px-2 text-lg" onClick={() => setWeights(w => ({...w, [s]: (w[s] ?? 1) + 1}))}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4"><button onClick={onSpinRandom} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-semibold">Re-spin with new weights</button></div>
      </details>

      <footer className="opacity-70 text-xs md:text-sm text-center max-w-3xl">
        <p>
          Manual testing: toggle Manual Mode to place symbols or (Empty) per cell. Wild bridges runs. Wins require 3+ contiguous from leftmost along a valid payline. Column rule toggle lets you test edge cases.
        </p>
      </footer>
    </div>
  );
}
