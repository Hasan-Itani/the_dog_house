"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import GameRulesPopup from "./GameRulesPopup";
import SettingsPopup from "./SettingsPopup";
import { COIN_VALUES, LINES } from "../utils/constants";

export default function BetControls({
  credit = 100000,
  onSpin,
  maxWidth = 1070,
  vwWidth = 95,
  setTotalBet,
  canSpin = true,
  roundWin = 0,
  lastWinItems = [],
  winDisplay = { phase: "none", visible: false }, // ← NEW
}) {
  const [isSpinning, setIsSpinning] = useState(false);

  // modal control
  const [modal, setModal] = useState(null);
  const isPopupOpen = modal === "bet" || modal === "settings";
  const [betAnchored, setBetAnchored] = useState(false);

  // bet state
  const [bet, setBet] = useState(10);
  const [coinIndex, setCoinIndex] = useState(() => {
    const i = COIN_VALUES.indexOf(1.2);
    return i >= 0 ? i : COIN_VALUES.length - 1;
  });
  const coinValue = COIN_VALUES[coinIndex];
  const totalBet = bet * coinValue * LINES;

  const turboHeldRef = useRef(false);

  // propagate TOTAL BET up
  useEffect(() => {
    if (typeof setTotalBet === "function") setTotalBet(totalBet);
  }, [totalBet, setTotalBet]);

  // linearized total bet steps
  const allCombos = useMemo(() => {
    const arr = [];
    for (let c = 0; c < COIN_VALUES.length; c++) {
      for (let b = 1; b <= 10; b++) {
        arr.push({
          bet: b,
          coinIndex: c,
          totalBet: b * COIN_VALUES[c] * LINES,
        });
      }
    }
    return arr.sort((a, b) => a.totalBet - b.totalBet);
  }, []);
  const currentIndex = allCombos.findIndex(
    (c) => c.bet === bet && c.coinIndex === coinIndex
  );

  // reset local “spinning” flag from parent canSpin
  useEffect(() => {
    if (canSpin) {
      setIsSpinning(false);
      turboHeldRef.current = false;
    }
  }, [canSpin]);

  // SPIN
  const spinSeqRef = useRef(0);
  const handleSpin = useCallback(
    async (options = {}) => {
      if (modal) return;
      if (!canSpin || isSpinning) return;
      if (credit < totalBet) return;
      setIsSpinning(true);
      spinSeqRef.current += 1;
      const started = await Promise.resolve(onSpin?.(totalBet, options));
      if (started === false) {
        setIsSpinning(false);
        spinSeqRef.current -= 1;
      }
      if (started) setModal(null);
    },
    [modal, canSpin, isSpinning, credit, totalBet, onSpin]
  );

  // hotkeys
  useEffect(() => {
    const shouldIgnoreTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };
    const handleKeyDown = (event) => {
      if (modal) return;
      if (event.code !== "Space" && event.code !== "Enter") return;
      if (shouldIgnoreTarget(event.target)) return;
      event.preventDefault();
      if (event.repeat) turboHeldRef.current = true;
      const turbo = turboHeldRef.current || event.repeat;
      void handleSpin({ turbo });
    };
    const handleKeyUp = (event) => {
      if (event.code !== "Space" && event.code !== "Enter") return;
      turboHeldRef.current = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleSpin, modal]);

  // block background scroll when any modal is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (modal) el.classList.add("overflow-hidden");
    else el.classList.remove("overflow-hidden");
    return () => el.classList.remove("overflow-hidden");
  }, [modal]);

  const handleBetMax = () => {
    setBet(10);
    setCoinIndex(COIN_VALUES.length - 1);
  };

  // ===== Banner state =====
  const START_TEXT = "HOLD SPACE FOR TURBO SPIN";
  const IDLE_VARIANTS = useMemo(
    () => ["PLACE YOUR BET!", "SPIN TO WIN!", "HOLD SPACE FOR TURBO SPIN"],
    []
  );

  const [banner, setBanner] = useState(START_TEXT);
  const [subline, setSubline] = useState(null); // can be string or JSX
  const [animatedWin, setAnimatedWin] = useState(0);
  const rafRef = useRef(0);
  const animValRef = useRef(0);

  // while spinning show GOOD LUCK! and clear subline
  useEffect(() => {
    if (isSpinning) {
      setBanner("GOOD LUCK!");
      setSubline(null);
      setAnimatedWin(0);
      animValRef.current = 0;
      cancelAnimationFrame(rafRef.current);
    }
  }, [isSpinning]);

  // Animate “WIN $…” after a round finishes
  useEffect(() => {
    if (!canSpin || isSpinning) return;

    if (roundWin > 0) {
      const target = Number(roundWin) || 0;
      const duration = Math.min(
        2500,
        Math.max(700, Math.log10(1 + target) * 1200)
      );
      setBanner("WIN");

      const from = animValRef.current || 0;
      const to = target;
      const t0 = performance.now();
      cancelAnimationFrame(rafRef.current);
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / duration);
        const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        const val = from + (to - from) * eased;
        animValRef.current = val;
        setAnimatedWin(val);
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      // no win → idle tip
      const pick =
        IDLE_VARIANTS[Math.floor(Math.random() * IDLE_VARIANTS.length)];
      setBanner(pick);
      setSubline(null);
    }
  }, [canSpin, isSpinning, roundWin, IDLE_VARIANTS]);

  // ---- Subline follows the active GIF (from winDisplay) ----
  useEffect(() => {
    if (isSpinning || roundWin <= 0) {
      setSubline(null);
      return;
    }
    if (!winDisplay || !winDisplay.visible) {
      setSubline(null);
      return;
    }

    if (winDisplay.phase === "all") {
      // First ALL after spin: WINNER; later: GAME PAYS $total
      if (winDisplay.firstAll) setSubline("WINNER");
      else
        setSubline(() => (
          <span>
            GAME PAYS
            <span className="text-green-400">
              ${Number(winDisplay.roundTotal || 0).toFixed(2)}
            </span>
          </span>
        ));
      return;
    }

    if (winDisplay.phase === "one" && winDisplay.detail) {
      const d = winDisplay.detail;
      // tiny 3×5 matrix text
      const rows = d.matrix
        .map((row) => row.map((v) => (v ? "1" : "0")).join(" "))
        .join("\n");

      setSubline(() => (
        <div className="flex items-center gap-2">
          {(
            d.usedSeq ??
            Array.from({ length: d.count }).map((_, i) => ({ isWild: false }))
          ).map((u, i) => {
            const baseGif = `/symbols/clear_symbols/${d.symbol}`;
            const dogGif = `/symbols/gifs/doghouse.gif`;
            const src = u.isWild ? dogGif : baseGif;
            return (
              <span
                key={i}
                className="relative inline-block mr-1"
                style={{ width: 24, height: 24 }}
              >
                <Image
                  src={src}
                  alt={u.isWild ? "doghouse" : d.symbol}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </span>
            );
          })}
        </div>
      ));
      return;
    }
    setSubline(null);
  }, [winDisplay, isSpinning, roundWin]);

  // single popup builder reused for desktop anchored and mobile fullscreen
  const BetPopup = ({ anchored = false }) => (
    <div
      className={
        anchored
          ? "absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-80 max-w-[84vw] bg-[#111] text-white rounded-lg shadow-2xl p-6 z-50"
          : "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      }
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          anchored
            ? ""
            : "w-full sm:w-[480px] bg-[#111] text-white rounded-t-2xl sm:rounded-2xl p-6 relative"
        }
      >
        <button
          onClick={() => setModal(null)}
          className="absolute right-3 top-3 text-2xl"
          aria-label="Close bet popup"
        >
          ✕
        </button>

        <h2 className="text-center text-yellow-400 font-extrabold text-lg mb-5">
          BET MULTIPLIER {LINES}x
        </h2>

        <div className="mb-8">
          <p className="text-center text-sm text-gray-300 mb-2">BET</p>
          <div className="flex items-center justify-between gap-4">
            <button
              disabled={bet <= 1}
              onClick={() => setBet((b) => Math.max(1, b - 1))}
              className="relative disabled:opacity-40"
              style={{ width: 60, height: 60 }}
            >
              <Image
                src="/ui/lessbet_popup.png"
                alt="-"
                fill
                className="object-contain"
              />
            </button>
            <div className="bg-black text-white text-lg font-bold px-6 py-4 rounded-md min-w-20 text-center">
              {bet}
            </div>
            <button
              disabled={bet >= 10}
              onClick={() => setBet((b) => Math.min(10, b + 1))}
              className="relative disabled:opacity-40"
              style={{ width: 60, height: 60 }}
            >
              <Image
                src="/ui/addbet_popup.png"
                alt="+"
                fill
                className="object-contain"
              />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-center text-sm text-gray-300 mb-2">COIN VALUE</p>
          <div className="flex items-center justify-between gap-4">
            <button
              disabled={coinIndex <= 0}
              onClick={() => setCoinIndex((i) => Math.max(0, i - 1))}
              className="relative disabled:opacity-40"
              style={{ width: 60, height: 60 }}
            >
              <Image
                src="/ui/lessbet_popup.png"
                alt="-"
                fill
                className="object-contain"
              />
            </button>
            <div className="bg-black text-white text-lg font-bold px-6 py-4 rounded-md min-w-24 text-center">
              ${coinValue.toFixed(2)}
            </div>
            <button
              disabled={coinIndex >= COIN_VALUES.length - 1}
              onClick={() =>
                setCoinIndex((i) => Math.min(COIN_VALUES.length - 1, i + 1))
              }
              className="relative disabled:opacity-40"
              style={{ width: 60, height: 60 }}
            >
              <Image
                src="/ui/addbet_popup.png"
                alt="+"
                fill
                className="object-contain"
              />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-center text-sm text-gray-300 mb-2">TOTAL BET</p>
          <div className="flex items-center justify-between gap-4">
            <button
              disabled={currentIndex <= 0}
              onClick={() => {
                if (currentIndex > 0) {
                  setBet(allCombos[currentIndex - 1].bet);
                  setCoinIndex(allCombos[currentIndex - 1].coinIndex);
                }
              }}
              className="relative disabled:opacity-40"
              style={{ width: 60, height: 60 }}
            >
              <Image
                src="/ui/lessbet_popup.png"
                alt="-"
                fill
                className="object-contain"
              />
            </button>
            <div className="bg-black text-white text-lg font-bold px-6 py-4 rounded-md min-w-28 text-center">
              ${totalBet.toFixed(2)}
            </div>
            <button
              disabled={currentIndex >= allCombos.length - 1}
              onClick={() => {
                if (currentIndex < allCombos.length - 1) {
                  setBet(allCombos[currentIndex + 1].bet);
                  setCoinIndex(allCombos[currentIndex + 1].coinIndex);
                }
              }}
              className="relative disabled:opacity-40"
              style={{ width: 60, height: 60 }}
            >
              <Image
                src="/ui/addbet_popup.png"
                alt="+"
                fill
                className="object-contain"
              />
            </button>
          </div>
        </div>

        <button
          onClick={handleBetMax}
          className="w-full bg-green-500 hover:bg-green-600 py-3 rounded-lg font-extrabold text-lg"
        >
          BET MAX
        </button>
      </div>
    </div>
  );

  // sizes
  const ICON_WH = "clamp(24px, 4.5vw, 36px)";
  const BIG_BTN_WH = "clamp(96px, 18vw, 160px)";
  const NUM_FONT = "clamp(16px, 3.5vw, 22px)";
  const TIP_FONT = "clamp(14px, 4.6vw, 24px)";

  return (
    <div className="w-full pointer-events-auto relative">
      <div
        className="mx-auto px-3 sm:px-4 md:px-6 py-2"
        style={{ width: `min(${vwWidth}vw, ${maxWidth}px)` }}
      >
        {/* ===== Desktop ===== */}
        <div className="hidden md:grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-8 lg:gap-x-16 xl:gap-x-24">
          {/* LEFT: settings, info, credit/bet */}
          <div className="flex items-start gap-4 mt-15">
            <div className="flex flex-col items-start gap-2">
              <button
                className="relative"
                style={{ width: ICON_WH, height: ICON_WH }}
                onClick={() => setModal("settings")}
                aria-label="Open settings"
              >
                <Image
                  src="/ui/settings.png"
                  alt="menu"
                  fill
                  className="object-contain"
                />
              </button>
              <button
                className="relative"
                style={{ width: ICON_WH, height: ICON_WH }}
                aria-label="Toggle sound"
              >
                <Image
                  src="/ui/sound.png"
                  alt="sound"
                  fill
                  className="object-contain"
                />
              </button>
            </div>

            <button
              className="relative mt-4"
              style={{
                width: `calc(${ICON_WH} * 1.2)`,
                height: `calc(${ICON_WH} * 1.2)`,
              }}
              onClick={() => setModal("rules")}
              aria-label="Open rules"
            >
              <Image
                src="/ui/info.png"
                alt="info"
                fill
                className="object-contain"
              />
            </button>

            <div className="flex flex-col gap-1 ml-2 mt-4">
              <div className="font-bold text-white leading-none">
                CREDIT
                <span
                  className="text-yellow-400 pl-2"
                  style={{ fontSize: NUM_FONT }}
                >
                  $
                  {credit.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="font-bold text-white leading-none">
                BET
                <span
                  className="text-orange-400 pl-2"
                  style={{ fontSize: NUM_FONT }}
                >
                  $
                  {totalBet.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* CENTER: banner + subline that follows GIFs */}
          <div className="flex flex-col items-center justify-center min-h-[48px] mt-14">
            <p
              className="text-white font-extrabold uppercase text-center leading-none whitespace-nowrap"
              style={{ fontSize: TIP_FONT }}
            >
              {banner === "WIN" ? (
                <>
                  WIN
                  <span className="text-green-400">
                    $
                    {animatedWin.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </>
              ) : (
                banner
              )}
            </p>

            {!!subline && (
              <div className="mt-1 text-white/90 text-xs md:text-sm font-semibold flex items-center gap-2">
                {/* When controlled by winDisplay, render subline as-is (with matrix if provided) */}
                {winDisplay?.visible ? (
                  subline
                ) : (
                  <>
                    {/* fallback (old logic) when there is a single item and no sequencer info */}
                    {lastWinItems?.length === 1 && (
                      <>
                        <span>{lastWinItems[0].count}x</span>
                        <span
                          className="relative inline-block"
                          style={{ width: 28, height: 28 }}
                        >
                          <Image
                            src={`/symbols/${lastWinItems[0].img}`}
                            alt={lastWinItems[0].img}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </span>
                      </>
                    )}
                    <span>{subline}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: -  SPIN  + */}
          <div className="flex items-center gap-3 sm:gap-5 justify-end">
            <button
              onClick={() => {
                setBetAnchored(true);
                setModal("bet");
              }}
              disabled={!canSpin || isSpinning || isPopupOpen}
              className="relative"
              style={{ width: ICON_WH, height: ICON_WH }}
              aria-label="Decrease bet / open popup"
            >
              <Image
                src="/ui/lessbet.png"
                alt="lessbet"
                fill
                className="object-contain"
              />
            </button>

            <div className="relative flex items-center justify-center">
              <button
                onClick={() => void handleSpin()}
                disabled={
                  !canSpin || isSpinning || credit < totalBet || isPopupOpen
                }
                className="relative flex items-center justify-center overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
                style={{ width: BIG_BTN_WH, height: BIG_BTN_WH }}
                aria-label="Spin"
              >
                <Image
                  src="/ui/play_button.png"
                  alt="spin"
                  fill
                  className="object-contain"
                />
                <Image
                  src="/ui/play_button_animated.png"
                  alt="spin"
                  fill
                  className="object-contain ml-3 mt-3 pointer-events-none"
                />
              </button>

              {modal === "bet" && betAnchored && <BetPopup anchored />}
            </div>

            <button
              onClick={() => {
                setBetAnchored(true);
                setModal("bet");
              }}
              disabled={!canSpin || isSpinning || isPopupOpen}
              className="relative"
              style={{ width: ICON_WH, height: ICON_WH }}
              aria-label="Increase bet / open popup"
            >
              <Image
                src="/ui/addbet.png"
                alt="addbet"
                fill
                className="object-contain"
              />
            </button>
          </div>
        </div>

        {/* ===== Mobile (unchanged except subline uses new state) ===== */}
        <div className="md:hidden flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <button
                  className="relative"
                  style={{ width: ICON_WH, height: ICON_WH }}
                  onClick={() => setModal("settings")}
                  aria-label="Open settings"
                >
                  <Image
                    src="/ui/settings.png"
                    alt="menu"
                    fill
                    className="object-contain"
                  />
                </button>
                <button
                  className="relative"
                  style={{ width: ICON_WH, height: ICON_WH }}
                  aria-label="Toggle sound"
                >
                  <Image
                    src="/ui/sound.png"
                    alt="sound"
                    fill
                    className="object-contain"
                  />
                </button>
              </div>

              <button
                className="relative"
                style={{
                  width: `calc(${ICON_WH} * 1.1)`,
                  height: `calc(${ICON_WH} * 1.1)`,
                }}
                onClick={() => setModal("rules")}
                aria-label="Open rules"
              >
                <Image
                  src="/ui/info.png"
                  alt="info"
                  fill
                  className="object-contain"
                />
              </button>
            </div>

            <p
              className="text-white font-extrabold uppercase leading-none text-center whitespace-nowrap"
              style={{ fontSize: TIP_FONT }}
            >
              {banner === "WIN" ? (
                <>
                  WIN
                  <span className="text-green-400">
                    $
                    {animatedWin.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </>
              ) : (
                banner
              )}
            </p>
          </div>

          {!!subline && (
            <div className="mx-auto -mt-1 text-white/90 text-[11px] font-semibold">
              {winDisplay?.visible ? subline : <span>{subline}</span>}
            </div>
          )}

          {/* credit/bet line under banner on mobile */}
          <div className="flex items-center justify-center gap-3">
            <div className="font-bold text-white">
              CREDIT
              <span
                className="text-yellow-400 pl-1.5"
                style={{ fontSize: NUM_FONT }}
              >
                $
                {credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="font-bold text-white">
              BET
              <span
                className="text-orange-400 pl-1.5"
                style={{ fontSize: NUM_FONT }}
              >
                $
                {totalBet.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-5 mt-1">
            <button
              onClick={() => {
                setBetAnchored(false);
                setModal("bet");
              }}
              disabled={!canSpin || isSpinning || isPopupOpen}
              className="relative"
              style={{ width: ICON_WH, height: ICON_WH }}
              aria-label="Decrease bet / open popup"
            >
              <Image
                src="/ui/lessbet.png"
                alt="lessbet"
                fill
                className="object-contain"
              />
            </button>

            <button
              onClick={() => void handleSpin()}
              disabled={
                !canSpin || isSpinning || credit < totalBet || isPopupOpen
              }
              className="relative flex items-center justify-center overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
              style={{ width: BIG_BTN_WH, height: BIG_BTN_WH }}
              aria-label="Spin"
            >
              <Image
                src="/ui/play_button.png"
                alt="spin"
                fill
                className="object-contain"
              />
              <Image
                src="/ui/play_button_animated.png"
                alt="spin"
                fill
                className="object-contain ml-2 mt-2 pointer-events-none"
              />
            </button>

            <button
              onClick={() => {
                setBetAnchored(false);
                setModal("bet");
              }}
              disabled={!canSpin || isSpinning || isPopupOpen}
              className="relative"
              style={{ width: ICON_WH, height: ICON_WH }}
              aria-label="Increase bet / open popup"
            >
              <Image
                src="/ui/addbet.png"
                alt="addbet"
                fill
                className="object-contain"
              />
            </button>
          </div>

          {modal === "bet" && !betAnchored && <BetPopup anchored={false} />}
        </div>

        {/* unique modals */}
        {modal === "settings" && (
          <SettingsPopup
            key="settings-modal"
            onClose={() => setModal(null)}
            totalBet={totalBet}
            onTotalBetStep={(dir) => {
              const idx = currentIndex;
              if (dir < 0 && idx > 0) {
                setBet(allCombos[idx - 1].bet);
                setCoinIndex(allCombos[idx - 1].coinIndex);
              } else if (dir > 0 && idx < allCombos.length - 1) {
                setBet(allCombos[idx + 1].bet);
                setCoinIndex(allCombos[idx + 1].coinIndex);
              }
            }}
          />
        )}
        {modal === "rules" && (
          <GameRulesPopup
            key="rules-modal"
            onClose={() => setModal(null)}
            totalBet={totalBet}
          />
        )}
      </div>
    </div>
  );
}
