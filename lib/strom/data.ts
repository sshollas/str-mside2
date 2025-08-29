import "server-only";
import { fetchOffersFromApi } from "@/lib/vendorapi/client";
import { mapVendorToPriceDump, type PriceDump } from "@/lib/strom/utils";
import { getLatestPriceDump, upsertOffersAndSnapshot } from "@/lib/db/sqlite";
import mock from "@/data/stromapi-mockup.json";
import { mapBlueprintDumpToPriceDump } from "@/lib/strom/blueprint";

export async function getOffersCached(maxAgeMinutes = 15): Promise<PriceDump> {
  const fromDb = await getLatestPriceDump();
  const now = Date.now();
  const fresh =
    fromDb && now - new Date(fromDb.updatedAt).getTime() < maxAgeMinutes * 60 * 1000;
  if (fresh) return fromDb!;

  try {
    const vendorItems = await fetchOffersFromApi(); // VendorOffer[]
    const dump = mapVendorToPriceDump(vendorItems);
    await upsertOffersAndSnapshot(dump);
    return dump;
  } catch {
    if (fromDb) return fromDb;
    const dump = mapBlueprintDumpToPriceDump(mock as unknown);
    return dump;
  }
}
