"use client";
import React from "react";

export function Cell({ sym, size, faded = false }) {
  const isDoghouse = sym?.key === "doghouse.png";
  const mult = sym?.mult; // 2 or 3 when stopped (clear), undefined while spinning/blur

  return (
    <div
      className={`relative flex items-center justify-center select-none ${
        faded ? "opacity-80" : ""
      }`}
      style={{ width: size, height: size }}
    >
      {sym?.img ? (
        <>
          <img
            src={sym.img}
            alt={sym.key || "sym"}
            draggable={false}
            className="w-full h-full object-contain"
            style={{ padding: Math.round(size * 0.001) }}
          />

          {/* Doghouse wild badge (only when NOT faded and has mult) */}
          {!faded && isDoghouse && (mult === 2 || mult === 3) ? (
            <img
              src={`/symbols/clear_symbols/${mult}x.png`}
              alt={`${mult}x`}
              draggable={false}
              className="pointer-events-none absolute"
              style={{
                // place it “inside” the doghouse opening (tweak if your art differs)
                width: Math.round(size * 0.42),
                bottom: Math.round(size * 0.20),
                left: "50%",
                transform: "translateX(-50%)",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
              }}
            />
          ) : null}
        </>
      ) : (
        <div className="w-full h-full bg-neutral-800/60 border border-white/10" />
      )}
    </div>
  );
}
