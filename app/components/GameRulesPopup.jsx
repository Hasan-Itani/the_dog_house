"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function GameRulesPopup({ onClose }) {
  const [page, setPage] = useState(1);
  const totalPages = 6;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6">
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl h-[92vh] bg-[#111] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-[#111]/95 backdrop-blur px-5 sm:px-8 py-4 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 text-2xl opacity-80 hover:opacity-100"
          >
            ✕
          </button>
          <h2 className="text-center text-yellow-400 font-extrabold text-xl sm:text-2xl">
            GAME RULES — Page {page}/6
          </h2>
        </div>

        {/* CONTENT */}
        <div className="px-6 py-6 overflow-y-auto text-sm sm:text-base leading-relaxed space-y-5 flex-1 min-h-[500px]">
          {page === 1 && (
            <>
              <h3 className="text-yellow-400 font-bold text-lg text-center">
                SYMBOL PAYTABLE
              </h3>
              <p className="text-center text-gray-300">
                All symbols pay from left to right on adjacent reels starting
                from the leftmost reel.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-gray-200 mt-4">
                <Symbol icon="/symbols/clear_symbols/dog.png" label="Rottweiler" values="5 × 7.50  4 × 1.50  3 × 0.50" />
                <Symbol icon="/symbols/clear_symbols/milu.png" label="Maltese" values="5 × 5.00  4 × 1.00  3 × 0.30" />
                <Symbol icon="/symbols/clear_symbols/pug.png" label="Pug" values="5 × 3.00  4 × 0.60  3 × 0.20" />
                <Symbol icon="/symbols/clear_symbols/taxa.png" label="Beagle" values="5 × 2.00  4 × 0.40  3 × 0.20" />
                <Symbol icon="/symbols/clear_symbols/collar.png" label="Collar" values="5 × 1.50  4 × 0.25  3 × 0.12" />
                <Symbol icon="/symbols/clear_symbols/bone.png" label="Bone" values="5 × 1.00  4 × 0.20  3 × 0.08" />
                <Symbol icon="/symbols/clear_symbols/a.png" label="A" values="5 × 0.50  4 × 0.10  3 × 0.05" />
                <Symbol icon="/symbols/clear_symbols/k.png" label="K" values="5 × 0.50  4 × 0.10  3 × 0.05" />
                <Symbol icon="/symbols/clear_symbols/q.png" label="Q" values="5 × 0.25  4 × 0.05  3 × 0.02" />
                <Symbol icon="/symbols/clear_symbols/j.png" label="J" values="5 × 0.25  4 × 0.05  3 × 0.02" />
                <Symbol icon="/symbols/clear_symbols/ten.png" label="10" values="5 × 0.25  4 × 0.05  3 × 0.02" />
              </div>

              <div className="mt-5 text-gray-300">
                <h4 className="text-yellow-400 font-semibold">WILD SYMBOL</h4>
                <p>
                  The WILD substitutes for all symbols except BONUS. It appears
                  only on reels 2, 3, and 4. Each WILD has a random multiplier
                  of 2× or 3×. If more than one WILD appears in a win, their
                  multipliers are added together.
                </p>
              </div>
            </>
          )}

          {page === 2 && (
            <>
              <h3 className="text-yellow-400 font-bold text-lg text-center">
                BONUS SYMBOL & FREE SPINS
              </h3>
              <div className="flex items-center justify-center gap-3 mt-2">
                <Image
                  src="/symbols/clear_symbols/doghouse.png"
                  alt="Bonus symbol"
                  width={70}
                  height={70}
                />
                <p className="text-gray-300">
                  The BONUS symbol appears only on reels 1, 3 and 5. Hitting 3 BONUS
                  symbols triggers the <b>Free Spins Round</b> and pays 5× total bet.
                </p>
              </div>

              <h4 className="text-yellow-400 font-semibold mt-4">
                FREE SPINS RULES
              </h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  A 3×3 grid reveals random free spins (1–3 each). Their sum
                  determines the number of awarded spins.
                </li>
                <li>
                  During the Free Spins, all WILD symbols on reels 2, 3, or 4
                  remain sticky until the end of the feature.
                </li>
                <li>
                  Sticky WILDs have random multipliers (2× or 3×).
                </li>
                <li>
                  BONUS symbols are not present in Free Spins. The feature cannot
                  be retriggered.
                </li>
              </ul>
            </>
          )}

          {page === 3 && (
            <>
              <h3 className="text-yellow-400 font-bold text-lg text-center">
                PAYLINES & GAME INFO
              </h3>
              <p>
                High volatility game — fewer payouts on average but with higher
                win potential in shorter periods.
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>All symbols pay from left to right on paylines.</li>
                <li>Free Spins wins are added to line wins.</li>
                <li>All wins are multiplied by bet per line.</li>
                <li>Only the highest win is paid per line.</li>
                <li>Wins on multiple paylines are added to total win.</li>
              </ul>
              <p className="mt-4 text-gray-300">
                <b>RTP:</b> 96.51%  
                <br />
                <b>Min Bet:</b> $0.20 | <b>Max Bet:</b> $100.00
              </p>
              <p className="text-sm text-gray-400 mt-2">
                SPACE / ENTER can spin. Malfunction voids all pays and plays.
              </p>
            </>
          )}

          {page === 4 && (
            <>
              <h3 className="text-yellow-400 font-bold text-lg text-center">
                HOW TO PLAY
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use + / – to change bet value.</li>
                <li>Select the bet and press SPIN to play.</li>
              </ul>

              <h3 className="text-yellow-400 font-bold text-lg text-center mt-5">
                MAIN GAME INTERFACE
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>☰ Opens SETTINGS menu.</li>
                <li>🌀 Cycles spin speeds (normal / quick / turbo).</li>
                <li>🔊 Toggles sound and music on/off.</li>
                <li>ℹ Opens Information page.</li>
                <li>⟳ Starts the game.</li>
                <li>AUTOPLAY opens automatic play menu.</li>
              </ul>
            </>
          )}

          {page === 5 && (
            <>
              <h3 className="text-yellow-400 font-bold text-lg text-center">
                SETTINGS MENU
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>QUICK SPIN – starts reels automatically and stops instantly.</li>
                <li>INTRO SCREEN – toggles intro on/off.</li>
                <li>AMBIENT – toggles ambient music and sounds.</li>
                <li>SOUND FX – toggles game sound effects.</li>
                <li>GAME HISTORY – opens past rounds.</li>
              </ul>

              <h3 className="text-yellow-400 font-bold text-lg text-center mt-5">
                BET MENU
              </h3>
              <p>Shows number of lines and total bet in coins and cash. Use + / – to adjust values.</p>
            </>
          )}

          {page === 6 && (
            <>
              <h3 className="text-yellow-400 font-bold text-lg text-center">
                AUTOPLAY
              </h3>
              <p>
                Choose number of auto-spins to start Autoplay.  
                SKIP SCREENS option auto-skips feature intro and end screens.
              </p>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 z-10 bg-[#111] px-4 sm:px-8 py-3 border-t border-white/10">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={prevPage}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40"
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
                />
              ))}
            </div>
            <button
              onClick={nextPage}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Symbol({ icon, label, values }) {
  return (
    <div className="flex flex-col items-center bg-white/5 rounded-lg p-3 text-center min-h-[130px]">
      <Image
        src={icon}
        alt={label}
        width={64}
        height={64}
        className="w-16 h-16 mb-2"
      />
      <div className="font-semibold text-white">{label}</div>
      <div className="text-xs text-gray-300 mt-1">{values}</div>
    </div>
  );
}
