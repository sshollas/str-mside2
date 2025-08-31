"use client";

import { useMemo, useState } from "react";
import { DealCard } from "@/components/strom/DealCard";
import { SidebarFilter } from "@/components/strom/SidebarFilter";
import {
  estimateMonthlyCost,
  type PriceDump,
  type Offer,
  VendorHelpers,
  type Area,
} from "@/lib/strom/utils";

type Props = { initialDump: PriceDump };
type AugmentedOffer = Offer & { estimatedMonthly?: number; promoted?: boolean; expiredAt?: string | null };

// Enkel forretningsscore
function businessScore(o: AugmentedOffer) {
  const affiliateBoost = o.programId ? 0.1 : 0;
  const price = o.estimatedMonthly ?? Number.POSITIVE_INFINITY;
  return affiliateBoost + 1 / Math.max(1, price);
}

export default function StromClient({ initialDump }: Props) {
  const [municipality, setMunicipality] = useState<string>("Oslo");
  const [suggestedArea, setSuggestedArea] = useState<Area | undefined>(undefined);
  const [area, setArea] = useState<"alle" | "auto" | Area>("alle");
  const [contractType, setContractType] = useState<string>("alle");
  const [query, setQuery] = useState("");
  const [vendor, setVendor] = useState<string>("alle");
  const [monthlyConsumption, setMonthlyConsumption] = useState<number>(1333); // primærsannhet (kWh/mnd)
  const [unsure, setUnsure] = useState<boolean>(false);
  const [sort, setSort] = useState<"est" | "addon" | "fee" | "name" | "rec">("est");
  const [warrantyFilters, setWarrantyFilters] = useState<{ ge12: boolean; m6to11: boolean; lt6: boolean }>({
    ge12: true,
    m6to11: true,
    lt6: false,
  });

  const vendorOptions = useMemo(() => ["alle", ...VendorHelpers.uniqueVendors(initialDump.offers)], [initialDump.offers]);

  const offers: AugmentedOffer[] = useMemo(() => {
    const activeArea = area === "auto" ? suggestedArea : area;
    const now = new Date();

    let list: AugmentedOffer[] = initialDump.offers.slice() as AugmentedOffer[];

    // Skjul uten CTA (mangler URL) – disse kan ligge nederst eller ut, vi velger å fjerne helt.
    list = list.filter((o) => !!o.url && o.url.trim().length > 0);

    // Skjul utløpte (expiredAt i fortiden)
    list = list.filter((o) => {
      const exp = (o as any).expiredAt as string | undefined | null;
      if (!exp) return true;
      const d = new Date(exp);
      return isFinite(d.getTime()) ? d >= now : true;
    });

    // Filtrering
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

    // Estimat (bruk månedlig forbruk direkte)
    list = list.map((o) => ({ ...o, estimatedMonthly: estimateMonthlyCost(o, monthlyConsumption) }));

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
    area,
    suggestedArea,
    contractType,
    vendor,
    query,
    sort,
    monthlyConsumption,
    warrantyFilters,
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
          onSuggestedArea={setSuggestedArea}
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
          sort={sort}
          onSort={setSort}
          onReset={resetFilters}
        />
        <div className="hint mt-2">
          Vi foreslår område fra kommune eller postnummer. Velg <strong>Auto ({suggestedArea?.toUpperCase() ?? "—"})</strong> for å bruke forslaget.
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
