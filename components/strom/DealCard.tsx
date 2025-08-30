"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkline } from "@/components/strom/Sparkline";
import { adtractionClickUrl } from "@/lib/strom/affiliate/links";
import {
  formatCurrency,
  formatNokPerKwh,
  formatOrePerKwh,
  formatDateLongNb,
  type Offer,
} from "@/lib/strom/utils";
import { Plus, Minus } from "lucide-react";
import { UsageIcon } from "@/components/strom/UsageIcon";

type Props = {
  offer: (Offer & { estimatedMonthly?: number; promoted?: boolean });
  variant?: "row";
};

type OfferDetails = {
  id: string;
  name: string;
  vendor: string;
  contractType: Offer["contractType"];
  updatedAt?: string;
  addonNokPerKwh?: number;
  perKwhTotalNok?: number;
  monthlyFee?: number;
  orderUrl?: string;
  pricelistUrl?: string;
};

export function DealCard({ offer, variant = "row" }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<OfferDetails | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const tracking = adtractionClickUrl({
    programId: offer.programId,
    deepLink: offer.url,
    source: "stromliste",
    extra: { offerId: offer.id },
  });
  const href = (tracking || offer.url || "").trim();

  const monthLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("nb-NO", { month: "long" });
  }, []);

  const handleToggle = useCallback(async () => {
    setOpen((prev) => !prev);
    if (!open && !details) {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`/api/offer/${offer.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: OfferDetails = await res.json();
        setDetails(data);
      } catch (e) {
        setErr("Kunne ikke hente flere detaljer nå.");
      } finally {
        setLoading(false);
      }
    }
  }, [open, details, offer.id]);

  if (variant !== "row") return null;

  const showAddon =
    (details?.contractType ?? offer.contractType) === "spotpris" &&
    (details?.addonNokPerKwh ?? offer.addonNokPerKwh) != null;

  const addonText = showAddon
    ? formatOrePerKwh((details?.addonNokPerKwh ?? offer.addonNokPerKwh) as number)
    : "—";

  const perKwh =
    details?.perKwhTotalNok ??
    offer.perKwhTotalNok ??
    (offer.addonNokPerKwh != null && offer.spotPrice != null ? offer.spotPrice + offer.addonNokPerKwh : undefined);
  const approxKwh =
    perKwh && offer.estimatedMonthly != null
      ? Math.max(0, Math.round((offer.estimatedMonthly - (offer.monthlyFee || 0)) / perKwh))
      : undefined;

  return (
    <article
      className={`deal-box deal-grid ${open ? "deal-open" : ""}`}
      role="row"
      onClick={handleToggle}
      aria-expanded={open}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      {/* VENSTRE: Navn + meta */}
      <div className="deal-cell deal-name" role="cell">
        <div className="deal-title">
          <span className="vendor">{offer.vendor}</span>{" "}
          <span className="name">{offer.name}</span>
        </div>
        <div className="deal-meta">
          <span className="badge">{offer.contractType}</span>
          {offer.area ? <span className="badge">{offer.area.toUpperCase()}</span> : null}
          {offer.promoted ? (
            <span className="badge badge-promoted" title="Denne plasseringen kan være kommersielt påvirket">
              Promotert
            </span>
          ) : null}
        </div>
        {/* NB: Knappen plasseres nederst-venstre via CSS i .deal-name */}
        <button
          type="button"
          className="deal-expand-toggle inline-flex items-center gap-1"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          title={open ? "Lukk" : "Åpne"}
        >
          {open ? <Minus className="w-4 h-4" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
          <span className="sr-only">{open ? "Lukk" : "Åpne"}</span>
        </button>
      </div>

      {/* MIDTKOLONNER */}
      <div className="deal-cell deal-col" role="cell" aria-label="Påslag per kWh">
        <div className="deal-col-label">Påslag</div>
        <div className="deal-col-value">
          {offer.addonNokPerKwh != null ? formatNokPerKwh(offer.addonNokPerKwh) : "—"}
        </div>
      </div>

      <div className="deal-cell deal-col" role="cell" aria-label="Månedsavgift">
        <div className="deal-col-label">Månedsavgift</div>
        <div className="deal-col-value">
          {offer.monthlyFee != null ? `${formatCurrency(offer.monthlyFee)}/mnd` : "—"}
        </div>
      </div>

      <div className="deal-cell deal-col" role="cell" aria-label="Estimert pr. mnd">
        <div className="deal-col-label">Estimert pr. mnd</div>
        <div className="deal-col-value">
          {offer.estimatedMonthly != null ? formatCurrency(offer.estimatedMonthly) : "—"}
        </div>
        {offer.perKwhTotalNok != null ? (
          <div className="deal-col-subtle" title="Total pris per kWh (inkl. spot+påslag+avgifter)">
            Totalt: {formatNokPerKwh(offer.perKwhTotalNok)}
          </div>
        ) : null}
      </div>

      {/* HØYRE: CTA */}
      <div className="deal-cell deal-cta" role="cell">
        {href ? (
          <Link
            href={href}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="btn-cta"
            aria-label={`Gå til ${offer.vendor} – ${offer.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            Til avtale
          </Link>
        ) : (
          <button className="btn-cta" disabled aria-disabled="true" title="Manglende bestillingslenke" onClick={(e) => e.stopPropagation()}>
            Ikke tilgjengelig
          </button>
        )}
        <Sparkline points={offer.sparkline ?? []} />
      </div>

      {/* DETALJPANEL */}
      {open && (
        <div className="deal-details" role="region" aria-label={`Detaljer for ${offer.name}`}>
          {loading && <div className="deal-details-row">Laster detaljer …</div>}
          {err && <div className="deal-details-row error">{err}</div>}
          {!loading && !err && (
            <>
              <div className="deal-details-row">
                <div className="deal-details-title">{offer.name}</div>
                <div className="deal-details-sub">{offer.vendor}</div>
              </div>

              {details?.updatedAt ? (
                <div className="deal-details-row">
                  Vilkårene til denne avtalen ble sist endret {formatDateLongNb(details.updatedAt)}.
                </div>
              ) : null}

              <div className="deal-details-row grid-two">
                <div>
                  <div className="muted">Påslag til {offer.vendor}</div>
                  <div className="emph">{addonText}</div>
                </div>

                <div>
                  <div className="muted">Månedspris til {offer.vendor}</div>
                  <div className="emph">
                    {offer.monthlyFee != null ? formatCurrency(offer.monthlyFee) : "—"}
                  </div>
                </div>
              </div>

              <div className="deal-details-row flex items-center gap-3">
                <div>
                  <div className="muted">Beregnet strømutgift for {monthLabel}</div>
                  <div className="emph">
                    {offer.estimatedMonthly != null ? formatCurrency(offer.estimatedMonthly) : "—"}
                  </div>
                </div>
                <UsageIcon kwhMonthly={approxKwh} />
              </div>

              <div className="deal-details-row">
                <div className="note">
                  Nettleien kommer i tillegg til dette beløpet. Det er i nettleien at strømstøtten trekkes fra.
                </div>
              </div>

              <div className="deal-details-row links">
                {details?.pricelistUrl ? (
                  <a href={details.pricelistUrl} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                    Vis detaljer
                  </a>
                ) : null}
                {details?.orderUrl || href ? (
                  <a href={details?.orderUrl || href} target="_blank" rel="nofollow sponsored noopener" onClick={(e) => e.stopPropagation()}>
                    Mer om strømavtalen
                  </a>
                ) : null}
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
