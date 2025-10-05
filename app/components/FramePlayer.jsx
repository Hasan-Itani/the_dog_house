"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * FramePlayer — swaps <img src> across a list of frames at a given FPS.
 * - requestAnimationFrame loop with delta timing for stable playback
 * - Loop & ping-pong modes
 * - Play/Pause, scrub to any frame (if you expose controls where used)
 * - Preloads all images (non-blocking) to avoid flicker
 *
 * Usage:
 *   const DOG_FRAMES = Array.from({ length: 36 }, (_, i) => `/symbols/animations/dog_anim/dog_${i+1}.png`);
 *   <FramePlayer frames={DOG_FRAMES} width={size} height={size} fps={24} autoplay loop />
 */
export default function FramePlayer({
  frames, // string[] of image URLs (from /public without the "/public" prefix)
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
    frames.forEach((src) => {
      const im = new Image();
      im.decoding = "async";
      im.loading = "eager";
      im.src = src;
    });
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

  return (
    <img
      src={frames[Math.max(0, Math.min(frame, frameCount - 1))]}
      alt="frame"
      width={width}
      height={height}
      className={`block w-full h-full object-contain select-none ${className}`}
      draggable={false}
    />
  );
}

/**
 * Optional helper: returns prebuilt arrays for known animated symbols.
 * Extend this as you add more animations.
 */
export const getFramesFor = (symbol) => {
  switch (symbol) {
    case "dog":
      return Array.from(
        { length: 36 },
        (_, i) => `/symbols/animations/dog_anim/dog_${i + 1}.png`
      );
    default:
      return null;
  }
};
