"use client";

import { useMemo, useState } from "react";
import { DealCard } from "@/components/strom/DealCard";
import { SidebarFilter } from "@/components/strom/SidebarFilter";
import {
  estimateMonthlyCost,
  type PriceDump,
  type Offer,
  VendorHelpers,
  areaFromMunicipality,
} from "@/lib/strom/utils";

type Props = {
  initialDump: PriceDump;
};

// Enkel “forretningssignal”: boost hvis vi har affiliate-programId.
function businessScore(o: Offer & { estimatedMonthly?: number }) {
  const affiliateBoost = o.programId ? 0.1 : 0;
  const price = o.estimatedMonthly ?? Number.POSITIVE_INFINITY;
  return affiliateBoost + 1 / Math.max(1, price);
}

export default function StromClient({ initialDump }: Props) {
  const [municipality, setMunicipality] = useState<string>("Oslo");
  const [area, setArea] = useState<string>("alle");
  const [contractType, setContractType] = useState<string>("alle");
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState<string>("alle");
  const [yearlyConsumption, setYearlyConsumption] = useState<number>(16000);
  const [unsure, setUnsure] = useState<boolean>(false);
  const [sort, setSort] = useState<"est" | "addon" | "fee" | "name" | "rec">("est");
  const [warrantyFilters, setWarrantyFilters] = useState<{ ge12: boolean; m6to11: boolean; lt6: boolean }>({
    ge12: true,
    m6to11: true,
    lt6: false,
  });

  const monthlyConsumption = useMemo(() => Math.round((yearlyConsumption || 0) / 12), [yearlyConsumption]);
  const suggestedArea = useMemo(() => areaFromMunicipality(municipality), [municipality]);

  const vendorOptions = useMemo(
    () => ["alle", ...VendorHelpers.uniqueVendors(initialDump.offers)],
    [initialDump.offers]
  );

  const offers: (Offer & { estimatedMonthly?: number; promoted?: boolean })[] = useMemo(() => {
    const activeArea = area === "auto" ? suggestedArea : area;

    // Start med alle fra dump
    let list = initialDump.offers.slice();

    // 0) Skjul tilbud uten gyldig CTA (orderUrl mangler)
    list = list.filter((o) => !!o.url && o.url.trim().length > 0);

    // 1) Filtrering
    if (activeArea && activeArea !== "alle") list = list.filter((o) => o.area?.toLowerCase() === activeArea);
    if (contractType !== "alle") list = list.filter((o) => o.contractType.toLowerCase() === contractType);
    if (vendor !== "alle") list = list.filter((o) => o.vendor === vendor);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((o) => o.name.toLowerCase().includes(q) || o.vendor.toLowerCase().includes(q));

    const hasWarrantyFilter = warrantyFilters.ge12 || warrantyFilters.m6to11 || warrantyFilters.lt6;
    if (hasWarrantyFilter) {
      list = list.filter((o) => {
        const m = o.warrantyMonths;
        if (m == null) return true;
        if (m >= 12 && warrantyFilters.ge12) return true;
        if (m >= 6 && m <= 11 && warrantyFilters.m6to11) return true;
        if (m < 6 && warrantyFilters.lt6) return true;
        return false;
      });
    }

    // 2) Estimat
    list = list.map((o) => ({ ...o, estimatedMonthly: estimateMonthlyCost(o, monthlyConsumption) }));

    // 3) Sortering (primær)
    if (sort === "rec") {
      const before = [...list].sort((a, b) => (a.estimatedMonthly ?? 0) - (b.estimatedMonthly ?? 0));
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
            return a.monthlyFee - b.monthlyFee;
          case "name":
            return a.name.localeCompare(b.name, "nb");
          case "est":
          default:
            return (a.estimatedMonthly ?? Number.POSITIVE_INFINITY) - (b.estimatedMonthly ?? Number.POSITIVE_INFINITY);
        }
      });
    }

    // 4) Sikkerhetsnett (sekundær sorteringsnøkkel):
    //    selv om vi per nå skjuler uten CTA, behold en guard som alltid
    //    skyver "uten CTA" nederst dersom de noen gang skulle vises.
    list.sort((a, b) => {
      const aOk = !!a.url && a.url.trim().length > 0 ? 0 : 1;
      const bOk = !!b.url && b.url.trim().length > 0 ? 0 : 1;
      return aOk - bOk; // alle uten CTA ender etter alle med CTA
    });

    if (process.env.NODE_ENV !== "production") {
      console.debug("[strom] counts", {
        total: initialDump.offers.length,
        afterFilters: list.length,
        filters: { municipality, suggestedArea, activeArea, contractType, vendor, q, warrantyFilters, sort },
      });
    }

    return list;
  }, [
    initialDump.offers,
    area,
    suggestedArea,
    contractType,
    vendor,
    query,
    sort,
    monthlyConsumption,
    warrantyFilters,
    municipality,
  ]);

  const hasNoResults = offers.length === 0;

  function resetFilters() {
    setArea("alle");
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
          area={area}
          onArea={setArea}
          suggestedArea={suggestedArea}
          yearlyConsumption={yearlyConsumption}
          onYearlyConsumption={(v) => {
            setYearlyConsumption(v);
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
          sort={sort}
          onSort={setSort}
          monthlyConsumption={monthlyConsumption}
          onReset={resetFilters}
        />

        <div className="hint mt-2">
          Vi viser kun avtaler som kan bestilles (<strong>har lenke</strong>). Avtaler uten bestillingslenke vises ikke.
        </div>
      </aside>

      <section className="deal-stack" aria-label="Strømavtaler">
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
