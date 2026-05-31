"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

export default function CountUp({
  value,
  decimals = 0,
  duration = 900,
  className = "",
  suffix,
}: Props) {
  const [n, setN] = useState(value);
  const rafRef = useRef<number | null>(null);
  const lastVal = useRef(value);

  useEffect(() => {
    const start = performance.now();
    const from = lastVal.current;
    const to = value;
    if (from === to) return;
    const tick = (t: number) => {
      const elapsed = t - start;
      const k = Math.min(1, elapsed / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - k, 3);
      setN(from + (to - from) * eased);
      if (k < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        lastVal.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className={`tabular-num ${className}`}>
      {n.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix && (
        <span className="text-sm font-mono ml-1.5 opacity-60">{suffix}</span>
      )}
    </span>
  );
}
