type ClickArgs = {
  programId?: string;
  deepLink: string | undefined;
  source?: string;
  extra?: Record<string, string | number | boolean | null | undefined>;
};

export function adtractionClickUrl({ programId, deepLink, source, extra }: ClickArgs): string {
  const base = process.env.NEXT_PUBLIC_ADTRACTION_BASE;
  const target = (deepLink || "").trim();
  if (!base || !programId || !target) return target; // kan bli "" (tom streng)

  const template = base.includes("{PROGRAM}") ? base.replace("{PROGRAM}", String(programId)) : base;

  let url: URL;
  try {
    url = new URL(template);
  } catch {
    return target; // ikke kast – bare bruk dyp lenke
  }

  const hasUrlParam = url.search.includes("url=") || url.searchParams.has("url");
  const param = hasUrlParam ? "url" : "destination";
  url.searchParams.set(param, target);

  if (source) url.searchParams.set("source", source);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v == null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}
