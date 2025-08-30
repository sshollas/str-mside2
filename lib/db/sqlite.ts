import "server-only";
import { createClient, type Client } from "@libsql/client";
import { slugify, type Offer, type PriceDump } from "@/lib/strom/utils";

// --- klient singleton / konfig ------------------------------------------------

let client: Client | null = null;
let schemaEnsured = false;
let warnedOnce = false;

function warnOnce(msg: string) {
  if (!warnedOnce) {
    // eslint-disable-next-line no-console
    console.warn(`[db] ${msg}`);
    warnedOnce = true;
  }
}

function getUrl(): string | null {
  const raw =
    process.env.LIBSQL_URL ||
    process.env.TURSO_DATABASE_URL ||
    null;
  return raw ? raw.trim() : null;
}

function getAuth(): string | undefined {
  const raw =
    process.env.LIBSQL_AUTH_TOKEN ||
    process.env.TURSO_AUTH_TOKEN ||
    undefined;
  return raw?.trim() || undefined;
}

function isValidLibsqlUrl(raw?: string | null): raw is string {
  if (!raw) return false;
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    // må være libsql: og ha host (eks: libsql://xxxxx.turso.io)
    return u.protocol === "libsql:" && !!u.hostname;
  } catch {
    return false;
  }
}

function getClient(): Client | null {
  if (client) return client;

  const url = getUrl();
  if (!isValidLibsqlUrl(url)) {
    if (url) {
      warnOnce(`Ignorerer ugyldig LIBSQL_URL="${url}" – DB-laget deaktiveres, faller tilbake til API/mock.`);
    } else {
      warnOnce("LIBSQL_URL ikke satt – DB-laget er valgfritt og er deaktivert.");
    }
    return null;
  }

  try {
    client = createClient({ url, authToken: getAuth() });
    return client;
  } catch (e) {
    warnOnce(`Kunne ikke initialisere libSQL-klient: ${(e as Error).message}. DB-laget deaktiveres.`);
    client = null;
    return null;
  }
}

// --- skjema -------------------------------------------------------------------

async function ensureSchema(): Promise<void> {
  if (schemaEnsured) return;
  const db = getClient();
  if (!db) return;

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

  await db.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS vendors (
        vendor_slug  TEXT PRIMARY KEY,
        name         TEXT NOT NULL
      );
    `,
    args: [],
  });

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

/** Returner ferskeste PriceDump fra DB, eller null hvis ikke finnes/ingen DB. */
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
    const parsed = JSON.parse(String((row as any).dump_json)) as PriceDump;
    if (!parsed.updatedAt) parsed.updatedAt = String((row as any).updated_at);
    parsed.source = "db";
    return parsed;
  } catch {
    return null;
  }
}

/** Lagre dagens offers (upsert) og ta et snapshot. Tåler manglende DB (no-op). */
export async function upsertOffersAndSnapshot(dump: PriceDump): Promise<void> {
  const db = getClient();
  if (!db) return; // valgfri DB
  await ensureSchema();

  await db.execute({
    sql: `INSERT INTO price_snapshots (updated_at, dump_json) VALUES (?, ?)`,
    args: [dump.updatedAt, JSON.stringify(dump)],
  });

  for (const o of dump.offers) {
    const vslug = slugify(o.vendor);

    await db.execute({
      sql: `
        INSERT INTO vendors (vendor_slug, name)
        VALUES (?, ?)
        ON CONFLICT(vendor_slug) DO UPDATE SET
          name = excluded.name
      `,
      args: [vslug, o.vendor],
    });

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

/** Liste over leverandører (slug + navn). */
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

/** Hent alle offers for en gitt vendor-slug. */
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

/** Valgfritt: rydde gammel historikk. */
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
