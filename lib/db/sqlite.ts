import "server-only";
import { createClient, Client } from "@libsql/client";
import { Offer, PriceDump, slugify } from "@/lib/strom/utils";

let client: Client | null = null;
let initialized = false;

function getRawUrl(): string {
  return process.env.LIBSQL_URL || process.env.TURSO_DATABASE_URL || "";
}
function getAuth(): string | undefined {
  return process.env.LIBSQL_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;
}

/**
 * Godtar noen vanlige varianter og normaliserer til libsql://...,
 * slik at "https://<db>.turso.io" eller "<db>.turso.io" også virker.
 */
function normalizeLibsqlUrl(input: string): string {
  let u = (input || "").trim();
  if (!u) return u;
  if (u.startsWith("libsql://") || u.startsWith("file:")) return u;
  if (u.startsWith("https://")) return "libsql://" + u.slice("https://".length);
  if (!u.includes("://") && u.includes(".turso.io")) return "libsql://" + u;
  return u;
}

function getClient(): Client {
  if (!client) {
    const raw = getRawUrl();
    if (!raw) {
      throw new Error(
        "LIBSQL_URL/TURSO_DATABASE_URL mangler. Sett f.eks. LIBSQL_URL=libsql://<din-db>.turso.io og LIBSQL_AUTH_TOKEN=<token> i .env.local"
      );
    }
    const url = normalizeLibsqlUrl(raw);
    try {
      // createClient kan kaste hvis URL er ugyldig
      client = createClient({ url, authToken: getAuth() });
    } catch (e) {
      throw new Error(
        `Ugyldig LIBSQL_URL/TURSO_DATABASE_URL: "${raw}". Prøv "${url}" (må starte med libsql://). Godkjente skjema: libsql:// eller file:. Opprinnelig feil: ${(e as Error).message}`
      );
    }
  }
  return client!;
}

async function ensureSchema() {
  if (initialized) return;
  const db = getClient();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      vendor_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      trackingUrl TEXT,
      programId TEXT,
      area TEXT,
      municipality TEXT,
      contractType TEXT NOT NULL,
      spotPrice REAL NOT NULL,
      monthlyFee REAL NOT NULL,
      warrantyMonths INTEGER,
      sparkline TEXT,
      FOREIGN KEY(vendor_id) REFERENCES vendors(id)
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id TEXT NOT NULL,
      spotPrice REAL NOT NULL,
      monthlyFee REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      FOREIGN KEY(offer_id) REFERENCES offers(id)
    );
  `);
  await db.execute(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);`);
  initialized = true;
}

export async function upsertOffersAndSnapshot(dump: PriceDump) {
  try {
    const db = getClient();
    await ensureSchema();

    await db.execute("BEGIN");
    try {
      for (const o of dump.offers) {
        const vend = await db.execute({
          sql: `
            INSERT INTO vendors (name, slug) VALUES (?, ?)
            ON CONFLICT(name) DO UPDATE SET slug=excluded.slug
            RETURNING id
          `,
          args: [o.vendor, slugify(o.vendor)],
        });
        const vendorId = Number(vend.rows[0].id);

        await db.execute({
          sql: `
            INSERT INTO offers (id, vendor_id, name, url, trackingUrl, programId, area, municipality, contractType, spotPrice, monthlyFee, warrantyMonths, sparkline)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              vendor_id=excluded.vendor_id,
              name=excluded.name,
              url=excluded.url,
              trackingUrl=excluded.trackingUrl,
              programId=excluded.programId,
              area=excluded.area,
              municipality=excluded.municipality,
              contractType=excluded.contractType,
              spotPrice=excluded.spotPrice,
              monthlyFee=excluded.monthlyFee,
              warrantyMonths=excluded.warrantyMonths,
              sparkline=excluded.sparkline
          `,
          args: [
            o.id,
            vendorId,
            o.name,
            o.url,
            o.trackingUrl ?? null,
            o.programId ?? null,
            o.area ?? null,
            o.municipality ?? null,
            o.contractType,
            o.spotPrice,
            o.monthlyFee,
            o.warrantyMonths ?? null,
            o.sparkline ? JSON.stringify(o.sparkline) : null,
          ],
        });

        await db.execute({
          sql: `INSERT INTO price_snapshots (offer_id, spotPrice, monthlyFee) VALUES (?, ?, ?)`,
          args: [o.id, o.spotPrice, o.monthlyFee],
        });
      }
      await db.execute({
        sql: `INSERT INTO meta (k, v) VALUES ('last_updated', ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v`,
        args: [dump.updatedAt],
      });

      await db.execute("COMMIT");
    } catch (e) {
      await db.execute("ROLLBACK");
      throw e;
    }
  } catch (e) {
    // Ikke kræsj appen: logg og la kalleren falle tilbake til API/mock
    console.error("[libsql] upsertOffersAndSnapshot feilet:", (e as Error).message);
  }
}

