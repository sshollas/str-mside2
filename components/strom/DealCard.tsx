import styles from './strom.module.css';
import { formatNok } from '@/lib/strom/utils';

export default function DealCard({
  provider,
  monthlyEstimate,
  areaLabel,
  spotPriceNok // valgfritt – i KR/kWh hvis du sender inn
}: {
  provider: { name: string; url: string | null };
  monthlyEstimate: number;
  areaLabel: string;
  spotPriceNok?: number;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.row}>
        <div>
          <h2 style={{ margin: 0 }}>{provider.name}</h2>
          <div className={styles.subtle}>
            Område: {areaLabel} • {spotPriceNok != null ? `${spotPriceNok.toFixed(2)} kr/kWh` : 'Spotpris (demo)'}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div className={styles.subtle}>Estimert pr. mnd</div>
          <strong style={{ fontSize: '1.25rem' }}>{formatNok(monthlyEstimate)}</strong>
        </div>
      </div>

      {provider.url && (
        <div>
          <a href={provider.url} target="_blank" rel="noopener noreferrer">
            Les mer →
          </a>
        </div>
      )}
    </article>
  );
}
