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

// Visible symbol set (PNG names). Note: "milu.png" (not "milo").
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

// 21 paylines (Dog House-style)
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
const gifPath = (name) => `/symbols/gifs/${name.replace(/\.png$/i, ".gif")}`;

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

  // Your custom additive wild rule: 2x + 3x = ×5; no wilds => ×1
  const factor = wildMults.length ? wildMults.reduce((s, m) => s + m, 0) : 1;

  return {
    baseKey,
    count,
    baseWin,
    wildMults,
    winAmount: baseWin * factor,
    factor,
  };
}

/** Collect every winning line with details + handy maps for overlays/banners */
function collectLineWins({ board, wild, totalBet }) {
  const lineWins = [];
  if (!board || !wild)
    return {
      lineWins,
      roundTotal: 0,
      winCellsByKey: new Map(),
      bestBySymbol: new Map(),
    };

  for (let li = 0; li < PAYLINES.length; li++) {
    const rowIdxs = PAYLINES[li];

    const symbolsOnLine = Array.from({ length: COLS }, (_, c) => {
      const r = rowIdxs[c];
      return { key: board[r][c], mult: wild[r][c] || undefined };
    });

    const res = lineWinWithWilds({ symbolsOnLine, totalBet, payouts: PAYOUTS });

    if (res.winAmount > 0 && res.count >= 3) {
      const cells = firstKCellsForLine(rowIdxs, res.count);
      // 3x5 binary grid of this win (for tiny “1/0” visualization)
      const matrix = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      for (const [rr, cc] of cells) matrix[rr][cc] = 1;

      // before pushing, build the usedSeq (first res.count columns)
      const usedSeq = Array.from({ length: res.count }, (_, colIdx) => {
        const row = rowIdxs[colIdx];
        const cell = symbolsOnLine[colIdx];
        return {
          col: colIdx,
          row,
          key: cell.key,
          mult: cell.mult,
          isWild: cell.key === WILD_KEY,
        };
      });

      lineWins.push({
        lineIndex: li,
        symbol: res.baseKey,
        count: res.count,
        baseAmount: res.baseWin,
        factor: res.factor,
        totalAmount: res.winAmount,
        wildMults: res.wildMults,
        cells,
        matrix,
        usedSeq, // ← add this
      });
    }
  }

  // Aggregate helpers
  const roundTotal = lineWins.reduce((s, w) => s + w.totalAmount, 0);

  const winCellsByKey = new Map();
  for (const w of lineWins) {
    if (!winCellsByKey.has(w.symbol)) winCellsByKey.set(w.symbol, new Set());
    const set = winCellsByKey.get(w.symbol);
    for (const [r, c] of w.cells) set.add(`${r}-${c}`);
  }

  const bestBySymbol = new Map();
  for (const w of lineWins) {
    const cur = bestBySymbol.get(w.symbol);
    if (!cur || w.totalAmount > cur.totalAmount) bestBySymbol.set(w.symbol, w);
  }

  return { lineWins, roundTotal, winCellsByKey, bestBySymbol };
}

