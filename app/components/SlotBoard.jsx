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
import { Reel } from "./Reel";
import { payoutTable as RAW_PAYOUTS } from "../hooks/payoutTable";

/** ---------------- constants ---------------- */
const ROWS = 3;
const COLS = 5;
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
  "doghouse.png": 7,
  "bone.png": 8,
  "a.png": 10,
  "k.png": 12,
  "q.png": 14,
  "j.png": 16,
  "ten.png": 18,
};

// 21 стандартная линия Dog House
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
  return grid;
}

function firstKCellsForLine(line, k) {
  return Array.from({ length: k }, (_, i) => [line[i], i]);
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

function lineWinWithWilds({ symbolsOnLine, totalBet, payouts }) {
  const baseKey = symbolsOnLine.find((c) => c && c.key !== WILD_KEY)?.key;
  if (!baseKey || !payouts[baseKey]) {
    return { baseKey: null, count: 0, baseWin: 0, wildMults: [], winAmount: 0 };
  }

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

  const tierMult = payouts[baseKey]?.[count];
  if (!tierMult) {
    return { baseKey, count, baseWin: 0, wildMults: [], winAmount: 0 };
  }

  const baseWin = tierMult * totalBet;
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
    const symbolsOnLine = Array.from({ length: COLS }, (_, c) => {
      const r = rowIdxs[c];
      return { key: board[r][c], mult: wild[r][c] || undefined };
    });

    const res = lineWinWithWilds({
      symbolsOnLine,
      totalBet,
      payouts: PAYOUTS,
    });

    if (res.winAmount > 0) {
      amount += res.winAmount;
      items.push({
        img: `clear_symbols/${res.baseKey}`,
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
    weights = DEFAULT_WEIGHTS,
    totalBet = 0,
    onWin,
    onBoardStateChange,
    frameSrc = "/bet_bg.png",
    showFrame = true,
    frameScale = 1.25,
    startStaggerMs = 120,
    stopBaseMs = 2000,
    stopStepMs = 800,
  },
  ref
) {
  const [wildMult, setWildMult] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [board, setBoard] = useState(null);
  const [reelSpin, setReelSpin] = useState(Array(COLS).fill(false));
  const [spinningAll, setSpinningAll] = useState(false);

  const boxRef = useRef(null);
  const [cellSize, setCellSize] = useState(100);
  const [gap, setGap] = useState(6);
  const [padding, setPadding] = useState(10);

  // 🔸 адаптация под 16:9 слот
  useEffect(() => {
    const recalc = () => {
      if (!boxRef.current) return;
      const w = boxRef.current.clientWidth;
      const h = (w / 16) * 9; // 16:9

      boxRef.current.style.height = `${h}px`;

      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
      const baseGap = isMobile ? 25 : isTablet ? 50 : 72;
      const pad = isMobile ? 6 : 10;

      const gridW = w * 0.85;
      const gridH = h * 0.75;
      const sizeByW = (gridW - (COLS - 1) * baseGap) / COLS;
      const sizeByH = (gridH - (ROWS - 1) * baseGap) / ROWS;
      const size = Math.min(sizeByW, sizeByH);

      setCellSize(size);
      setGap(baseGap);
      setPadding(pad);
    };

    const ro = new ResizeObserver(recalc);
    if (boxRef.current) ro.observe(boxRef.current);
    window.addEventListener("resize", recalc);
    recalc();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, []);

  // --- core logic ---
  const makeBlurStrip = () => {
    const L = 40;
    return Array.from({ length: L }, () => {
      const n = SYMBOLS[rngInt(SYMBOLS.length)];
      return { key: n, img: blurPath(n) };
    });
  };

  const [blurStrips, setBlurStrips] = useState(
    Array.from({ length: COLS }, makeBlurStrip)
  );

  useEffect(() => {
    if (!board) setBoard(generateBoard(SYMBOLS, weights));
  }, [board, weights]);

  const wins = useMemo(() => evaluateWins(board), [board]);
  const winningKeySet = useMemo(() => {
    const set = new Set();
    for (const w of wins) for (const [r, c] of w.cells) set.add(`${r}-${c}`);
    return set;
  }, [wins]);

  const resultColumns = useMemo(() => {
    if (!board)
      return Array.from({ length: COLS }, () =>
        Array.from({ length: ROWS }, () => ({ key: "", img: "" }))
      );
    return Array.from({ length: COLS }, (_, c) =>
      Array.from({ length: ROWS }, (_, r) => ({
        key: board[r][c],
        img: clearPath(board[r][c]),
        mult: wildMult[r][c],
      }))
    );
  }, [board, wildMult]);

  useImperativeHandle(ref, () => ({
    tumbleAll: () => {
      if (spinningAll) return false;
      startSpin();
      return true;
    },
  }));

  const startSpin = useCallback(() => {
    onBoardStateChange?.("spinning");
    setSpinningAll(true);
    setBlurStrips(Array.from({ length: COLS }, makeBlurStrip));
    setReelSpin(Array(COLS).fill(true));

    const next = generateBoard(SYMBOLS, weights);
    const wildNext = Array.from({ length: ROWS }, () =>
      Array(COLS).fill(null)
    );

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (next[r][c] === WILD_KEY) {
          wildNext[r][c] = Math.random() < 0.7 ? 2 : 3;
        }
      }
    }

    for (let c = 0; c < COLS; c++) {
      setTimeout(() => {
        setReelSpin((prev) => {
          const arr = [...prev];
          arr[c] = false;
          return arr;
        });

        setBoard((prev) => {
          const g = prev
            ? prev.map((r) => [...r])
            : Array.from({ length: ROWS }, () => Array(COLS).fill(null));
          for (let r = 0; r < ROWS; r++) g[r][c] = next[r][c];
          return g;
        });

        setWildMult((prev) => {
          const g = prev
            ? prev.map((r) => [...r])
            : Array.from({ length: ROWS }, () => Array(COLS).fill(null));
          for (let r = 0; r < ROWS; r++) g[r][c] = wildNext[r][c];
          return g;
        });

        if (c === COLS - 1) {
          setSpinningAll(false);
          const payout = computeTotalWin({ board: next, wild: wildNext, totalBet });
          onWin?.(payout);
          onBoardStateChange?.("idle");
        }
      }, stopBaseMs + c * stopStepMs);
    }
  }, [onBoardStateChange, onWin, weights, stopBaseMs, stopStepMs, totalBet]);

  /** render **/
  return (
    <div
      ref={boxRef}
      className="
        relative mb-[5%] w-full max-w-[1200px] mx-auto aspect-[16/9]
        flex items-center justify-center
      "
    >
      {/* background */}
      {showFrame && (
        <div
          className="absolute inset-0 pointer-events-none select-none z-0"
          style={{ transform: `scale(${frameScale})` }}
        >
          <Image
            src={frameSrc}
            alt="frame"
            fill
            className="object-contain"
            priority={false}
          />
          <div className="block sm:hidden absolute top-[-30%] left-5 w-full z-10 flex justify-center pointer-events-none select-none">
            <div className="relative w-[70vw] max-w-[700px]">
              <Image
                src="/loading_part.png"
                alt="dogs"
                width={700}
                height={260}
                className="w-full h-auto object-contain"
                priority
                sizes="90vw"
              />
            </div>
          </div>
          <div className="block absolute sm:top-[12%] left-0 w-full z-10 flex justify-center pointer-events-none select-none">
            <div className="relative w-[70vw] max-w-[700px]">
              <Image
                src="/logo_jp.png"
                alt="dogs"
                width={700}
                height={260}
                className="w-full h-auto object-contain"
                priority
                sizes="90vw"
              />
            </div>
          </div>
          <div className="block absolute sm:top-[80%] right-[35%] top-[80%] right-[35%] w-full z-10 flex justify-center pointer-events-none select-none">
            <div className="relative w-[70vw] max-w-[6%]">
              <Image
                src="/grass_1.png"
                alt="grass"
                width={50}
                height={50}
                className="w-full h-auto object-contain animate_rounded_normal"
                priority
                sizes="20vw"
              />
            </div>
          </div>
          <div className="block absolute sm:top-[80%] left-[15%] top-[80%] left-[33%] w-full z-10 flex justify-center pointer-events-none select-none">
            <div className="relative w-[20vw] max-w-[6%]">
              <Image
                src="/grass_1.png"
                alt="grass"
                width={50}
                height={50}
                className="w-full h-auto object-contain animate_rounded"
                priority
                sizes="20vw"
              />
            </div>
          </div>
          <div className="block absolute sm:top-[12%] left-0 w-full z-10 flex justify-center pointer-events-none select-none">
            <div className="relative w-[70vw] max-w-[700px]">
              <Image
                src="/logo_jp.png"
                alt="dogs"
                width={700}
                height={260}
                className="w-full h-auto object-contain"
                priority
                sizes="90vw"
              />
            </div>
          </div>
        </div>
      )}

      {/* grid */}
      <div
        className="absolute inset-x-0 top-[37%] bottom-0 z-10 flex items-center justify-center"
      >
        <div
          className="relative overflow-hidden rounded-xl border border-white/10 "
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
            gap: `${gap}px`,
            padding: `${padding}px`,
          }}
        >
          {Array.from({ length: COLS }, (_, c) => (
            <Reel
              key={c}
              spinning={reelSpin[c]}
              visibleRows={ROWS}
              cellSize={cellSize}
              strip={blurStrips[c]}
              resultColumn={resultColumns[c]}
              startDelayMs={c * startStaggerMs}
              cellGapPx={gap}
            />
          ))}

          {/* glowing win rings */}
          {!spinningAll &&
            Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((_, c) => {
                const k = `${r}-${c}`;
                const ring = winningKeySet.has(k);
                const ringSize =
                  cellSize > 80 ? 4 : cellSize > 50 ? 3 : 2;
                return (
                  <div
                    key={k}
                    className={`absolute rounded transition-all duration-300 ${
                      ring
                        ? `ring-${ringSize} ring-yellow-400 shadow-lg shadow-yellow-300/40 animate-pulse`
                        : ""
                    }`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      top: r * (cellSize + gap) + padding,
                      left: c * (cellSize + gap) + padding,
                    }}
                  />
                );
              })
            )}
        </div>
      </div>
    </div>
  );
});

export default SlotBoard;
