"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { payoutTable } from "../hooks/payoutTable"; // multipliers × TOTAL BET

export default function GameRulesPopup({ onClose, totalBet = 0 }) {
  const [page, setPage] = useState(1);
  const totalPages = 7;

  const containerRef = useRef(null);
  const touchStartXRef = useRef(0);

  const nextPage = () => setPage((p) => Math.min(totalPages, p + 1));
  const prevPage = () => setPage((p) => Math.max(1, p - 1));
  const goTo = (n) => setPage(() => Math.min(totalPages, Math.max(1, n)));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e) => (touchStartXRef.current = e.touches[0].clientX);
    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - touchStartXRef.current;
      if (Math.abs(dx) > 60) dx < 0 ? nextPage() : prevPage();
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // --- dynamic pay lines (× TOTAL BET) ---
  const fmt$ = (n) =>
    `$${(Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const SYMBOLS = [
    { key: "dog.png", name: "Dog" },
    { key: "milu.png", name: "Milo" },
    { key: "pug.png", name: "Pug" },
    { key: "taxa.png", name: "Taxa" },
    { key: "collar.png", name: "Collar" },
    { key: "bone.png", name: "Bone" },
    { key: "a.png", name: "A" },
    { key: "k.png", name: "K" },
    { key: "q.png", name: "Q" },
    { key: "j.png", name: "J" },
    { key: "ten.png", name: "10" },
  ];

  const rows = useMemo(() => {
    const t = Number(totalBet) || 0;
    return SYMBOLS.map(({ key, name }) => {
      const row = payoutTable[key] || {};
      // thresholds: 15,14,...,5 descending
      const thresholds = Object.keys(row)
        .map(Number)
        .sort((a, b) => b - a);
      const lines = thresholds.map((th) => {
        const label = th === 15 ? "15–36" : String(th);
        const amount = (row[th] || 0) * t;
        return `${label} → ${fmt$(+amount.toFixed(2))}`;
      });
      return { key, name, lines };
    });
  }, [totalBet]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl h-[92vh] sm:h-auto sm:max-h-[90vh] bg-[#111] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="sticky top-0 z-10 bg-[#111]/95 backdrop-blur px-5 sm:px-8 py-4 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 sm:right-4 sm:top-4 text-2xl leading-none opacity-80 hover:opacity-100"
            aria-label="Close"
          >
            ✕
          </button>
          <h2
            id="rules-title"
            className="text-center text-yellow-400 font-extrabold text-xl sm:text-2xl"
          >
            GAME RULES
          </h2>
        </div>

        <div className="px-4 sm:px-8 py-5 sm:py-6 overflow-y-auto h-[70vh] custom-scroll">
          <div className="flex flex-col items-center justify-start gap-4 w-full">
            {page === 1 && (
              <>
                <p className="text-center text-gray-300 mb-2 text-sm sm:text-base">
                  All symbols pay in blocks of minimum 5 symbols connected
                  horizontally or vertically.
                  <br className="hidden sm:block" />
                  The game is played on a 6×6 grid of symbols.
                </p>

                <p className="text-center text-xs sm:text-sm text-gray-400 -mt-1 mb-1">
                  Payouts below are shown for your current <b>Total Bet</b>:{" "}
                  {fmt$(totalBet)}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 text-[13px] sm:text-[14px] w-full">
                  {rows.map(({ key, name, lines }) => (
                    <SymbolPayout
                      key={key}
                      src={`/symbols/clear_symbols/${key}`}
                      alt={name}
                      lines={lines}
                    />
                  ))}

                  <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 text-center mt-1">
                    <div className="inline-flex items-center gap-4">
                      <Image
                        src="/symbols/clear_symbols/doghouse.png"
                        alt="Scatter"
                        width={72}
                        height={72}
                        className="mx-auto"
                      />
                      <p className="text-gray-300 text-sm sm:text-base">
                        This is the SCATTER symbol. It can appear on all reels.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* --- the rest of your pages unchanged --- */}
            {page === 2 && (
              <div className="text-gray-300 text-sm sm:text-base leading-relaxed space-y-4 text-left">
                <h3 className="text-center font-bold text-lg text-yellow-400">
                  TUMBLE FEATURE
                </h3>
                <p>
                  After every spin, winning combinations are paid and all
                  winning symbols disappear except for SCATTER. Remaining
                  symbols fall to the bottom and empty positions are replaced by
                  new ones from above. Tumbling continues until no more winning
                  combos appear. All wins are added after all tumbles from a
                  base spin.
                </p>

                <h3 className="text-center font-bold text-lg text-yellow-400 mt-6">
                  POWER WILDS
                </h3>
                <p>
                  The WILD substitutes all symbols except SCATTER. Each WILD has
                  a clearance level (1–10). Every time it’s part of a win, the
                  level decreases by 1. WILDS remain until their level reaches 1
                  and they are part of a winning combo, then they explode.
                </p>
              </div>
            )}

            {page === 3 && (
              <div className="text-gray-300 text-sm sm:text-base leading-relaxed space-y-4 text-left">
                <h3 className="text-center font-bold text-lg text-yellow-400">
                  FREE SPINS
                </h3>
                <p>
                  Hit 3+ SCATTERS to trigger 8 free spins. Each triggering
                  SCATTER also pays 1x bet. During free spins, WILDS remain
                  between spins. The POWER UP symbol appears, adding +1–3
                  randomly to clearance levels of all WILDS.
                </p>
                <p>
                  Hit 2+ SCATTERS during free spins to retrigger. Extra spins =
                  SCATTERS hit + 1. Special reels apply.
                </p>

                <h3 className="text-center font-bold text-lg text-yellow-400">
                  MAX WIN
                </h3>
                <p>
                  Max win is 5,000x bet. If reached, the round ends immediately,
                  win is awarded, and all features are forfeited.
                </p>

                <h3 className="text-center font-bold text-lg text-yellow-400">
                  BUY FREE SPINS
                </h3>
                <p>Instantly trigger free spins for 100x current bet.</p>
              </div>
            )}

            {page === 4 && (
              <div className="text-gray-300 text-sm sm:text-base leading-relaxed space-y-4 text-left">
                <h3 className="text-center font-bold text-lg text-yellow-400">
                  GAME RULES
                </h3>
                <p>
                  High volatility game: fewer payouts on average but higher
                  chance of big wins in short spans.
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Only highest win per combination is paid.</li>
                  <li>
                    All wins are multiplied by <b>Total Bet</b>.
                  </li>
                  <li>All values shown as coins.</li>
                  <li>Free Spins total win is awarded after the round ends.</li>
                </ul>
                <p>
                  RTP: 96.49% (96.50% when buying free spins). Min bet: $0.20 |
                  Max bet: $240.00
                </p>
                <p>
                  SPACE / ENTER can spin. Malfunction voids all pays and plays.
                </p>
              </div>
            )}

            {page === 5 && (
              <div className="text-gray-300 text-sm sm:text-base leading-relaxed space-y-4 text-left">
                <h3 className="text-center font-bold text-lg text-yellow-400">
                  HOW TO PLAY
                </h3>
                <p>Use + / – buttons to set your bet, then press SPIN.</p>

                <h3 className="text-center font-bold text-lg text-yellow-400">
                  MAIN GAME INTERFACE
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>⚙ Opens settings menu.</li>
                  <li>⏩ Cycles spin speeds (normal, quick, turbo).</li>
                  <li>🔊 Toggles sound/music.</li>
                  <li>ℹ Opens info page.</li>
                  <li>CREDIT / BET show balance and bet.</li>
                  <li>⟳ Starts the game.</li>
                  <li>AUTOPLAY opens/ends auto spin menu.</li>
                </ul>
              </div>
            )}

            {page === 6 && (
              <div className="text-gray-300 text-sm sm:text-base leading-relaxed space-y-4 text-left">
                <h3 className="text-center font-bold text-lg text-yellow-400">
                  SETTINGS MENU
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Quick Spin – auto spin until release.</li>
                  <li>Intro Screen – toggle intro.</li>
                  <li>Ambient – toggle background music/sounds.</li>
                  <li>Sound FX – toggle game effects.</li>
                  <li>Game History – open past results.</li>
                </ul>

                <h3 className="text-center font-bold text-lg text-yellow-400">
                  INFORMATION SCREEN
                </h3>
                <p>◀ ▶ scroll pages | ✕ close screen</p>

                <h3 className="text-center font-bold text-lg text-yellow-400">
                  BET MENU
                </h3>
                <p>Change bet multiplier and values. Max win = 5000x bet.</p>
              </div>
            )}

            {page === 7 && (
              <div className="text-gray-300 text-sm sm:text-base leading-relaxed space-y-4 text-left">
                <h3 className="text-center font-bold text-lg text-yellow-400">
                  AUTOPLAY
                </h3>
                <p>
                  Choose the number of auto-spins. SKIP SCREENS option skips
                  feature intro/end screens after a short time.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 bg-[#111] px-4 sm:px-8 py-3 border-t border-white/10">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={prevPage}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40"
              aria-label="Previous page"
            >
              ◀
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => goTo(n)}
                  className={`w-2.5 h-2.5 rounded-full transition ${
                    n === page
                      ? "bg-yellow-400"
                      : "bg-white/30 hover:bg-white/60"
                  }`}
                  aria-label={`Go to page ${n}`}
                />
              ))}
            </div>
            <button
              onClick={nextPage}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40"
              aria-label="Next page"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SymbolPayout({ src, alt, lines }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
      <div className="shrink-0 mt-0.5">
        <Image
          src={src}
          alt={alt}
          width={64}
          height={64}
          className="sm:w-[80px] sm:h-[80px]"
        />
      </div>
      <div className="text-left leading-5">
        <div className="font-semibold mb-1">{alt}</div>
        <div className="text-gray-200">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
