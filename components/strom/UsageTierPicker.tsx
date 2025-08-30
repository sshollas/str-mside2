"use client";

import { LightningBoltIcon } from "@radix-ui/react-icons";

type Props = {
  /** Nåværende månedlig forbruk i kWh */
  monthly: number;
  /** Callback når bruker velger et nivå (setter kWh/mnd) */
  onPick: (monthlyKwh: number) => void;
};

const TIERS = [
  { id: "low",  label: "", monthly: 500,  size: 16, title: "Lite forbruk (≈ 500 kWh/mnd)" },
  { id: "mid",  label: "", monthly: 1333, size: 24, title: "Middels forbruk (≈ 1 333 kWh/mnd)" },
  { id: "high", label: "", monthly: 2400, size: 35, title: "Stort forbruk (≈ 2 400 kWh/mnd)" },
] as const;

type TierId = typeof TIERS[number]["id"];

function nearestTier(monthly: number): TierId {
  const diffs = TIERS.map((t) => ({ id: t.id, d: Math.abs(t.monthly - monthly) }));
  diffs.sort((a, b) => a.d - b.d);
  return diffs[0]?.id ?? "mid";
}

export default function UsageTierPicker({ monthly, onPick }: Props) {
  const active = nearestTier(monthly);

  return (
    <div className="usage-tiers" role="group" aria-label="Velg typisk strømforbruk">
      {TIERS.map((t) => {
        const isActive = active === t.id;
        const aria = t.title || "Forbruksnivå";
        return (
          <button
            key={t.id}
            type="button"
            className={`usage-tier-btn ${isActive ? "is-active" : ""}`}
            onClick={() => onPick(t.monthly)}
            title={aria}
            aria-label={aria}
            aria-pressed={isActive}
          >
            <LightningBoltIcon width={t.size} height={t.size} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
