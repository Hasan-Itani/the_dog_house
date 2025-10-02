// components/SlotBoard.jsx
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
import { Reel } from "./Reel"; // NEW
import { payoutTable as RAW_PAYOUTS } from "../hooks/payoutTable";

/** ---------------- constants ---------------- */
const ROWS = 3;
const COLS = 5;
const GAP = 30;
const WILD_KEY = "doghouse.png";

const SYMBOLS = [
  "dog.png",
  "milu.png",
  "pug.png",
  "taxa.png",
  "collar.png",
  "doghouse.png",
  "bone.png",
  "a.png",
  "k.png",
  "q.png",
  "j.png",
  "ten.png",
];

const DEFAULT_WEIGHTS = {
  "dog.png": 1,
  "milu.png": 2,
  "pug.png": 3,
  "taxa.png": 4,
  "collar.png": 6,
  "doghouse.png": 7, // ← add this
  "bone.png": 8,
  "a.png": 10,
  "k.png": 12,
  "q.png": 14,
  "j.png": 16,
  "ten.png": 18,
};
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

const PAYOUTS = { ...RAW_PAYOUTS };

/** ---------------- helpers ---------------- */
const rngInt = (max) => Math.floor(Math.random() * max);
const toKey = (name) => name;
const clearPath = (name) => `/symbols/clear_symbols/${name}`;
const blurPath = (name) =>
  `/symbols/blur_symbols/${name.replace(/\.png$/i, "_blur.png")}`;

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
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let c = 0; c < COLS; c++) {
    const picks = pickKDistinctWeighted(symbols, weightsObj, ROWS);
    shuffleInPlace(picks);
    for (let r = 0; r < ROWS; r++) grid[r][c] = picks[r];
  }
  return grid; // [row][col] => filename
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
    for (const target of SYMBOLS.filter((s) => s !== WILD_KEY)) {
      let count = 0;
      for (let c = 0; c < COLS; c++) {
        const s = seq[c];
        if (s === target || s === WILD_KEY) count++;
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

// --- helper: additive wild rule (Doghouse 2x/3x) ---
function lineWinWithWilds({ symbolsOnLine, totalBet, payouts }) {
  // symbolsOnLine: [{ key: "dog.png" | WILD_KEY, mult?: 2|3 }, ...] (left→right)
  const baseKey = symbolsOnLine.find((c) => c && c.key !== WILD_KEY)?.key;
  if (!baseKey || !payouts[baseKey]) {
    return { baseKey: null, count: 0, baseWin: 0, wildMults: [], winAmount: 0 };
  }

  // count contiguous from the left while (cell is base OR wild)
  let count = 0;
  const used = [];
  for (const cell of symbolsOnLine) {
    if (!cell) break;
    if (cell.key === baseKey || cell.key === WILD_KEY) {
      used.push(cell);
      count++;
    } else {
      break;
    }
  }

  // payout tier (3/4/5 of the base symbol) as multiplier × totalBet
  const tierMult = payouts[baseKey]?.[count]; // e.g. {3:0.25,4:0.75,5:3.75}
  if (!tierMult) {
    return { baseKey, count, baseWin: 0, wildMults: [], winAmount: 0 };
  }

  const baseWin = tierMult * totalBet;

  // additive wilds: 2x+3x = 5× base (no wilds → factor=1)
  const wildMults = used
    .filter((c) => c.key === WILD_KEY && (c.mult === 2 || c.mult === 3))
    .map((c) => c.mult);

  const factor = wildMults.length ? wildMults.reduce((s, m) => s + m, 0) : 1;

  return {
    baseKey,
    count,
    baseWin,
    wildMults,
    winAmount: baseWin * factor,
  };
}
function computeTotalWin({ board, wild, totalBet }) {
  let amount = 0;
  const items = [];

  for (let i = 0; i < PAYLINES.length; i++) {
    const rowIdxs = PAYLINES[i];

    // build the 5 cells on this payline with { key, mult }
    const symbolsOnLine = Array.from({ length: COLS }, (_, c) => {
      const r = rowIdxs[c];
      return { key: board[r][c], mult: wild[r][c] || undefined };
    });

    // uses your additive wild rule (already defined above)
    const res = lineWinWithWilds({
      symbolsOnLine,
      totalBet,
      payouts: PAYOUTS,
    });

    if (res.winAmount > 0) {
      amount += res.winAmount;
      items.push({
        img: `clear_symbols/${res.baseKey}`, // BetControls expects "symbols/<img>"
        count: res.count,
        amount: res.winAmount,
      });
    }
  }

  items.sort((a, b) => b.amount - a.amount);
  return { total: amount, items: items.slice(0, 1) };
}

/** ---------------- component ---------------- */
const SlotBoard = forwardRef(function SlotBoard(
  {
    imagesPath = "/symbols/clear_symbols", // kept for compatibility
    weights = DEFAULT_WEIGHTS,
    totalBet = 0,
    onWin,
    onBoardStateChange,
    className = "",
    frameSrc = "/bet_bg.png",
    showFrame = true,
    frameScale = 1.2,
    symbolsBoxClassName = "top-20 w-[74%] h-[65%] border border-white/10",
    symbolsBoxStyle,
    // reel timing (matches your older project feel)
    startStaggerMs = 120, // cascade the reel spin start
    stopBaseMs = 2000, // first reel stop time
    stopStepMs = 800, // extra per subsequent reel
  },
  ref
) {
  const [wildMult, setWildMult] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );

  // measure box height to compute cell size
  const boxRef = useRef(null);
  const [cellSize, setCellSize] = useState(120);
  // measure box to compute cell size (fits both width and height, includes gaps)
  useEffect(() => {
    const recalc = () => {
      if (!boxRef.current) return;
      const w = boxRef.current.clientWidth;
      const h = boxRef.current.clientHeight;

      // fit by width (cols) and by height (rows), subtracting the gaps
      const sizeByW = Math.floor((w - (COLS - 1) * 7) / COLS);
      const sizeByH = Math.floor((h - (ROWS - 1) * 7) / ROWS);

      // clamp to keep it crisp on small/large screens
      const size = Math.max(56, Math.min(160, Math.min(sizeByW, sizeByH)));
      setCellSize(size);
    };

    const ro = new ResizeObserver(recalc);
    if (boxRef.current) ro.observe(boxRef.current);
    recalc();
    return () => ro.disconnect();
  }, []);

  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState(null); // visible final grid
  const [reelSpin, setReelSpin] = useState(Array(COLS).fill(false)); // per-reel spinning
  const [spinningAll, setSpinningAll] = useState(false); // master flag for UI

  const timeoutsRef = useRef([]);
  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    setMounted(true);
    if (!board) {
      const first = generateBoard(SYMBOLS, weights);
      setBoard(first);
    }
  }, [board, weights]);

  // build result columns (3 symbols per column)
  const resultColumns = useMemo(() => {
    if (!board)
      return Array.from({ length: COLS }, () =>
        Array.from({ length: ROWS }, () => ({ key: "", img: "" }))
      );
    return Array.from({ length: COLS }, (_, c) =>
      Array.from({ length: ROWS }, (_, r) => {
        const name = board[r][c]; // filename e.g. "doghouse.png"

        return {
          key: toKey(name),
          img: clearPath(name),
          mult: wildMult[r][c] || undefined, // ← badge source
        };
      })
    );
  }, [board, wildMult]);

  // build blurred spinning strips (regenerated each spin start)
  const makeBlurStrip = () => {
    const L = 50; // length of a strip
    return Array.from({ length: L }, () => {
      const n = SYMBOLS[rngInt(SYMBOLS.length)];
      return { key: toKey(n), img: blurPath(n) };
    });
  };
  const [blurStrips, setBlurStrips] = useState(
    Array.from({ length: COLS }, makeBlurStrip)
  );

  // wins highlight
  const wins = useMemo(() => evaluateWins(board), [board]);
  const winningKeySet = useMemo(() => {
    const set = new Set();
    for (const w of wins) for (const [r, c] of w.cells) set.add(`${r}-${c}`);
    return set;
  }, [wins]);

  // EXPOSED API
  useImperativeHandle(ref, () => ({
    tumbleAll: ({ speedMultiplier = 1 } = {}) => {
      if (spinningAll || !mounted) return false;
      startSpin(Math.max(1, Number(speedMultiplier) || 1));
      return true;
    },
  }));

  // main spin orchestrator — EXACT reel pattern:
  const startSpin = useCallback(
    (speed) => {
      onBoardStateChange?.("spinning");
      setSpinningAll(true);

      // fresh blur strips each spin
      setBlurStrips(Array.from({ length: COLS }, makeBlurStrip));

      // all reels start spinning (with CSS animationDelay per reel)
      setReelSpin(Array(COLS).fill(true));

      // compute next result now (deterministic result)
      const next = generateBoard(SYMBOLS, weights);
      // Precompute which doghouses are 2x vs 3x for the NEXT board
      const wildNext = Array.from({ length: ROWS }, () =>
        Array(COLS).fill(null)
      );
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (next[r][c] === "doghouse.png") {
            wildNext[r][c] = Math.random() < 0.7 ? 2 : 3; // 70% 2x, 30% 3x
          }
        }
      }

      // stopping schedule (scaled if you later want to use speed)
      const base = stopBaseMs; // could scale with 1/speed if desired
      const step = stopStepMs;

      for (let c = 0; c < COLS; c++) {
        const t = setTimeout(() => {
          // stop this reel
          setReelSpin((prev) => {
            const arr = [...prev];
            arr[c] = false;
            return arr;
          });
          // reveal this column of the next result
          setBoard((prev) => {
            const grid = prev
              ? prev.map((row) => [...row])
              : Array.from({ length: ROWS }, () => Array(COLS).fill(null));
            for (let r = 0; r < ROWS; r++) grid[r][c] = next[r][c];
            return grid;
          });
          // 3) reveal this column's WILD multipliers (so Cell can show 2x/3x)
          setWildMult((prev) => {
            const grid = prev
              ? prev.map((row) => [...row])
              : Array.from({ length: ROWS }, () => Array(COLS).fill(null));
            for (let r = 0; r < ROWS; r++) grid[r][c] = wildNext[r][c];
            return grid;
          });
          // after last reel stops, finish
          if (c === COLS - 1) {
            setSpinningAll(false);
            // compute payout now that the full board & wildNext are known
            const finalPayout = computeTotalWin({
              board: next,
              wild: wildNext,
              totalBet,
            });
            onWin?.(finalPayout);
            onBoardStateChange?.("idle");
          }
        }, base + c * step);
        timeoutsRef.current.push(t);
      }
    },
    [onBoardStateChange, onWin, totalBet, weights, stopBaseMs, stopStepMs]
  );
  // Pick 2x or 3x for each doghouse in the stopped grid
  function decorateWildsInResult(resultColumns) {
    // resultColumns: Array<column> where column = Array<{ key, img, ... }>
    return resultColumns.map((col) =>
      col.map((cell) => {
        if (cell.key === "doghouse.png") {
          const mult = Math.random() < 0.7 ? 2 : 3; // tweak probability if you want
          // use CLEAR asset for stopped state; keep same `img` path logic you already have
          return { ...cell, mult }; // Cell.jsx will render the badge
        }
        return cell;
      })
    );
  }
  const WILD_KEY = "doghouse.png";

  return (
    <div
      className={
        "relative mx-auto " +
        (className || " w-[min(94vw,1200px)] aspect-[5/3] ")
      }
    >
      {/* Frame behind symbols */}
      {showFrame && (
        <div
          className="absolute inset-0 pointer-events-none select-none z-0 bottom-20"
          style={{
            transform: `scale(${frameScale})`,
            transformOrigin: "center",
          }}
        >
          <Image
            src={frameSrc}
            alt="frame"
            fill
            className="object-contain"
            priority={false}
          />
        </div>
      )}

      {/* SYMBOLS PARENT BOX */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div
          ref={boxRef}
          className={"relative overflow-hidden " + (symbolsBoxClassName || "")}
          style={symbolsBoxStyle}
        >
          {/* Reels row */}
          <div
            className="absolute inset-0 grid "
            style={{
              gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
              gap: `${GAP}px`,
            }}
          >
            {Array.from({ length: COLS }, (_, c) => (
              <Reel
                key={c}
                spinning={reelSpin[c]}
                visibleRows={ROWS}
                cellSize={cellSize}
                strip={blurStrips[c]}
                resultColumn={resultColumns[c] || []}
                startDelayMs={c * startStaggerMs}
                cellGapPx={7}
              />
            ))}
          </div>

          {/* Win overlay rings when idle */}
          {!spinningAll && board ? (
            <div
              className="pointer-events-none absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
                gap: `${GAP}px`,
              }}
            >
              {Array.from({ length: ROWS }).map((_, r) =>
                Array.from({ length: COLS }).map((_, c) => {
                  const k = `${r}-${c}`;
                  return (
                    <div
                      key={k}
                      className={
                        "rounded " +
                        (winningKeySet.has(k) ? " ring-4 ring-amber-400 " : "")
                      }
                    />
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});

export default SlotBoard;
