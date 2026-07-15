"use client";
import { useEffect, useRef, useState } from "react";

export default function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || value === 0) {
      setDisplay(value);
      return;
    }
    done.current = true;
    const start = performance.now();
    const duration = 750;
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display}</>;
}
