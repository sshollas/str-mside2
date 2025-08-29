import { NextResponse } from "next/server";
import { findBlueprintById } from "@/lib/strom/blueprint";
import { toContractTypeFromBlueprint, toNokPerKwhSigned, numMaybe } from "@/lib/strom/blueprint";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const idStr = params.id;
  const idNum = Number(idStr);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const item = findBlueprintById(idNum);
  if (!item) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Ekstraher felter vi vil gi til klienten
  const contractType = toContractTypeFromBlueprint(item.type);

  const addon =
    toNokPerKwhSigned(numMaybe(item.currentPrice?.addonPrice)) ??
    toNokPerKwhSigned(numMaybe(item.currentPrice?.finalAddonPrice)) ??
    toNokPerKwhSigned(numMaybe(item.currentPrice?.effectiveAddonPrice));

  const total =
    toNokPerKwhSigned(numMaybe(item.currentPrice?.electricityPerKwh)) ??
    toNokPerKwhSigned(numMaybe(item.currentPrice?.fullElectricityPerKwh)) ??
    toNokPerKwhSigned(numMaybe(item.currentPrice?.finalKwPrice));

  return NextResponse.json({
    id: String(item.id),
    name: item.name,
    vendor: item.organization?.name ?? "",
    contractType,
    updatedAt: item.updatedAt ?? item.publishedAt ?? null,
    addonNokPerKwh: addon ?? null,
    perKwhTotalNok: total ?? null,
    monthlyFee:
      numMaybe(item.fee?.finalMonthlyFee) ??
      numMaybe(item.fee?.monthlyFee) ??
      null,
    orderUrl: item.orderUrl ?? null,
    pricelistUrl: item.organization?.pricelistUrl ?? null,
  });
}
