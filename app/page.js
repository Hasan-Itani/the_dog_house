// app/page.js
"use client";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import BetControls from "./components/BetControls";
import SlotBoard from "./components/SlotBoard";

export default function Home() {
  const slotRef = useRef(null);

  const [credit, setCredit] = useState(100000);
  const [totalBet, setTotalBet] = useState(24);
  const [boardState, setBoardState] = useState("idle");
  const [roundWin, setRoundWin] = useState(0);
  const [lastWinItems, setLastWinItems] = useState([]);

  const handleSpin = useCallback(
    (wager, options = {}) => {
      if (boardState !== "idle") return false;
      const spinBet = typeof wager === "number" ? wager : totalBet;
      if (credit < spinBet) return false;

      const started = !!slotRef.current?.tumbleAll?.({
        speedMultiplier: options?.turbo ? 3 : 1,
      });
      if (!started) return false;

      setBoardState("spinning");
      setRoundWin(0);
      setLastWinItems([]);
      setCredit((c) => c - spinBet);
      return true;
    },
    [boardState, credit, totalBet]
  );

  const handleWin = useCallback((result) => {
    const amt = Number(result?.total || 0);
    const items = result?.items || [];
    setRoundWin((w) => w + amt);
    setCredit((c) => c + amt);
    if (items.length) setLastWinItems(items);
  }, []);

  const handleBoardStateChange = useCallback((state) => {
    setBoardState(state || "idle");
  }, []);

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-[#0b0f1a]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg.jpg')" }}
      />

      {/* SLOT BOARD (centered) */}
      <div className="absolute inset-x-0 top-0 bottom-[12vh] z-10 flex items-center justify-center">
        <SlotBoard
          ref={slotRef}
          totalBet={totalBet}
          onWin={handleWin}
          onBoardStateChange={handleBoardStateChange}
          className="w-[min(96vw,1280px)] aspect-[5/3]" // ← was w-[min(92vw,1100px)]
        />
      </div>

      {/* controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-[10vh] pointer-events-none">
        <div className="h-full flex items-end justify-center pointer-events-auto">
          <BetControls
            credit={credit}
            totalBet={totalBet}
            setTotalBet={setTotalBet}
            onSpin={handleSpin}
            canSpin={boardState === "idle"}
            roundWin={roundWin}
            lastWinItems={lastWinItems}
            maxWidth={1070}
            vwWidth={95}
          />
        </div>
      </div>
    </main>
  );
}
