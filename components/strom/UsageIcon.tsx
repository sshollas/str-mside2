"use client";

import { Zap } from "lucide-react";

type Props = {
  /** Omtrentlig kWh per måned. Brukes kun for ikonstyrke. */
  kwhMonthly?: number;
  /** Størrelse på ikonene */
  size?: number; // px
  /** Titel for a11y, settes automatisk hvis ikke oppgitt */
  title?: string;
};

function tierFromKwh(kwh?: number): 0 | 1 | 2 | 3 {
  if (kwh == null || !Number.isFinite(kwh)) return 0;
  if (kwh < 800) return 1;
  if (kwh < 2000) return 2;
  return 3;
}

/**
 * Viser 1–3 lyn (Zap) for å gi en rask visuell følelse av forbruk.
 * Null data -> 0 (grå, lav opacity).
 */
export function UsageIcon({ kwhMonthly, size = 16, title }: Props) {
  const tier = tierFromKwh(kwhMonthly);
  const label =
    title ??
    (tier === 0
      ? "Ukjent forbruk"
      : tier === 1
      ? "Lavt forbruk"
      : tier === 2
      ? "Middels forbruk"
      : "Høyt forbruk");

  const common = { width: size, height: size, strokeWidth: 2 };

  return (
    <span className="inline-flex items-center" aria-label={label} title={label}>
      <Zap {...common} className="opacity-90" aria-hidden />
      <Zap {...common} className={tier >= 2 ? "opacity-70" : "opacity-25"} aria-hidden />
      <Zap {...common} className={tier >= 3 ? "opacity-60" : "opacity-15"} aria-hidden />
    </span>
  );
}
