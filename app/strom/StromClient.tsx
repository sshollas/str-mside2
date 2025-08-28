'use client';

import { useMemo, useState, useCallback } from 'react';
import { avg, formatNok, type PriceDump } from '@/lib/strom/utils';
import Sidebar, { UsageTier } from '@/components/strom/StromSidebar';
import DealCard from '@/components/strom/DealCard';
import Sparkline from '@/components/strom/Sparkline';
import styles from '@/components/strom/strom.module.css';

type StromState = {
  areaCode: string | null;
  usageTier: UsageTier;
};

export default function StromClient({ initial }: { initial: PriceDump }) {
  const [state, setState] = useState<StromState>({
    areaCode: initial.areas[0]?.code ?? null,
    usageTier: 'mid',
  });

  const area = useMemo(
    () => initial.areas.find(a => a.code === state.areaCode) ?? initial.areas[0],
    [initial.areas, state.areaCode]
  );

  const annualKwh =
    state.usageTier === 'low' ? 8000 : state.usageTier === 'high' ? 25000 : 16000;

  // Pris i KR/kWh (konverter ØRE -> KR)
  const avgKwhPriceKr = useMemo(() => {
    const arrKr = area?.prices?.map(p => (p.value ?? 0) / 100) ?? [];
    return avg(arrKr);
  }, [area]);

  const estimatedMonthly = useMemo(
    () => (annualKwh / 12) * (avgKwhPriceKr || 0),
    [annualKwh, avgKwhPriceKr]
  );

  const providers = initial.providers ?? [];

  const onChangeArea = useCallback(
    (code: string) => setState(s => ({ ...s, areaCode: code })),
    []
  );
  const onChangeTier = useCallback(
    (tier: UsageTier) => setState(s => ({ ...s, usageTier: tier })),
    []
  );

  return (
    <div className={styles.page}>
      {/* Venstremeny */}
      <div className={styles.sidebar}>
        <Sidebar
          areas={initial.areas}
          areaCode={state.areaCode ?? ''}
          usageTier={state.usageTier}
          onChangeArea={onChangeArea}
          onChangeTier={onChangeTier}
        />
      </div>

      {/* Midt – liste + header */}
      <main className={styles.main}>
        <header className={styles.headerBar}>
          <div>
            <h1 style={{ margin: '0 0 6px' }}>Strømavtaler</h1>
            <div className={styles.subtle}>
              Område:{' '}
              <strong>
                {area?.name} ({area?.code})
              </strong>{' '}
              • Enhet: {initial.unit} • Valuta: {initial.currency}
            </div>
            <div className={styles.subtle} style={{ marginTop: 4 }}>
              Dagens snittpris:{' '}
              <strong>{formatNok(avgKwhPriceKr)}</strong> • Estimert pr. mnd:{' '}
              <strong>{formatNok(estimatedMonthly)}</strong>{' '}
              ({annualKwh.toLocaleString('nb-NO')} kWh/år)
            </div>
          </div>

          <div className={styles.sparkCard}>
            {area && <Sparkline points={area.prices} />}
          </div>
        </header>

        <section className={styles.list}>
          {providers.map(p => (
            <DealCard
              key={p.name}
              provider={p}
              monthlyEstimate={estimatedMonthly}
              areaLabel={`${area?.name} (${area?.code})`}
              spotPriceNok={avgKwhPriceKr}
            />
          ))}
        </section>
      </main>

      {/* Høyre – evt. “om listen” / tabell */}
      <aside className={styles.right}>
        <div>
          <h3 style={{ marginTop: 0 }}>Om denne listen</h3>
          <p className={styles.subtle}>
            Dette er en mock basert på en lokal JSON-dump. Når API-tilgang er på plass erstattes dette
            med live data (avtaletype, binding, prisgaranti m.m.).
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Felt</th>
                <th>Verdi</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Oppdatert</td><td>{new Date(initial.updatedAt).toLocaleString('nb-NO')}</td></tr>
              <tr><td>Område</td><td>{area?.name} ({area?.code})</td></tr>
              <tr><td>Snittpris (KR/kWh)</td><td>{avgKwhPriceKr.toFixed(2)}</td></tr>
              <tr><td>Ant. leverandører</td><td>{providers.length}</td></tr>
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  );
}
