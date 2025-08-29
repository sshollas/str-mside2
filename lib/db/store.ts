import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { type Offer, type PriceDump, slugify } from "@/lib/strom/utils";

const DATA_DIR = process.env.DATA_DIR || ".data";
const DUMP_FILE = path.join(DATA_DIR, "price-dump.json");
const SNAP_FILE = path.join(DATA_DIR, "price-snapshots.csv");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function loadDumpFromFile(): Promise<PriceDump | null> {
  try {
    const buf = await fs.readFile(DUMP_FILE, "utf8");
    const json = JSON.parse(buf) as PriceDump;
    return { ...json, source: "db" };
  } catch {
    return null;
  }
}

async function appendSnapshots(dump: PriceDump) {
  await ensureDir();
  // lag header hvis fil ikke finnes
  try {
    await fs.access(SNAP_FILE);
  } catch {
    await fs.writeFile(SNAP_FILE, "timestamp,offerId,spotPrice,monthlyFee\n", "utf8");
  }

  const lines = dump.offers
    .map((o) => `${dump.updatedAt},${o.id},${o.spotPrice},${o.monthlyFee}`)
    .join("\n") + "\n";

  await fs.appendFile(SNAP_FILE, lines, "utf8");
}

export async function saveDumpToFile(dump: PriceDump) {
  await ensureDir();
  const tmp = DUMP_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(dump, null, 2), "utf8");
  await fs.rename(tmp, DUMP_FILE);
  await appendSnapshots(dump);
}

export async function listVendorsFromFile(): Promise<{ name: string; slug: string }[]> {
  const dump = await loadDumpFromFile();
  if (!dump) return [];
  const set = new Set(dump.offers.map((o) => o.vendor));
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b, "nb"))
    .map((name) => ({ name, slug: slugify(name) }));
}

export async function offersByVendorSlugFromFile(slug: string): Promise<Offer[]> {
  const dump = await loadDumpFromFile();
  if (!dump) return [];
  return dump.offers.filter((o) => slugify(o.vendor) === slug);
}