export async function getLatestPriceDump(): Promise<PriceDump | null> {
  try {
    const db = getClient();
    await ensureSchema();

    const last = await db.execute(`SELECT v FROM meta WHERE k='last_updated'`);
    if (last.rows.length === 0) return null;

    const rows = await db.execute(`
      SELECT o.*, v.name AS vendor_name
      FROM offers o
      JOIN vendors v ON v.id = o.vendor_id
    `);

    if (rows.rows.length === 0) return null;

    const offers: Offer[] = rows.rows.map((r: any) => ({
      id: String(r.id),
      vendor: String(r.vendor_name),
      name: String(r.name),
      url: String(r.url),
      trackingUrl: r.trackingUrl ?? undefined,
      programId: r.programId ?? undefined,
      area: r.area ?? undefined,
      municipality: r.municipality ?? undefined,
      contractType: String(r.contractType),
      spotPrice: Number(r.spotPrice),
      monthlyFee: Number(r.monthlyFee),
      warrantyMonths: r.warrantyMonths != null ? Number(r.warrantyMonths) : undefined,
      sparkline: r.sparkline ? JSON.parse(String(r.sparkline)) : undefined,
    }));

    return { updatedAt: String(last.rows[0].v), offers, source: "db" };
  } catch (e) {
    console.warn("[libsql] getLatestPriceDump: DB utilgjengelig:", (e as Error).message);
    return null;
  }
}

export async function getVendors(): Promise<{ name: string; slug: string }[]> {
  try {
    const db = getClient();
    await ensureSchema();
    const res = await db.execute(`SELECT name, slug FROM vendors ORDER BY name COLLATE NOCASE`);
    return res.rows.map((r: any) => ({ name: String(r.name), slug: String(r.slug) }));
  } catch (e) {
    console.warn("[libsql] getVendors: DB utilgjengelig:", (e as Error).message);
    return [];
  }
}

export async function getOffersByVendorSlug(slug: string): Promise<Offer[]> {
  try {
    const db = getClient();
    await ensureSchema();
    const res = await db.execute(
      `
      SELECT o.*, v.name AS vendor_name
      FROM offers o
      JOIN vendors v ON v.id = o.vendor_id
      WHERE v.slug=?
      ORDER BY o.name COLLATE NOCASE
    `,
      [slug]
    );
    return res.rows.map((r: any) => ({
      id: String(r.id),
      vendor: String(r.vendor_name),
      name: String(r.name),
      url: String(r.url),
      trackingUrl: r.trackingUrl ?? undefined,
      programId: r.programId ?? undefined,
      area: r.area ?? undefined,
      municipality: r.municipality ?? undefined,
      contractType: String(r.contractType),
      spotPrice: Number(r.spotPrice),
      monthlyFee: Number(r.monthlyFee),
      warrantyMonths: r.warrantyMonths != null ? Number(r.warrantyMonths) : undefined,
      sparkline: r.sparkline ? JSON.parse(String(r.sparkline)) : undefined,
    }));
  } catch (e) {
    console.warn("[libsql] getOffersByVendorSlug: DB utilgjengelig:", (e as Error).message);
    return [];
  }
}
