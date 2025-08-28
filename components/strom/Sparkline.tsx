'use client';
import { memo, useMemo } from 'react';
import type { PricePoint } from '@/lib/strom/utils';

type Props = {
  points: PricePoint[];
  width?: number;
  height?: number;
  strokeWidth?: number;
};

export default memo(function Sparkline({
  points,
  width = 300,
  height = 60,
  strokeWidth = 2
}: Props) {
  const d = useMemo(() => {
    if (!points?.length) return '';
    const xs = points.map((_, i) => i);
    const ys = points.map(p => p.value); // i øre/kWh i mock
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const span = max - min || 1;

    const xScale = (i: number) =>
      (i / Math.max(1, points.length - 1)) * (width - strokeWidth) + strokeWidth / 2;
    const yScale = (v: number) =>
      height - ((v - min) / span) * (height - strokeWidth) - strokeWidth / 2;

    return xs.map((i, j) => `${j === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(ys[j])}`).join(' ');
  }, [points, width, height, strokeWidth]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
});