/** ---------------- component ---------------- */
const SlotBoard = forwardRef(function SlotBoard(
  {
    weights = DEFAULT_WEIGHTS,
    totalBet = 0,
    onWin,
    onBoardStateChange,
    onWinDisplay, // ← NEW: notify BetControls what GIF/phase is currently visible
    frameSrc = "/bet_bg.png",
    showFrame = true,
    frameScale = 1.25,
    startStaggerMs = 120,
    stopBaseMs = 2000,
    stopStepMs = 800,

    // GIF timing (tunable)
    gifDurationMs = 1200, // visible time per step
    gifGapMs = 1000, // gap (hidden) time between steps
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

  // responsive sizing
  useEffect(() => {
    const recalc = () => {
      if (!boxRef.current) return;
      const w = boxRef.current.clientWidth;
      const h = (w / 16) * 9;
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

  // spinning blur strips
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

  // final/stopped symbols for each column
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
    onWinDisplay?.({ phase: "none", visible: false }); // clear banner subline immediately
    setSpinningAll(true);
    setBlurStrips(Array.from({ length: COLS }, makeBlurStrip));
    setReelSpin(Array(COLS).fill(true));

    const next = generateBoard(SYMBOLS, weights);
    const wildNext = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    // Assign wild multipliers for doghouse (2x or 3x)
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

          // still emit your original win result for credit + main WIN amount
          const { lineWins, roundTotal } = collectLineWins({
            board: next,
            wild: wildNext,
            totalBet,
          });
          const top =
            lineWins.length > 0
              ? lineWins.reduce((a, b) =>
                  a.totalAmount > b.totalAmount ? a : b
                )
              : null;
          onWin?.({
            total: roundTotal,
            items: top
              ? [
                  {
                    img: `clear_symbols/${top.symbol}`,
                    count: top.count,
                    amount: top.totalAmount,
                  },
                ]
              : [],
          });

          onBoardStateChange?.("idle");
        }
      }, stopBaseMs + c * stopStepMs);
    }
  }, [
    onBoardStateChange,
    onWin,
    onWinDisplay,
    weights,
    stopBaseMs,
    stopStepMs,
    totalBet,
  ]);

  /** ---------------- WIN ANALYSIS (every idle frame) ---------------- */
  const { lineWins, roundTotal, winCellsByKey, bestBySymbol } = useMemo(() => {
    return collectLineWins({ board, wild: wildMult, totalBet });
  }, [board, wildMult, totalBet]);

  // Order of symbol keys to animate when multiple win types occur (A→K→Q…)
  const winOrder = useMemo(
    () => Array.from(bestBySymbol.keys()).sort(),
    [bestBySymbol]
  );

  /** ---------------- GIF SEQUENCER ---------------- */
  const timersRef = useRef([]);
  const clearTimers = () => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  };

  // sequencer state (what overlays to draw)
  const [phase, setPhase] = useState("none"); // "none" | "all" | "one"
  const [visible, setVisible] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [bump, setBump] = useState(0); // for single-symbol replay
  const [allBump, setAllBump] = useState(0); // for ALL replay
  const firstAllDoneRef = useRef(false);

  useEffect(() => {
    clearTimers();
    setPhase("none");
    setVisible(false);
    setActiveKey(null);

    // no animation while spinning or when there are no wins
    if (spinningAll || winOrder.length === 0) {
      onWinDisplay?.({ phase: "none", visible: false });
      firstAllDoneRef.current = false;
      return;
    }

    let cancelled = false;
    let symIndex = 0; // for ONE-by-ONE
    let loopCount = 0; // counts ALL phases: 0 (first), 1, 2, …

    const hideThen = (nextFn) => {
      setVisible(false);
      onWinDisplay?.({ phase, visible: false });
      const t = setTimeout(() => !cancelled && nextFn(), gifGapMs);
      timersRef.current.push(t);
    };

    const stepAll = () => {
      if (cancelled) return;
      setPhase("all");
      setActiveKey(null);
      setAllBump((b) => b + 1);
      setVisible(true);
      onWinDisplay?.({
        phase: "all",
        visible: true,
        firstAll: loopCount === 0,
        roundTotal,
      });

      // after showing ALL → hide → go to ONE-BY-ONE
      const t = setTimeout(() => {
        if (cancelled) return;
        hideThen(stepOneStart);
        loopCount += 1;
        if (loopCount === 1) firstAllDoneRef.current = true;
      }, gifDurationMs);
      timersRef.current.push(t);
    };

    const stepOneStart = () => {
      if (cancelled) return;
      symIndex = 0;
      // if there is only one symbol, still show it in ONE phase
      stepOne();
    };

    const stepOne = () => {
      if (cancelled) return;

      const key = winOrder[symIndex];
      setPhase("one");
      setActiveKey(key);
      setBump((b) => b + 1);
      setVisible(true);

      const detail = bestBySymbol.get(key) || null;
      onWinDisplay?.({
        phase: "one",
        visible: true,
        activeSymbol: key,
        detail,
        roundTotal,
      });

      const t = setTimeout(() => {
        if (cancelled) return;
        // hide then advance
        onWinDisplay?.({ phase: "one", visible: false });
        setVisible(false);
        const t2 = setTimeout(() => {
          if (cancelled) return;
          symIndex = (symIndex + 1) % winOrder.length;
          if (symIndex === 0) {
            // finished cycle → back to ALL
            stepAll();
          } else {
            stepOne();
          }
        }, gifGapMs);
        timersRef.current.push(t2);
      }, gifDurationMs);
      timersRef.current.push(t);
    };

    // START: always begin with ALL phase
    stepAll();

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [spinningAll, gifDurationMs, gifGapMs, winOrder, bestBySymbol, roundTotal, onWinDisplay]);

  /** render **/
  return (
    <div
      ref={boxRef}
      className="
        relative mb-[5%] w-full max-w-[1200px] mx-auto aspect-[16/9]
        flex items-center justify-center
      "
    >
      {/* background frame / decorations */}
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
          {/* extra decorative images left as in your current file */}
        </div>
      )}

      {/* grid */}
      <div className="absolute inset-x-0 top-[37%] bottom-0 z-10 flex items-center justify-center">
        <div
          className="relative overflow-hidden"
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

          {/* === WIN GIF OVERLAYS === */}
          {!spinningAll &&
            visible &&
            phase === "all" &&
            // show EVERY winning symbol’s cells with its own GIF
            winOrder.map((symKey) =>
              Array.from({ length: ROWS }).map((_, r) =>
                Array.from({ length: COLS }).map((_, c) => {
                  const id = `${r}-${c}`;
                  const hasCell = winCellsByKey.get(symKey)?.has(id) ?? false;
                  if (!hasCell) return null;
                  const cellSym = resultColumns[c][r]?.key;
                  const srcKey = cellSym === WILD_KEY ? WILD_KEY : symKey; // wilds use doghouse gif
                  return (
                    <img
                      key={`${allBump}-${symKey}-${id}`}
                      src={gifPath(srcKey)}
                      alt={`${symKey} win`}
                      draggable={false}
                      className="pointer-events-none absolute"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        top: r * (cellSize + gap) + padding,
                        left: c * (cellSize + gap) + padding,
                        objectFit: "contain",
                        filter:
                          "drop-shadow(0 0 6px rgba(255,227,94,0.5)) drop-shadow(0 2px 10px rgba(0,0,0,0.5))",
                      }}
                    />
                  );
                })
              )
            )}

          {!spinningAll &&
            visible &&
            phase === "one" &&
            activeKey &&
            Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((_, c) => {
                const id = `${r}-${c}`;
                const belongs = winCellsByKey.get(activeKey)?.has(id) ?? false;
                if (!belongs) return null;
                const cellSym = resultColumns[c][r]?.key;
                const srcKey = cellSym === WILD_KEY ? WILD_KEY : activeKey; // wilds use doghouse gif
                return (
                  <img
                    key={`${bump}-${activeKey}-${id}`}
                    src={gifPath(srcKey)}
                    alt={`${activeKey} win`}
                    draggable={false}
                    className="pointer-events-none absolute"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      top: r * (cellSize + gap) + padding,
                      left: c * (cellSize + gap) + padding,
                      objectFit: "contain",
                      filter:
                        "drop-shadow(0 0 6px rgba(255,227,94,0.5)) drop-shadow(0 2px 10px rgba(0,0,0,0.5))",
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
