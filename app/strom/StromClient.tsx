"use client";

import { useEffect, useMemo, useState } from "react";
import { DealCard } from "@/components/strom/DealCard";
import { SidebarFilter } from "@/components/strom/SidebarFilter";
import {
  estimateMonthlyCost,
  type PriceDump,
  type Offer,
  VendorHelpers,
  type Area,
  areaFromMunicipality,
} from "@/lib/strom/utils";

type Props = { initialDump: PriceDump };
type AugmentedOffer = Offer & { estimatedMonthly?: number; promoted?: boolean; expiredAt?: string | null };

function businessScore(o: AugmentedOffer) {
  const affiliateBoost = o.programId ? 0.1 : 0;
  const price = o.estimatedMonthly ?? Number.POSITIVE_INFINITY;
  return affiliateBoost + 1 / Math.max(1, price);
}

export default function StromClient({ initialDump }: Props) {
  // Feltet kan være kommunenavn eller postnummer. Vi bruker det kun til å foreslå område (NO1–NO5).
  const [municipality, setMunicipality] = useState<string>("Oslo");
  const [suggestedArea, setSuggestedArea] = useState<Area | undefined>(() => areaFromMunicipality("Oslo"));

  const [contractType, setContractType] = useState<string>("alle");
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState<string>("alle");
  const [monthlyConsumption, setMonthlyConsumption] = useState<number>(1333); // kWh/mnd
  const [unsure, setUnsure] = useState<boolean>(false);
  const [sort, setSort] = useState<"est" | "addon" | "fee" | "name" | "rec">("est");
  const [warrantyFilters, setWarrantyFilters] = useState<{ ge12: boolean; m6to11: boolean; lt6: boolean }>({
    ge12: true,
    m6to11: true,
    lt6: false,
  });

  // Når kommune/postnummer endrer seg → oppdater foreslått område (NO1–NO5)
  useEffect(() => {
    setSuggestedArea(areaFromMunicipality(municipality));
  }, [municipality]);

  const vendorOptions = useMemo(() => ["alle", ...VendorHelpers.uniqueVendors(initialDump.offers)], [initialDump.offers]);

  const offers: AugmentedOffer[] = useMemo(() => {
    const now = new Date();
    let list: AugmentedOffer[] = initialDump.offers.slice() as AugmentedOffer[];

    // Skjul kort uten CTA (mangler URL)
    list = list.filter((o) => !!o.url && o.url.trim().length > 0);

    // Skjul utløpte
    list = list.filter((o) => {
      const exp = (o as any).expiredAt as string | undefined | null;
      if (!exp) return true;
      const d = new Date(exp);
      return isFinite(d.getTime()) ? d >= now : true;
    });

    // Filtrering (OBS: ikke område – det brukes kun i beregning, ikke som filter)
    if (contractType !== "alle") list = list.filter((o) => o.contractType.toLowerCase() === contractType);
    if (vendor !== "alle") list = list.filter((o) => o.vendor === vendor);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((o) => o.name.toLowerCase().includes(q) || o.vendor.toLowerCase().includes(q));

    // Estimat – hvis dumpen inneholder spot for område, bruk den når tilbudet ikke har egen spot.
    const areaSpot =
      suggestedArea ? ((initialDump as any).spotByArea?.[suggestedArea] as number | undefined) : undefined;

    list = list.map((o) => {
      const effOffer: AugmentedOffer =
        o.spotPrice || !areaSpot ? o : ({ ...o, spotPrice: areaSpot } as AugmentedOffer);
      return { ...effOffer, estimatedMonthly: estimateMonthlyCost(effOffer, monthlyConsumption) };
    });

    // Sortering
    if (sort === "rec") {
      const before = [...list].sort(
        (a, b) => (a.estimatedMonthly ?? Number.POSITIVE_INFINITY) - (b.estimatedMonthly ?? Number.POSITIVE_INFINITY)
      );
      list.sort((a, b) => businessScore(b) - businessScore(a));
      const posBefore = new Map(before.map((o, i) => [o.id, i]));
      list = list.map((o, i) => {
        const was = posBefore.get(o.id) ?? i;
        const boosted = was > i && !!o.programId;
        return { ...o, promoted: boosted };
      });
    } else {
      list.sort((a, b) => {
        switch (sort) {
          case "addon": {
            const av = a.addonNokPerKwh ?? Number.POSITIVE_INFINITY;
            const bv = b.addonNokPerKwh ?? Number.POSITIVE_INFINITY;
            return av - bv;
          }
          case "fee":
            return (a.monthlyFee ?? Number.POSITIVE_INFINITY) - (b.monthlyFee ?? Number.POSITIVE_INFINITY);
          case "name":
            return a.name.localeCompare(b.name, "nb");
          case "est":
          default:
            return (a.estimatedMonthly ?? Number.POSITIVE_INFINITY) - (b.estimatedMonthly ?? Number.POSITIVE_INFINITY);
        }
      });
    }

    return list;
  }, [
    initialDump.offers,
    initialDump,
    suggestedArea,
    contractType,
    vendor,
    query,
    sort,
    monthlyConsumption,
    warrantyFilters, // behold hvis du filtrerer på garanti
  ]);

  const hasNoResults = offers.length === 0;

  function resetFilters() {
    setContractType("alle");
    setVendor("alle");
    setQuery("");
    setWarrantyFilters({ ge12: true, m6to11: true, lt6: false });
    setSort("est");
  }

  return (
    <div className="strom-layout">
      <aside className="strom-sidebar" aria-label="Filtermeny">
        <SidebarFilter
          municipality={municipality}
          onMunicipality={setMunicipality}
          monthlyConsumption={monthlyConsumption}
          onMonthlyConsumption={(v) => {
            setMonthlyConsumption(v);
            if (!unsure && v === 0) setUnsure(true);
          }}
          unsure={unsure}
          onUnsure={setUnsure}
          query={query}
          onQuery={setQuery}
          vendor={vendor}
          onVendor={setVendor}
          vendorOptions={vendorOptions}
          contractType={contractType}
          onContractType={setContractType}
          warrantyFilters={warrantyFilters}
          onWarrantyFilters={setWarrantyFilters}
          onReset={resetFilters}
        />
      </aside>

      <section className="deal-stack" aria-label="Strømavtaler">
        {/* Toolbar over feeden – sortering */}
        <div className="list-toolbar" role="region" aria-label="Visningsvalg">
          <label htmlFor="sort" className="label" style={{ marginRight: 6 }}>Sorter:</label>
          <select
            id="sort"
            className="select"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="est">Lavest estimat pr. mnd</option>
            <option value="addon">Lavest påslag</option>
            <option value="fee">Lavest månedsavgift</option>
            <option value="name">Navn (A–Å)</option>
            <option value="rec">Anbefalt</option>
          </select>
        </div>

        <div className="deal-header-row" role="row" aria-hidden>
          <div className="deal-header-left">Navn</div>
          <div className="deal-header-mid">Påslag</div>
          <div className="deal-header-mid">Månedsavgift</div>
          <div className="deal-header-mid">Estimert pr. mnd</div>
          <div className="deal-header-right sr-only md:not-sr-only">Kjøp</div>
        </div>

        {hasNoResults ? (
          <div className="empty-state" role="status" aria-live="polite">
            <p className="mb-2">Ingen treff med nåværende filtre.</p>
            <button className="btn-cta" onClick={resetFilters}>Tilbakestill filtre</button>
          </div>
        ) : (
          offers.map((offer) => <DealCard key={offer.id} offer={offer} variant="row" />)
        )}
      </section>
    </div>
  );
}
