"use client";

import { LightningBoltIcon } from "@radix-ui/react-icons";

type Props = {
  /** Nåværende årlig forbruk i kWh */
  yearly: number;
  /** Callback når bruker velger et nivå (setter årlig kWh) */
  onPick: (yearlyKwh: number) => void;
};

const TIERS = [
  { id: "low", label: "Lite", monthly: 500,  yearly: 500 * 12,  size: 16, title: "Lite forbruk (≈ 500 kWh/mnd)" },
  { id: "mid", label: "Middels", monthly: 1333, yearly: 1333 * 12, size: 24, title: "Middels forbruk (≈ 1 333 kWh/mnd)" },
  { id: "high", label: "Stort", monthly: 2400, yearly: 2400 * 12, size: 35, title: "Stort forbruk (≈ 2 400 kWh/mnd)" },
] as const;

function nearestTier(yearly: number) {
  const diffs = TIERS.map((t) => ({ id: t.id, d: Math.abs(t.yearly - yearly) }));
  diffs.sort((a, b) => a.d - b.d);
  return diffs[0]?.id;
}

export default function UsageTierPicker({ yearly, onPick }: Props) {
  const active = nearestTier(yearly);

  return (
    <div className="usage-tiers" role="group" aria-label="Velg typisk strømforbruk">
      {TIERS.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            className={`usage-tier-btn ${isActive ? "is-active" : ""}`}
            onClick={() => onPick(t.yearly)}
            title={t.title}
            aria-pressed={isActive}
          >
            <LightningBoltIcon width={t.size} height={t.size} aria-hidden />
            <span className="usage-tier-label">{t.label}</span>
            <span className="usage-tier-sub">{t.monthly.toLocaleString("nb-NO")} kWh/mnd</span>
          </button>
        );
      })}
    </div>
  );
}
