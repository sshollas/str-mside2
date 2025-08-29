// lib/strom/utils.ts

// ===== Typer vi bruker i hele appen =====

export type Offer = {
  id: string;
  vendor: string;
  name: string;
  url: string; // orderUrl – kan være tom hvis mangler
  trackingUrl?: string;
  programId?: string;
  area?: string; // NO1..NO5 (lowercase)
  municipality?: string;
  contractType: "spotpris" | "fastpris" | "variabel" | (string & {});
  // Prisfelt
  spotPrice: number; // NOK/kWh
  monthlyFee: number; // NOK/mnd
  warrantyMonths?: number;
  sparkline?: number[];
  // Differensiatorer
  addonNokPerKwh?: number;  // NOK/kWh (kan være negativ ved rabatt)
  perKwhTotalNok?: number;  // NOK/kWh (spot+påslag+avgifter)
};

export type PriceDump = {
  updatedAt: string;
  offers: Offer[];
  source?: "api" | "mock" | "db";
};

// ===== Kalkyle og formatering =====

/**
 * Estimat per måned:
 *  - Bruk perKwhTotalNok hvis tilgjengelig
 *  - Ellers (spot + addon) hvis begge finnes
 *  - Hvis vi mangler kWh-pris -> undefined (UI viser "—")
 */
export function estimateMonthlyCost(offer: Offer, monthlyConsumptionKwh: number): number | undefined {
  const kwh = Math.max(0, monthlyConsumptionKwh);
  const perKwh =
    offer.perKwhTotalNok ??
    (offer.addonNokPerKwh != null && offer.spotPrice != null
      ? offer.spotPrice + offer.addonNokPerKwh
      : undefined);

  if (perKwh == null) return undefined;
  const energy = perKwh * kwh;
  const fee = offer.monthlyFee || 0;
  return Math.round(energy + fee);
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatNokPerKwh(n: number): string {
  return `${new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}/kWh`;
}

/** Viser påslag i øre/kWt, f.eks. "−1,30 øre/kWt" */
export function formatOrePerKwh(nokPerKwh: number): string {
  const ore = nokPerKwh * 100; // 0.0799 kr -> 7.99 øre
  const s = new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ore);
  return `${s} øre/kWt`;
}

/** Lang norsk dato: "20. august 2025" */
export function formatDateLongNb(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ===== Leverandør-API (ikke blueprint/mock) =====

export type VendorOffer = {
  id: string;
  supplier: string;
  title: string;
  deeplink?: string;
  url?: string;
  landingPage?: string;
  link?: string;
  programId?: string;
  area?: string;
  municipality?: string;
  contractType?: string;
  spotNokPerKwh: number;
  monthlyFeeNok: number;
  warrantyMonths?: number;
  sparkline?: number[];
  trackingUrl?: string;
  tracking?: string;
  trackUrl?: string;
};

function firstNonEmpty(...vals: Array<string | undefined | null>): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

/** Mapping for leverandør-API (ikke blueprint). Addon/total er ikke satt her. */
export function mapVendorToPriceDump(items: VendorOffer[]): { updatedAt: string; offers: Offer[]; source: "api" } {
  const offers: Offer[] = items.map((v) => {
    const url = firstNonEmpty(v.deeplink, v.url, v.landingPage, v.link);
    const trackingUrl = firstNonEmpty(v.trackingUrl, v.tracking as any, v.trackUrl as any);
    return {
      id: v.id,
      vendor: v.supplier,
      name: v.title,
      url, // kan være tom
      trackingUrl,
      programId: v.programId,
      area: v.area?.toLowerCase(),
      municipality: v.municipality,
      contractType: (v.contractType?.toLowerCase() as Offer["contractType"]) || "spotpris",
      spotPrice: v.spotNokPerKwh,
      monthlyFee: v.monthlyFeeNok,
      warrantyMonths: v.warrantyMonths,
      sparkline: v.sparkline,
      addonNokPerKwh: undefined,
      perKwhTotalNok: undefined,
    };
  });
  return { updatedAt: new Date().toISOString(), offers, source: "api" };
}

// ===== Diverse helpers =====

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export const VendorHelpers = {
  uniqueVendors(offers: Offer[]): string[] {
    return Array.from(new Set(offers.map((o) => o.vendor))).sort((a, b) => a.localeCompare(b, "nb"));
  },
};

/**
 * Grov heuristikk fra kommunenavn til områdekode (no1..no5).
 * Brukes kun for forslag i filteret ("Auto"), ikke som auto-filter.
 */
export function areaFromMunicipality(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const k = name.trim().toLowerCase();

  // NO1 – Østlandet (Oslo m.fl.)
  if (["oslo", "lillestrøm", "asker", "bærum"].includes(k)) return "no1";

  // NO2 – Sør/Vest
  if (["stavanger", "kristiansand", "sandnes"].some((x) => k.includes(x))) return "no2";

  // NO3 – Midt
  if (["trondheim", "stjørdal", "malvik"].some((x) => k.includes(x))) return "no3";

  // NO4 – Nord
  if (["tromsø", "alta", "hammerfest"].some((x) => k.includes(x))) return "no4";

  // NO5 – Vestlandet
  if (["bergen", "askøy", "øygarden"].some((x) => k.includes(x))) return "no5";

  return undefined;
}
