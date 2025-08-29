import "server-only";
import { type VendorOffer } from "@/lib/strom/utils";

const API = process.env.VENDOR_API_URL;
const API_KEY = process.env.VENDOR_API_KEY;

export async function fetchOffersFromApi(): Promise<VendorOffer[]> {
  if (!API) throw new Error("VENDOR_API_URL mangler");

  const res = await fetch(API, {
    headers: {
      Accept: "application/json",
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    next: { revalidate: 900 },
  });

  if (!res.ok) {
    throw new Error(`Vendor API feilet: ${res.status}`);
  }

  const json = await res.json();
  const items: VendorOffer[] = Array.isArray(json) ? json : json.items ?? [];
  return items;
}

export type { VendorOffer };
