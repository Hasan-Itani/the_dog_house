"use client";
import { useState } from "react";

export default function SettingsPopup({ onClose, totalBet, setTotalBet, onTotalBetStep  }) {
  const [quickSpin, setQuickSpin] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);
  const [ambientMusic, setAmbientMusic] = useState(false);
  const [soundFx, setSoundFx] = useState(false);
  const [introScreen, setIntroScreen] = useState(true);

 const handleBetChange = (delta) => {
   // Fallback for older callers; not used when onTotalBetStep is provided
   if (typeof onTotalBetStep === "function") {
     onTotalBetStep(delta > 0 ? +1 : -1);
   } else if (typeof setTotalBet === "function") {
     setTotalBet((prev) => Math.max(0.2, prev + delta));
   }
 };


  const Toggle = ({ label, desc, checked, onChange }) => (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-bold">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <button
        onClick={onChange}
        className={`w-14 h-7 flex items-center rounded-full p-1 transition ${
          checked ? "bg-green-500 justify-end" : "bg-gray-600 justify-start"
        }`}
      >
        <div className="w-5 h-5 bg-white rounded-full" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-opacity-80 flex items-center justify-center z-50">
      <div className="relative bg-[#111] text-white rounded-lg shadow-2xl p-8 w-[95%] max-w-4xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl">
          ✕
        </button>

        <h2 className="text-center text-yellow-400 font-extrabold text-xl mb-8">
          SYSTEM SETTINGS
        </h2>

        <div className="grid grid-cols-2 gap-12">
          <div>
            <div className="flex items-center justify-between py-4 border-b border-gray-700">
              <span className="font-bold">GAME HISTORY</span>
              <button className="text-gray-400 hover:text-white">↗</button>
            </div>

            <div className="py-6 border-b border-gray-700 text-center">
              <p className="font-bold mb-3">TOTAL BET</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleBetChange(-1)}
                  className="w-10 h-10 bg-white text-black rounded-full font-bold text-xl"
                >
                  –
                </button>
                <div className="bg-black px-6 py-2 rounded-md text-lg font-bold">
                  ${totalBet.toFixed(2)}
                </div>
                <button
                  onClick={() => handleBetChange(+2)}
                  className="w-10 h-10 bg-green-500 text-white rounded-full font-bold text-xl"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Toggle
              label="QUICK SPIN"
              desc="Play faster by reducing total spin time"
              checked={quickSpin}
              onChange={() => setQuickSpin(!quickSpin)}
            />
            <Toggle
              label="BATTERY SAVER"
              desc="Save battery life by reducing animation speed"
              checked={batterySaver}
              onChange={() => setBatterySaver(!batterySaver)}
            />
            <Toggle
              label="AMBIENT MUSIC"
              desc="Turn on or off the game music"
              checked={ambientMusic}
              onChange={() => setAmbientMusic(!ambientMusic)}
            />
            <Toggle
              label="SOUND FX"
              desc="Turn on or off the game sounds"
              checked={soundFx}
              onChange={() => setSoundFx(!soundFx)}
            />
            <Toggle
              label="INTRO SCREEN"
              desc="Show the intro screen before starting the game"
              checked={introScreen}
              onChange={() => setIntroScreen(!introScreen)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
