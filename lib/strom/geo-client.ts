"use client";

import type { Area } from "@/lib/strom/utils";

type MunicipalityRow = { id: string; name: string; area: Area };
type PostcodeRow = { zip: string; municipalityId: string; area: Area };

let _municipalities: MunicipalityRow[] | null = null;
let _postcodes: PostcodeRow[] | null = null;
let _loading: Promise<void> | null = null;

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadOnce() {
  if (_loading) return _loading;
  _loading = (async () => {
    const [mRes, pRes] = await Promise.all([
      fetch("/data/municipalities-no.json", { cache: "force-cache" }),
      fetch("/data/postcodes-no.json", { cache: "force-cache" }),
    ]);
    _municipalities = (await mRes.json()) as MunicipalityRow[];
    _postcodes = (await pRes.json()) as PostcodeRow[];
  })();
  return _loading;
}

export async function searchMunicipalities(query: string, limit = 20): Promise<MunicipalityRow[]> {
  await loadOnce();
  if (!_municipalities) return [];
  const q = norm(query);
  if (!q) return _municipalities.slice(0, limit);
  const hits = _municipalities.filter((m) => norm(m.name).includes(q));
  return hits.slice(0, limit);
}

/** Tar enten kommunenavn eller 4-sifret postnummer og foreslår område. */
export async function resolveAreaFromInputClient(input: string): Promise<{
  area?: Area;
  municipality?: string;
  source: "postcode" | "municipality" | "none";
}> {
  await loadOnce();
  const s = (input || "").trim();
  if (!s) return { source: "none" };

  // Postnummer?
  if (/^\d{4}$/.test(s) && _postcodes?.length) {
    const zip = s;
    const hit = _postcodes.find((p) => p.zip === zip);
    if (hit) {
      const muni = _municipalities?.find((m) => m.id === hit.municipalityId);
      return { area: hit.area, municipality: muni?.name || undefined, source: "postcode" };
    }
  }

  // Kommunenavn
  const q = norm(s);
  const muni = _municipalities?.find((m) => norm(m.name) === q) || _municipalities?.find((m) => norm(m.name).includes(q));
  if (muni) return { area: muni.area, municipality: muni.name, source: "municipality" };

  return { source: "none" };
}
