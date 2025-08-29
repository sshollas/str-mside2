"use client";

import { memo, useMemo } from "react";

type Props = { points: number[] };

export const Sparkline = memo(({ points }: Props) => {
  const d = useMemo(() => {
    if (!points || points.length === 0) return "";
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = Math.max(1, max - min);
    const w = 120;
    const h = 36;
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p - min) / range) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  if (!d) return null;

  return (
    <svg width="120" height="36" viewBox="0 0 120 36" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" opacity={0.5} />
    </svg>
  );
});
Sparkline.displayName = "Sparkline";
