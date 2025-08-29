import { type Offer, type PriceDump } from "@/lib/strom/utils";
import mock from "@/data/stromapi-mockup.json";

export type BlueprintItem = {
  id: number;
  name: string;
  type: string;
  orderUrl?: string | null;
  organization: {
    id: number;
    name: string;
    slug?: string;
    pricelistUrl?: string;
    number?: number;
  };
  publishedAt?: string;
  updatedAt?: string;
  monthlyConsumption?: number;
  conditions?: {
    agreementTime?: number;
    agreementTimeUnit?: "month" | "year" | string;
  };
  fee?: {
    monthlyFee?: number | string;
    finalMonthlyFee?: number | string;
  };
  currentPrice?: {
    addonPrice?: number | string;              // øre/kWh
    effectiveAddonPrice?: number | string;     // øre/kWh
    finalAddonPrice?: number | string;         // øre/kWh
    kwPrice?: number | string;                 // øre/kWh
    spotPrice?: number | string;               // øre/kWh
    electricityPerKwh?: number | string;       // øre/kWh
    finalKwPrice?: number | string;            // øre/kWh
    fullElectricityPerKwh?: number | string;   // øre/kWh
    finalPriceMonthly?: number | string;       // NOK/mnd
    electricityMonthlyConsumptionPrice?: number | string;
  };
};

// ---------------- helpers (eksportert for API-ruten også) ----------------

export function first<T>(...vals: Array<T | undefined | null>): T | undefined {
  for (const v of vals) if (v != null) return v as T;
  return undefined;
}

/** Parse number eller string med komma til number */
export function numMaybe(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const cleaned = v.replace(/\s/g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** øre/kWh → NOK/kWh, BEVARER FORTEGN (− for kampanjerabatt) */
export function toNokPerKwhSigned(v?: number): number | undefined {
  if (v == null || Number.isNaN(v)) return undefined;
  if (v === 0) return 0;
  // heuristikk: |v| > 10 → tolk som øre
  return Math.abs(v) > 10 ? v / 100 : v;
}

export function toContractTypeFromBlueprint(t?: string): Offer["contractType"] {
  const s = (t || "").toLowerCase();
  if (s.includes("spot")) return "spotpris";
  if (s.includes("fixed")) return "fastpris";
  if (s.includes("var")) return "variabel";
  return s === "hourly_spot" ? "spotpris" : "spotpris";
}

function toWarrantyMonths(n?: number, unit?: string): number | undefined {
  if (n == null) return undefined;
  const nn = Number(n);
  if (!Number.isFinite(nn) || nn <= 0) return undefined;
  const u = (unit || "").toLowerCase();
  if (u.startsWith("year")) return nn * 12;
  if (u.startsWith("month")) return nn;
  return nn;
}

// ---------------- mapping ----------------

function mapItem(i: BlueprintItem): Offer {
  const vendor = i.organization?.name || "Ukjent leverandør";
  const name = i.name || "Uten navn";
  const contractType = toContractTypeFromBlueprint(i.type);

  // CTA: kun orderUrl
  const url = (i.orderUrl || "")?.toString().trim();

  // Påslag: PRIORITER addonPrice (signert), deretter final/effective
  const addonNok =
    toNokPerKwhSigned(numMaybe(i.currentPrice?.addonPrice)) ??
    toNokPerKwhSigned(numMaybe(i.currentPrice?.finalAddonPrice)) ??
    toNokPerKwhSigned(numMaybe(i.currentPrice?.effectiveAddonPrice));

  // Total NOK/kWh
  const totalNok =
    toNokPerKwhSigned(numMaybe(i.currentPrice?.electricityPerKwh)) ??
    toNokPerKwhSigned(numMaybe(i.currentPrice?.fullElectricityPerKwh)) ??
    toNokPerKwhSigned(numMaybe(i.currentPrice?.finalKwPrice));

  // Spot: hvis vi har total og påslag
  const spotFromTotal =
    totalNok != null && addonNok != null ? Math.max(totalNok - addonNok, 0) : undefined;

  const spotDirect =
    toNokPerKwhSigned(numMaybe(i.currentPrice?.spotPrice)) ??
    toNokPerKwhSigned(numMaybe(i.currentPrice?.kwPrice));

  const spotPrice = first(spotFromTotal, spotDirect, 0) ?? 0;

  const monthlyFee =
    numMaybe(i.fee?.finalMonthlyFee) ?? numMaybe(i.fee?.monthlyFee) ?? 0;

  // Skjul påslag for ikke-spot (presentasjonsbeslutning): la det være undefined
  const addonForOffer =
    contractType === "spotpris" ? addonNok : undefined;

  return {
    id: String(i.id),
    vendor,
    name,
    url,
    trackingUrl: undefined,
    programId: undefined,
    area: undefined,
    municipality: undefined,
    contractType,
    spotPrice,
    monthlyFee,
    warrantyMonths: toWarrantyMonths(
      numMaybe(i.conditions?.agreementTime),
      i.conditions?.agreementTimeUnit
    ),
    sparkline: undefined,
    addonNokPerKwh: addonForOffer,
    perKwhTotalNok: totalNok,
  };
}

export function mapBlueprintDumpToPriceDump(input: unknown): PriceDump {
  const now = new Date().toISOString();
  let arr: BlueprintItem[] = [];

  if (Array.isArray(input)) {
    arr = input as BlueprintItem[];
  } else if (input && typeof input === "object" && Array.isArray((input as any).items)) {
    arr = (input as any).items as BlueprintItem[];
  } else {
    return { updatedAt: now, offers: [], source: "mock" };
  }

  const offers = arr.map(mapItem);
  return { updatedAt: now, offers, source: "mock" };
}

// ---------------- oppslag i mock ----------------

export function findBlueprintById(id: number): BlueprintItem | undefined {
  const data: any = mock as any;
  const arr: BlueprintItem[] = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  return arr.find((x) => Number(x?.id) === Number(id));
}
