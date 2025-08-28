'use client';

import styles from './strom.module.css';
import type { Area } from '@/lib/strom/utils';

export type UsageTier = 'low' | 'mid' | 'high';

export default function StromSidebar({
  collapsed = false,          // (kan utvides senere)
  areas,
  areaCode,
  usageTier,
  onChangeArea,
  onChangeTier
}: {
  collapsed?: boolean;
  areas: Area[];
  areaCode: string;
  usageTier: UsageTier;
  onChangeArea: (code: string) => void;
  onChangeTier: (tier: UsageTier) => void;
}) {
  return (
    <aside className={styles.sidebar} aria-label="Filtre">
      <div className={styles.sidebarHeader}>
        <strong>Filtre</strong>
      </div>

      <div className={styles.filtersWrap}>

        <div className={styles.filterGroup}>
          <div className={styles.filterIcon}>📍</div>
          <div className={styles.filterBody}>
            <label>Område</label>
            <select
              value={areaCode}
              onChange={(e) => onChangeArea(e.target.value)}
            >
              {areas.map(a => (
                <option key={a.code} value={a.code}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterIcon}>
            <span className={`${styles.tierDot} ${
              usageTier === 'low' ? styles.tierLow : usageTier === 'mid' ? styles.tierMid : styles.tierHigh
            }`} />
          </div>
          <div className={styles.filterBody}>
            <label>Årlig forbruk</label>
            <div className={styles.tierButtons}>
              <button
                className={`${styles.tierBtn} ${usageTier === 'low' ? styles.tierBtnActive : ''}`}
                onClick={() => onChangeTier('low')}
                aria-pressed={usageTier === 'low'}
              >
                Lite
              </button>
              <button
                className={`${styles.tierBtn} ${usageTier === 'mid' ? styles.tierBtnActive : ''}`}
                onClick={() => onChangeTier('mid')}
                aria-pressed={usageTier === 'mid'}
              >
                Middels
              </button>
              <button
                className={`${styles.tierBtn} ${usageTier === 'high' ? styles.tierBtnActive : ''}`}
                onClick={() => onChangeTier('high')}
                aria-pressed={usageTier === 'high'}
              >
                Mye
              </button>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}
