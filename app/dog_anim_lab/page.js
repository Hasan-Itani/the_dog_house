"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Animation Lab — test any symbol's frame animation
 *
 * Drop this file at: app/dog_anim_lab/page.js
 * Visit: http://localhost:3000/dog_anim_lab
 *
 * Defaults to your dog frames:
 *   /public/symbols/animations/dog_anim/dog_1.png … dog_36.png
 *
 * Notes:
 * - Paths should NOT include "/public" at runtime. Use "/symbols/...".
 * - You can change folder/prefix/count to test other symbols if/when you add frames.
 */

// Known symbol keys in your project (for quick switching)
const SYMBOL_KEYS = [
  "dog",
  "milu",
  "milo", // alias in some of your older notes
  "pug",
  "taxa",
  "collar",
  "bone",
  "a",
  "k",
  "q",
  "j",
  "ten",
  "doghouse",
];

/**
 * FramePlayer — swaps <img src> across a list of frames at a given FPS.
 * - requestAnimationFrame loop with delta timing for stable playback
 * - Loop & ping-pong modes
 * - Play/Pause, scrub to any frame
 * - Preloads all images (non-blocking) to avoid flicker
 */
function FramePlayer({
  frames, // string[] of image URLs in /public
  fps = 24,
  autoplay = true,
  loop = true,
  pingpong = false,
  width = 256,
  height = 256,
  className = "",
  onFrame = () => {},
}) {
  const frameCount = frames.length;
  const [isPlaying, setIsPlaying] = useState(Boolean(autoplay));
  const [frame, setFrame] = useState(0);
  const [curFps, setCurFps] = useState(fps);
  const [isPingPong, setIsPingPong] = useState(Boolean(pingpong));
  const [isLoop, setIsLoop] = useState(Boolean(loop));

  const dirRef = useRef(1); // 1 forward, -1 backward (for ping-pong)
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);

  // --- preload images (fire & forget) ---
  useEffect(() => {
    const imgs = frames.map((src) => {
      const im = new Image();
      im.decoding = "async";
      im.loading = "eager"; // fine for small sprite frames
      im.src = src;
      return im;
    });
    return () => {
      // nothing — keep GC simple
    };
  }, [frames]);

  // --- animation loop ---
  const stepMs = useMemo(
    () => 1000 / Math.max(1, Math.min(60, curFps)),
    [curFps]
  );

  const tick = useCallback(
    (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const delta = ts - lastTsRef.current;

      if (isPlaying && delta >= stepMs) {
        lastTsRef.current = ts - (delta % stepMs);
        setFrame((prev) => {
          let next = prev + dirRef.current;

          if (isPingPong) {
            if (next >= frameCount) {
              dirRef.current = -1;
              next = Math.max(0, frameCount - 2);
            } else if (next < 0) {
              dirRef.current = 1;
              next = Math.min(1, frameCount - 1);
            }
          } else {
            if (next >= frameCount) {
              if (isLoop) next = 0;
              else {
                next = frameCount - 1;
                setIsPlaying(false); // stop at last frame
              }
            }
          }

          onFrame(next);
          return next;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [isPlaying, isLoop, isPingPong, frameCount, stepMs, onFrame]
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // Keyboard shortcuts: space = play/pause, ← → = step, home/end = jump
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIsPlaying(false);
        setFrame((f) => (f + 1) % frameCount);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIsPlaying(false);
        setFrame((f) => (f - 1 + frameCount) % frameCount);
      } else if (e.key === "Home") {
        setFrame(0);
      } else if (e.key === "End") {
        setFrame(frameCount - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [frameCount]);

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Stage */}
      <div
        className="relative grid place-items-center rounded-2xl border border-white/10 bg-white/5 shadow-xl"
        style={{ width, height }}
      >
        {/* Using <img> (not next/image) for fastest src swaps */}
        <img
          src={frames[Math.max(0, Math.min(frame, frameCount - 1))]}
          alt={`frame ${frame + 1}`}
          width={width}
          height={height}
          className="block w-full h-full object-contain select-none"
          draggable={false}
        />
        <div className="absolute bottom-1 right-2 text-xs text-white/70">
          {Math.min(frame + 1, frameCount)}/{frameCount}
        </div>
      </div>

      {/* Transport controls */}
      <div className="w-full max-w-[820px] rounded-xl bg-white/5 p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 focus:outline-none"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setFrame((f) => (f - 1 + frameCount) % frameCount);
            }}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
          >
            ◀︎ Prev
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setFrame((f) => (f + 1) % frameCount);
            }}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
          >
            Next ▶︎
          </button>

          <label className="ml-auto inline-flex items-center gap-2 text-xs text-white/80">
            <input
              type="checkbox"
              checked={isLoop}
              onChange={(e) => setIsLoop(e.target.checked)}
              className="size-4"
            />
            Loop
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-white/80">
            <input
              type="checkbox"
              checked={isPingPong}
              onChange={(e) => {
                dirRef.current = 1; // reset direction when toggling
                setIsPingPong(e.target.checked);
              }}
              className="size-4"
            />
            Ping–pong
          </label>
        </div>

        {/* Scrubber */}
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={Math.max(0, frameCount - 1)}
            value={Math.min(frame, Math.max(0, frameCount - 1))}
            onChange={(e) => {
              setIsPlaying(false);
              setFrame(Number(e.target.value));
            }}
            className="w-full accent-emerald-500"
          />
        </div>

        {/* FPS */}
        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs text-white/70 w-16">FPS</label>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={curFps}
            onChange={(e) => setCurFps(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <div className="w-10 text-right text-sm tabular-nums text-white/90">{curFps}</div>
          <button
            onClick={() => setCurFps(24)}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/15"
          >
            24
          </button>
          <button
            onClick={() => setCurFps(12)}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/15"
          >
            12
          </button>
          <button
            onClick={() => setCurFps(8)}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/15"
          >
            8
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnimLabPage() {
  const [symbol, setSymbol] = useState("dog");
  const [folder, setFolder] = useState("/symbols/animations/dog_anim");
  const [prefix, setPrefix] = useState("dog");
  const [startIndex, setStartIndex] = useState(1);
  const [count, setCount] = useState(36);
  const [stage, setStage] = useState({ w: 256, h: 256 });

  // Regenerate frames when inputs change
  const frames = useMemo(() => {
    return Array.from({ length: Math.max(0, count) }, (_, i) => {
      const idx = startIndex + i; // e.g., 1..36
      return `${folder}/${prefix}_${idx}.png`;
    });
  }, [folder, prefix, startIndex, count]);

  // Auto-update folder/prefix when symbol changes (presets)
  useEffect(() => {
    if (symbol === "dog") {
      setFolder("/symbols/animations/dog_anim");
      setPrefix("dog");
      setStartIndex(1);
      setCount(36);
    } else {
      // generic preset — edit if you add more animated sets later
      setFolder(`/symbols/animations/${symbol}_anim`);
      setPrefix(symbol);
      setStartIndex(1);
      setCount(36);
    }
  }, [symbol]);

  return (
    <main className="min-h-dvh w-dvw bg-[#0b0f1a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Animation Lab</h1>
        <p className="mt-1 text-white/70">
          Test frame animations for any symbol. Default preset uses dog (36 frames).
        </p>

        {/* Controls */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white/5 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white/80">Symbol preset</h2>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full rounded-lg bg-white/10 p-2 text-sm outline-none"
            >
              {SYMBOL_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <div className="mt-4 space-y-2 text-xs text-white/70">
              <div className="flex items-center gap-2">
                <label className="w-24">Folder</label>
                <input
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="flex-1 rounded-md bg-white/10 px-2 py-1 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24">Prefix</label>
                <input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="flex-1 rounded-md bg-white/10 px-2 py-1 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24">Start</label>
                <input
                  type="number"
                  value={startIndex}
                  onChange={(e) => setStartIndex(Number(e.target.value))}
                  className="w-24 rounded-md bg-white/10 px-2 py-1 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24">Count</label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-24 rounded-md bg-white/10 px-2 py-1 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white/80">Stage</h2>
            <div className="flex flex-wrap items-center gap-2">
              {[128, 192, 256, 320, 384, 448].map((s) => (
                <button
                  key={s}
                  onClick={() => setStage({ w: s, h: s })}
                  className={`rounded-md px-3 py-1 text-sm ${
                    stage.w === s ? "bg-emerald-500/90" : "bg-white/10 hover:bg-white/15"
                  }`}
                >
                  {s}×{s}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
              <span>W</span>
              <input
                type="number"
                value={stage.w}
                onChange={(e) => setStage((st) => ({ ...st, w: Number(e.target.value) }))}
                className="w-24 rounded-md bg-white/10 px-2 py-1 outline-none"
              />
              <span>H</span>
              <input
                type="number"
                value={stage.h}
                onChange={(e) => setStage((st) => ({ ...st, h: Number(e.target.value) }))}
                className="w-24 rounded-md bg-white/10 px-2 py-1 outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white/80">Static previews</h2>
            <div className="flex items-center gap-3">
              <div className="text-xs text-white/70">clear_symbols</div>
              <img
                src={`/symbols/clear_symbols/${symbol}.png`}
                alt={`${symbol}`}
                className="h-16 w-16 object-contain"
              />
              <div className="text-xs text-white/70">blur_symbols</div>
              <img
                src={`/symbols/blur_symbols/${symbol}_blur.png`}
                alt={`${symbol}`}
                className="h-16 w-16 object-contain"
                onError={(e) => (e.currentTarget.style.opacity = 0.25)}
              />
            </div>
          </div>
        </div>

        {/* Player */}
        <div className="mt-8">
          <FramePlayer
            frames={frames}
            width={stage.w}
            height={stage.h}
            fps={24}
            autoplay
            loop
            pingpong={false}
          />
        </div>
      </div>
    </main>
  );
}
