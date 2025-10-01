"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BetControls from "./components/BetControls";
export default function Home() {
  const [ready, setReady] = useState(false);
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

      const turboActive = !!options?.turbo;
      const speedMultiplier = turboActive ? 3 : 1;
      const started = !!slotRef.current?.tumbleAll?.({ speedMultiplier });
      if (!started) return false;

      setBoardState("spinning");
      setRoundWin(0); // reset the round accumulator
      setLastWinItems([]); // clear last step details
      setCredit((c) => c - spinBet);
      return true;
    },
    [boardState, credit, totalBet]
  );

  // receive per-step win (with breakdown)
  const handleWin = useCallback((result) => {
    const amt =
      typeof result === "number" ? result : Number(result?.total || 0);
    const items =
      typeof result === "object" && result?.items ? result.items : [];
    setRoundWin((w) => w + amt);
    setCredit((c) => c + amt);
    if (items?.length) setLastWinItems(items);
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
      <div className="absolute bottom-10 w-full z-0 flex justify-center">
        <img
          src="/bet_bg.png"
          alt="bet background"
          className="w-[90%] object-cover"
        />
      </div>
      {/* Bottom controls ~10vh (allowed to overlap the board) */}
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
