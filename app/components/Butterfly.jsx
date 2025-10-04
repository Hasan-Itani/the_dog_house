"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

export function Butterfly() {
  const [frame, setFrame] = useState(0);

  // 👇 переключаем крылья раз в 120 мс
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f === 0 ? 1 : 0));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="
        absolute inset-0 z-0 pointer-events-none select-none
        animate-butterfly-flight
      "
    >
      <div className="absolute animate-butterfly-path">
        <Image
          src={frame === 0 ? "/butterfly_up.png" : "/butterfly_down.png"}
          alt="butterfly"
          width={60}
          height={60}
          className="object-contain opacity-90"
          priority
        />
      </div>
    </div>
  );
}
