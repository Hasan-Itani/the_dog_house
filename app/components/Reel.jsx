"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Strip } from "./Strip";
import { Cell } from "./Cell";

/**
 * Reel
 * - Spinning: tall container with 2× Strip and CSS loop (@keyframes reel-spin)
 * - Stopped: shows final 3 symbols with a small grid bounce + per-cell drop
 * - startDelayMs cascades spin start per column (left→right)
 */
export function Reel({
  spinning,
  visibleRows = 3,
  cellSize,
  strip, // [{ key, img }]
  resultColumn, // [{ key, img }] length = visibleRows
  startDelayMs = 0, // for column stagger
  stopBounceMs = 420,
  cellGapPx = 0,
  // NEW: per-cell drop tuning
  dropStaggerMs = 50,
  dropDurationMs = 380,
  enableGridBounce = true,
}) {
  const [stopped, setStopped] = useState(false);

  // Height should include row gaps only when NOT spinning (the grid shows gaps)
  const reelHeight = useMemo(
    () =>
      visibleRows * cellSize + (!spinning ? (visibleRows - 1) * cellGapPx : 0),
    [visibleRows, cellSize, cellGapPx, spinning]
  );

  useEffect(() => {
    if (!spinning) {
      setStopped(true);
      const t = setTimeout(() => setStopped(false), stopBounceMs);
      return () => clearTimeout(t);
    }
  }, [spinning, stopBounceMs]);

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: cellSize, height: reelHeight }}
    >
      {spinning ? (
        <div
          className="absolute inset-0"
          style={{
            maskImage:
              "linear-gradient(transparent, black 18%, black 82%, transparent)",
            WebkitMaskImage:
              "linear-gradient(transparent, black 18%, black 82%, transparent)",
          }}
        >
          <div
            className="h-[200%]"
            style={{
              animation: "reel-spin 500ms linear infinite",
              animationDelay: `${startDelayMs}ms`,
              animationDirection: "reverse", // downwards movement
            }}
          >
            <Strip strip={strip} cellSize={cellSize} />
            <Strip strip={strip} cellSize={cellSize} />
          </div>
        </div>
      ) : (
        <div
          className={`absolute inset-0 grid ${
            stopped && enableGridBounce ? "animate-reel-stop-bounce" : ""
          }`}
          style={{
            gridTemplateRows: `repeat(${visibleRows}, ${cellSize}px)`,
            rowGap: `${cellGapPx}px`,
          }}
        >
          {resultColumn.map((sym, i) => (
            <div
              key={i}
              className={stopped ? "cell-drop" : ""}
              style={{
                // stagger by row; tweak to `(${visibleRows - 1 - i})` if you prefer bottom→top
                ["--drop-delay"]: `${i * dropStaggerMs}ms`,
                ["--drop-dur"]: `${dropDurationMs}ms`,
              }}
            >
              <Cell sym={sym} size={cellSize} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
