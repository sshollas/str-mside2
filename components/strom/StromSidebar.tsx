"use client";

import styles from "./strom.module.css";
import { AREA_OPTIONS, type Area } from "@/lib/strom/utils";

export type UsageTier = "low" | "mid" | "high";

type AreaFilter = "alle" | "auto" | Area;

type Props = {
  area: AreaFilter;
  onArea: (v: AreaFilter) => void;
  suggestedArea?: Area;
};

export default function StromSidebar({ area, onArea, suggestedArea }: Props) {
  return (
    <aside className={styles.sidebar} aria-label="Filtermeny">
      <div className={styles.block}>
        <label className={styles.label}>Område</label>
        <select
          className={styles.select}
          value={area}
          onChange={(e) => onArea(e.target.value as AreaFilter)}
        >
          <option value="alle">Alle</option>
          {suggestedArea ? (
            <option value="auto">Auto ({suggestedArea.toUpperCase()})</option>
          ) : (
            <option value="auto">Auto</option>
          )}
          {AREA_OPTIONS.map((a) => (
            <option key={a.code} value={a.code}>
              {a.name} ({a.code.toUpperCase()})
            </option>
          ))}
        </select>
        <div className={styles.hint}>
          Velg “Auto” for å foreslå område fra kommune, eller sett manuelt.
        </div>
      </div>
    </aside>
  );
}
