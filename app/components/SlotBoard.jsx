"use client";
import Image from "next/image";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { payoutTable as RAW_PAYOUTS } from "../hooks/payoutTable"; // multipliers × TOTAL BET

/**
 * SlotBoard — 3×5 grid (images) + programmatic spin API
 *
 * ✓ Images instead of text labels (from /public/symbols/clear_symbols)
 * ✓ Exposes `tumbleAll({ speedMultiplier })` via ref — used by BetControls
 * ✓ Calls `onBoardStateChange("spinning"|"idle")` and `onWin({ total, items })`
 * ✓ Hydration‑safe (no RNG until after mount)
 */

// --- SYMBOL SET (filenames in /public/symbols/clear_symbols) ---
const SYMBOLS = [
  "dog.png",
  "milu.png", // NOTE: payoutTable may use "milu.png" — alias handled below
  "pug.png",
  "taxa.png",
  "collar.png",
  "bone.png",
  "a.png",
  "k.png",
  "q.png",
  "j.png",
  "ten.png",
];

// Small weights (rarer) → big weights (more common). Tweak as you like.
const DEFAULT_WEIGHTS = {
  "dog.png": 1,
  "milu.png": 2,
  "pug.png": 3,
  "taxa.png": 4,
  "collar.png": 6,
  "bone.png": 8,
  "a.png": 10,
  "k.png": 12,
  "q.png": 14,
  "j.png": 16,
  "ten.png": 18,
};

// 20 classic lines (rows are 0..2 → top/middle/bottom)
const PAYLINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
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
  [2, 0, 0, 0, 2],
];

// ---------- utils ----------
const rngInt = (max) => Math.floor(Math.random() * max);

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rngInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** pick k distinct symbols for a single column using weights */
function pickKDistinctWeighted(symbols, weightsObj, k) {
  const pool = symbols.slice();
  const weights = pool.map((s) => weightsObj[s] ?? 1);
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

function generateBoard(symbols, weightsObj) {
  const rows = 3,
    cols = 5;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (let c = 0; c < cols; c++) {
    const columnPicks = pickKDistinctWeighted(symbols, weightsObj, 3);
    shuffleInPlace(columnPicks);
    for (let r = 0; r < rows; r++) grid[r][c] = columnPicks[r];
  }
  return grid; // [row][col] => symbol filename
}

function firstKCellsForLine(line, k) {
  return Array.from({ length: k }, (_, i) => [line[i], i]); // [row,col]
}

function evaluateWins(grid) {
  const wins = [];
  if (!grid) return wins;

  for (let li = 0; li < PAYLINES.length; li++) {
    const line = PAYLINES[li];
    const seq = line.map((rowIndex, colIndex) => grid[rowIndex][colIndex]);

    for (const target of SYMBOLS) {
      let count = 0;
      for (let c = 0; c < 5; c++) {
        const s = seq[c];
        if (s === target) count++;
        else break;
      }
      if (count >= 3) {
        wins.push({
          lineIndex: li,
          symbol: target,
          length: count,
          cells: firstKCellsForLine(line, count),
        });
      }
    }
  }
  return wins;
}

// payout table aliasing (milo↔milu safety)
const PAYOUTS = {
  ...RAW_PAYOUTS,
  "milo.png": RAW_PAYOUTS["milo.png"] || RAW_PAYOUTS["milu.png"],
};

function computePayout(totalBet, wins) {
  let total = 0;
  const items = [];
  for (const w of wins) {
    const row = PAYOUTS[w.symbol] || {};
    const mult = row[w.length] || 0; // multiplier × TOTAL BET
    const amount = (mult || 0) * (Number(totalBet) || 0);
    if (amount > 0) {
      total += amount;
      items.push({ img: `clear_symbols/${w.symbol}`, count: w.length, amount });
    }
  }
  // Keep only the top single item (suits your center subline logic)
  items.sort((a, b) => b.amount - a.amount);
  return { total, items: items.slice(0, 1) };
}

const SlotBoard = forwardRef(function SlotBoard(
  {
    imagesPath = "/symbols/clear_symbols", // where your PNGs live
    weights = DEFAULT_WEIGHTS,
    totalBet = 0,
    onWin, // ({ total, items })
    onBoardStateChange, // ("spinning"|"idle")
    className = "",
  },
  ref
) {
  const [mounted, setMounted] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [board, setBoard] = useState(null); // 3×5 of filenames

  // highlight set for the latest result
  const wins = useMemo(() => evaluateWins(board), [board]);
  const winningKeySet = useMemo(() => {
    const set = new Set();
    for (const w of wins) for (const [r, c] of w.cells) set.add(`${r}-${c}`);
    return set;
  }, [wins]);

  useEffect(() => setMounted(true), []);

  // Expose programmatic spin API
  useImperativeHandle(ref, () => ({
    tumbleAll: ({ speedMultiplier = 1 } = {}) => {
      if (spinning) return false;
      if (!mounted) return false;

      setSpinning(true);
      onBoardStateChange?.("spinning");

      // Generate new board instantly, then reveal after a short delay (simulate spin)
      const next = generateBoard(SYMBOLS, weights);
      setBoard(next);

      const { total, items } = computePayout(totalBet, evaluateWins(next));

      const base = 1200; // ms
      const ms = Math.max(300, Math.floor(base / Math.max(1, speedMultiplier)));
      const t = setTimeout(() => {
        onWin?.({ total, items });
        setSpinning(false);
        onBoardStateChange?.("idle");
      }, ms);

      return true;
    },
  }));

  // First board after mount (so hydration is safe)
  useEffect(() => {
    if (!mounted || board) return;
    setBoard(generateBoard(SYMBOLS, weights));
  }, [mounted, board, weights]);

  return (
    <div
      className={
        "relative mx-auto " +
        (className || " w-[min(94vw,1200px)] aspect-[5/3] ")
      }
    >
        
      {/* glassy container */}
      <div className="absolute inset-0 p-2 grid grid-cols-5 grid-rows-3 gap-2">
        {(board
          ? board
          : Array.from({ length: 3 }, () => Array(5).fill(null))
        ).map((row, r) =>
          (row ? row : Array(5).fill(null)).map((sym, c) => {
            const key = `${r}-${c}`;
            const isWin = board ? winningKeySet.has(key) : false;
            return (
              <div
                key={key}
                className={
                  "relative rounded-xl overflow-hidden border border-white/10 flex items-center justify-center " +
                  (isWin ? " ring-4 ring-amber-400 " : "")
                }
              >
                {!board ? (
                  <div className="h-6 w-16 sm:h-8 sm:w-24 md:h-10 md:w-28 rounded bg-slate-600/40 animate-pulse" />
                ) : sym ? (
                  <Image
                    src={`${imagesPath}/${sym}`}
                    alt={sym}
                    fill
                    className="object-contain p-1"
                    unoptimized
                    priority={false}
                  />
                ) : (
                  <span className="opacity-20 text-lg">·</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default SlotBoard;
