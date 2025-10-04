"use client";
import { useState } from "react";

export default function SettingsPopup({
  onClose,
  totalBet,
  setTotalBet,
  onTotalBetStep,
}) {
  const [quickSpin, setQuickSpin] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);
  const [ambientMusic, setAmbientMusic] = useState(false);
  const [soundFx, setSoundFx] = useState(false);
  const [introScreen, setIntroScreen] = useState(true);

  const handleBetChange = (delta) => {
    if (typeof onTotalBetStep === "function") {
      onTotalBetStep(delta > 0 ? 1 : -1);
    } else if (typeof setTotalBet === "function") {
      setTotalBet((prev) => Math.max(0.2, prev + delta));
    }
  };

  const Toggle = ({ label, desc, checked, onChange }) => (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-wide text-white">
          {label}
        </p>
        <p className="text-xs text-white/60">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative h-8 w-16 rounded-full border border-white/20 transition-colors ${
          checked ? "bg-green-500" : "bg-white/10"
        }`}
        aria-pressed={checked}
        type="button"
      >
        <span
          className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow transition-all ${
            checked ? "left-9" : "left-2"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-[#111] text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-2xl text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Close settings"
          type="button"
        >
          <span aria-hidden="true">&times;</span>
        </button>

        <div className="max-h-[min(90vh,640px)] overflow-y-auto p-6 sm:p-8">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-[0.3em] text-yellow-400 sm:text-3xl">
            System Settings
          </h2>

          <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-5">
                <span className="text-sm font-bold tracking-wide text-white">
                  Game History
                </span>
                <button
                  className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/20"
                  type="button"
                >
                  View
                </button>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0 p-6 text-center">
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-white/80">
                  Total Bet
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => handleBetChange(-1)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-bold text-black transition hover:bg-yellow-300"
                    type="button"
                  >
                    -
                  </button>
                  <div className="min-w-[120px] rounded-lg bg-black px-6 py-3 text-lg font-bold text-white">
                    ${Number(totalBet ?? 0).toFixed(2)}
                  </div>
                  <button
                    onClick={() => handleBetChange(1)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-xl font-bold text-white transition hover:bg-green-400"
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <Toggle
                label="Quick Spin"
                desc="Reduce reel travel time for faster rounds"
                checked={quickSpin}
                onChange={() => setQuickSpin((prev) => !prev)}
              />
              <Toggle
                label="Battery Saver"
                desc="Trim heavy animations when battery matters"
                checked={batterySaver}
                onChange={() => setBatterySaver((prev) => !prev)}
              />
              <Toggle
                label="Ambient Music"
                desc="Enable or mute the background soundtrack"
                checked={ambientMusic}
                onChange={() => setAmbientMusic((prev) => !prev)}
              />
              <Toggle
                label="Sound FX"
                desc="Toggle win jingles and button sounds"
                checked={soundFx}
                onChange={() => setSoundFx((prev) => !prev)}
              />
              <Toggle
                label="Intro Screen"
                desc="Show the intro sequence before the first spin"
                checked={introScreen}
                onChange={() => setIntroScreen((prev) => !prev)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}