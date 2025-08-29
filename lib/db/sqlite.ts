import "server-only";
import { createClient, type Client } from "@libsql/client";
import { slugify, type Offer, type PriceDump } from "@/lib/strom/utils";

// --- klient singleton / konfig ------------------------------------------------

let client: Client | null = null;
let schemaEnsured = false;

function getUrl(): string | null {
  return (
    process.env.LIBSQL_URL ||
    process.env.TURSO_DATABASE_URL ||
    null
  );
}

function getAuth(): string | undefined {
  return (
    process.env.LIBSQL_AUTH_TOKEN ||
    process.env.TURSO_AUTH_TOKEN ||
    undefined
  );
}

function hasDb(): boolean {
  const url = getUrl();
  return !!url && /^libsql:\/\//.test(url);
}

function getClient(): Client | null {
  if (!hasDb()) return null;
  if (!client) {
    const url = getUrl();
    if (!url) return null;
    client = createClient({ url, authToken: getAuth() });
  }
  return client;
}

// --- skjema -------------------------------------------------------------------

async function ensureSchema(): Promise<void> {
  if (schemaEnsured) return;
  const db = getClient();
  if (!db) return;
  // price_snapshots: lagrer hele PriceDump for historikk/debug
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS price_snapshots (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        updated_at   TEXT NOT NULL,
        dump_json    TEXT NOT NULL
      );
    `,
    args: [],
  });

  // vendors: unikt navn/slug
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS vendors (
        vendor_slug  TEXT PRIMARY KEY,
        name         TEXT NOT NULL
      );
    `,
    args: [],
  });

  // offers: lagre siste kjente versjon per offer.id + vendordata for raske oppslag
  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS offers (
        id           TEXT PRIMARY KEY,
        vendor       TEXT NOT NULL,
        vendor_slug  TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        offer_json   TEXT NOT NULL
      );
    `,
    args: [],
  });

  schemaEnsured = true;
}

// --- offentlige API-er --------------------------------------------------------

/**
 * Returner ferskeste PriceDump fra DB, eller null hvis ikke finnes/ingen DB.
 */
export async function getLatestPriceDump(): Promise<PriceDump | null> {
  const db = getClient();
  if (!db) return null;
  await ensureSchema();

  const res = await db.execute({
    sql: `SELECT dump_json, updated_at FROM price_snapshots ORDER BY datetime(updated_at) DESC LIMIT 1`,
    args: [],
  });

  const row = res.rows?.[0];
  if (!row) return null;

  try {
    const parsed = JSON.parse(String(row.dump_json)) as PriceDump;
    // Sørg for at updatedAt finnes
    if (!parsed.updatedAt) {
      parsed.updatedAt = String(row.updated_at);
    }
    parsed.source = "db";
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Lagre dagens offers (upsert) og ta et snapshot.
 * Tåler manglende DB (no-op).
 */
export async function upsertOffersAndSnapshot(dump: PriceDump): Promise<void> {
  const db = getClient();
  if (!db) return; // valgfri DB
  await ensureSchema();

  // Snapshot først
  await db.execute({
    sql: `INSERT INTO price_snapshots (updated_at, dump_json) VALUES (?, ?)`,
    args: [dump.updatedAt, JSON.stringify(dump)],
  });

  // Upsert vendors + offers
  for (const o of dump.offers) {
    const vslug = slugify(o.vendor);

    // vendors
    await db.execute({
      sql: `
        INSERT INTO vendors (vendor_slug, name)
        VALUES (?, ?)
        ON CONFLICT(vendor_slug) DO UPDATE SET
          name = excluded.name
      `,
      args: [vslug, o.vendor],
    });

    // offers
    await db.execute({
      sql: `
        INSERT INTO offers (id, vendor, vendor_slug, updated_at, offer_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          vendor = excluded.vendor,
          vendor_slug = excluded.vendor_slug,
          updated_at = excluded.updated_at,
          offer_json = excluded.offer_json
      `,
      args: [o.id, o.vendor, vslug, dump.updatedAt, JSON.stringify(o)],
    });
  }
}

/**
 * Liste over leverandører (slug + navn).
 */
export async function getVendors(): Promise<Array<{ slug: string; name: string }>> {
  const db = getClient();
  if (!db) return [];
  await ensureSchema();

  const res = await db.execute({
    sql: `SELECT vendor_slug AS slug, name FROM vendors ORDER BY name COLLATE NOCASE ASC`,
    args: [],
  });

  const items: Array<{ slug: string; name: string }> = [];
  for (const r of res.rows ?? []) {
    const slug = String((r as any).slug ?? (r as any).vendor_slug ?? "");
    const name = String((r as any).name ?? "");
    if (slug && name) items.push({ slug, name });
  }
  return items;
}

/**
 * Hent alle offers for en gitt vendor-slug.
 */
export async function getOffersByVendorSlug(slug: string): Promise<Offer[]> {
  const db = getClient();
  if (!db) return [];
  await ensureSchema();

  const res = await db.execute({
    sql: `SELECT offer_json FROM offers WHERE vendor_slug = ? ORDER BY datetime(updated_at) DESC`,
    args: [slug],
  });

  const out: Offer[] = [];
  for (const r of res.rows ?? []) {
    try {
      const o = JSON.parse(String((r as any).offer_json)) as Offer;
      out.push(o);
    } catch {
      // ignore broken rows
    }
  }
  return out;
}

/**
 * Enkel hjelp for å rydde gammel historikk (valgfritt å bruke).
 */
export async function pruneSnapshots(keepLastN = 50): Promise<void> {
  const db = getClient();
  if (!db) return;
  await ensureSchema();

  await db.execute({
    sql: `
      DELETE FROM price_snapshots
      WHERE id NOT IN (
        SELECT id FROM price_snapshots ORDER BY datetime(updated_at) DESC LIMIT ?
      )
    `,
    args: [keepLastN],
  });
}
