1) Oversikt

Formål
Nettsiden sammenligner strømavtaler i Norge med vekt på god brukeropplevelse, korrekt beregning og affiliate-konvertering – uten å skjule kontekst (påslag, avgifter, estimater).

Kjernevisning
Tabell-lignende rader (grid) med kolonner:
Navn | Påslag (kr/kWh) | Månedsavgift | Estimert pr. mnd | CTA (affiliate)

Teknologi

Next.js 14 (App Router), TypeScript, Tailwind, CSS-variabler for tema (light/dark)

Alias: @/*

SSR/ISR, progressiv enh. for interaktivitet på klient

Viktige prinsipper

Område (NO1–NO5) brukes kun i beregning (spotpris), aldri til å filtrere bort avtaler.

CTA lenker alltid via affiliate-lenkegenerering når tilgjengelig; mangler bestillingslenke ⇒ kort skjules/flyttes ned.

Estimater synliggjør forbrukerens antagelser (kWh/mnd) og forutsetninger (påslag, månedsavgift, spot for område).

SEO: metadata + strukturert data (JSON-LD) for Organization, WebSite, ItemList og Product/Offer.

Robusthet: Ved API-svikt brukes fallback (data/stromapi-mockup.json). Valgfri DB må ikke knekke build.

2) Mappestruktur (relevant)
app/
  layout.tsx                 # global SEO/meta + JSON-LD for nettsted
  page.tsx                   # forside (liste)
  strom/StromClient.tsx      # klientlogikk: filtrering, sortering, beregning
  vendor/[slug]/page.tsx     # leverandørsider (liste per leverandør)
  vendor/page.tsx            # leverandøroversikt
  sitemap.ts                 # dynamisk sitemap

components/strom/
  DealCard.tsx               # rad/“kort” i 5-kol grid + detaljpanel
  SidebarFilter.tsx          # sticky filter/innstillinger i venstre kolonne
  UsageTierPicker.tsx        # hurtigvalg forbruk (lite/middels/stort)
  FloatingFilter.tsx         # (historisk) flytende panel / FAB (ikke i bruk nå)
  Sparkline.tsx              # (valgfritt) trend minigraf

lib/strom/
  utils.ts                   # typer, formattere, estimering, område-hjelpere
  affiliate/links.ts         # affiliate klikklinker (Adtraction)
  geo.ts                     # (valgfritt) oppslag postnr → NO1–NO5 / nettselskap

lib/vendorapi/
  client.ts                  # henter rådata fra leverandør-API + fallback, mapping

lib/db/sqlite.ts             # valgfritt: LibSQL/Turso-klient; returnerer null uten env

lib/seo/schema.ts            # bygg JSON-LD for Organization/WebSite/ItemList/Product

styles/globals.css           # tema, layout, .deal-grid, .deal-bottom, osv.

data/
  stromapi-mockup.json       # fallback-dump
  postcode-area.json         # (valgfritt) postnr → NO1..NO5 (generert av dataløp)
  spot/latest.json           # (valgfritt) dagens spot per område

3) Dataflyt (end-to-end)
[Leverandør-API] --(fetchOffersFromApi)--> [rå tilbud]
                   \__ feil/timeout ____/         |
                                                   V
                                  [map til Offer/PriceDump]   <- (sanitizing, null-sikring)
                                                   |
                                                   +-> [fallback: data/stromapi-mockup.json] (hvis API feiler)
                                                   |
                                     initialDump: { offers[], ... }

Brukerinput: kommune/postnr ──> område (NO1–NO5) ──> spotpris (fra offer eller fra spot/latest.json)
Brukerinput: kWh/mnd ────────> estimateMonthlyCost(offer, monthly, areaSpot)
Filtre/søk/sortering ────────> presenteres i StromClient
Render: DealCard (rad) med CTA (affiliate link) + detaljpanel


Estimert pris pr. mnd

Basert på: spotpris (område) + addonNokPerKwh + monthlyFee + forbruk (kWh/mnd).

Spotpris kildes: (1) fra selve tilbudet hvis oppgitt, ellers (2) fra spot/latest.json[NOx] eller annen area-kilde.

Binding/garanti/utløp påvirker presentasjon, ikke matematikken.

4) Domene-modeller (typer – essens)

Nøyaktige felter kan avvike – dette beskriver kontrakten slik den brukes i UI og beregning.

// lib/strom/utils.ts (essens)
export type Offer = {
  id: number | string;
  name: string;
  vendor: string;                // eller organizationName
  contractType: "spotpris" | "fastpris" | "plussavtaler" | "andre";
  addonNokPerKwh?: number;       // påslag per kWh i NOK
  monthlyFee?: number;           // kr/mnd
  spotPrice?: number;            // kr/kWh (hvis spesifikt i tilbudet)
  area?: "NO1" | "NO2" | "NO3" | "NO4" | "NO5"; // valgfritt
  url?: string;                  // bestillingslenke
  trackingUrl?: string;          // affiliate-lenke (generert)
  programId?: string;            // affiliate-program: til boost i “Anbefalt”
  publishedAt?: string;          // ISO
  updatedAt?: string;            // ISO
  expiredAt?: string | null;     // ISO i fortid => skjul
  bindingMonths?: number | null; // bindingstid (for label)
  warrantyMonths?: number | null;// vilkårsgaranti (for filtrering/label)
  // (UI) kalkulert senere:
  estimatedMonthly?: number;
  promoted?: boolean;
};

export type PriceDump = {
  offers: Offer[];
  spotByArea?: Partial<Record<"NO1"|"NO2"|"NO3"|"NO4"|"NO5", number>>;
};


Estimering:

export function estimateMonthlyCost(offer: Offer, monthlyKwh: number, areaSpot?: number): number;


velger effektiv spot: offer.spotPrice ?? areaSpot ?? 0

pris/kWh = spot + addon

total = pris/kWh × kWh/mnd + monthlyFee

runder til 2 desimaler for visning

5) Affiliate (Adtraction)

Mål: Maksimer konvertering uten å forvirre brukeren.
Regelsett:

CTA bruker alltid affiliate-URL hvis vi har program/parametre; ellers orderUrl.

Kort uten bestillingslenke (verken affiliate eller direkte) skjules eller havner lavt.

“Anbefalt” sortering gir moderat boost til kort med programId – men estimerte priser dominerer fortsatt.

“Promoted”-badge kan vises når boost er aktiv (transparent markering).

API:

// lib/strom/affiliate/links.ts
export function adtractionClickUrl(input: {
  programId: string;
  destination: string;                  // orderUrl hos leverandør
  subId?: string;                       // f.eks. offer.id eller kampanje
}): string;

// Hjelper for trygg CTA-resolver:
export function resolveCtaUrl(offer: Offer): string | undefined;
// - bruker adtraction hvis programId && orderUrl
// - ellers offer.url
// - returnerer undefined hvis ingenting => kort skal skjules

6) UI-laget (komponenter)
6.1 components/strom/DealCard.tsx

Props: { offer: Offer; variant: "row" }

Grid: grid-template-columns: minmax(220px, 2fr) 1fr 1fr 1fr auto;

Radinnhold (hovedlinje):

Kol 1: tittelblokk (2 linjer): avtalenavn (fet) + leverandør.

Kol 2: “Påslag” label + verdi (addonNokPerKwh i kr/kWh).

Kol 3: “Månedsavgift” label + verdi (monthlyFee).

Kol 4: “Estimert pr. mnd” label + verdi (estimatedMonthly).

Kol 5: CTA-knapp (resolveCtaUrl(offer)); disabled/hidden hvis undefined.

Bunnlinje (.deal-bottom):

Venstre: labels/badges (type, binding, garanti, promoted, no-fee osv.)

Høyre: toggle-knapp (pluss/minus) for detaljpanel.

Detaljpanel (expand):

Viser mer: “vilkår sist endret”, binding, påslag/månedsavgift oppsummert, lenker (vilkår/priser/FAQ).

Semantisk: grid-rad som spenner grid-column: 1 / -1.

Interaksjon:

Klikk på kortet (ikke CTA) toggler “åpen”.

Fokus/fane-rekkefølge: CTA og toggle er fokusbare; rad klikker ikke CTA ved uhell.

6.2 components/strom/SidebarFilter.tsx

Sticky, scrollable (overflow auto, max-height: calc(100vh - 32px)).

Felt:

Kommune/Postnummer – brukes for å foreslå område (NO1–NO5) → påvirker beregning, ikke filter.

Månedlig forbruk – input med suffix inne i feltet (“kWh/mnd”) + ≈ årlig visning under.

Hurtigvalg – UsageTierPicker med lynikoner (Radix) og tre nivåer: 500 / 1333 / 2400 kWh/mnd.

Søk – fri tekst, matcher avtalenavn og leverandør.

Leverandør – dropdown.

Avtaletype – radio.

Vilkårsgaranti – avkryssing (valgfritt brukt i filtrering senere).

Tilbakestill – resetter filtre.

6.3 components/strom/UsageTierPicker.tsx

Viser tre knapper med lynikon + tekst (“Lite/Middels/Stort”) og tall (kWh/mnd).

Marker “nærmeste nivå” ift. gjeldende årlig forbruk.

7) Sidekontroller (StromClient)

Fil: app/strom/StromClient.tsx (client component)

State:

municipality (tekst: kommunenavn eller postnummer) → mappes til suggestedArea via helper.

monthlyConsumption (kWh/mnd).

contractType, vendor, query.

sort: "est" | "addon" | "fee" | "name" | "rec".

warrantyFilters: { ge12, m6to11, lt6 } (valgfritt brukt).

Derivert:

vendorOptions – unike leverandører fra initialDump.

offers – pipeline:

Skjul kort uten CTA (mangler orderUrl/tracking)

Skjul expiredAt < now

Filtrer etter contractType, vendor, query

Beregning: hent areaSpot (fra dump/spotByArea eller runtime-kilde) og sett estimatedMonthly

Sorter:

est: lavest estimat

addon: lavest påslag

fee: lavest månedsavgift

name: A–Å

rec: primært estimat + moderat affiliate-boost (programId)

Render:

Toolbar for sortering.

Header-rad (kolonneoverskrifter på desktop).

Liste med DealCard (variant "row").

8) Datakilder
8.1 Leverandør-API (Adtraction blueprint)

lib/vendorapi/client.ts:

fetchOffersFromApi() – henter råtilbud.

mapToPriceDump(raw) – normaliserer til Offer[] og legger inn:

addonNokPerKwh (fra currentPrice.addonPrice i øre → NOK)

monthlyFee (fra fee.monthlyFee → NOK)

url (helst orderUrl)

expiredAt, bindingMonths, warrantyMonths (hvis tilgjengelig)

Fallback: readFile(data/stromapi-mockup.json) hvis API feiler.

8.2 Område/spot (valgfri data-pipeline)

data/postcode-area.json – postnr → NO1..NO5 (kjøres lokalt med scripts; ikke runtime-GIS).

data/spot/latest.json – day-ahead per område; bruk avgNokPerKwh som baseline om tilbudet ikke har spotfelt.

lib/strom/geo.ts – areaFromPostcode(postcode) for oppslag.

9) SEO
9.1 Globalt (app/layout.tsx)

metadata (title/desc + OpenGraph/Twitter + canonical)

JSON-LD: Organization (nettsted), WebSite + SearchAction

9.2 Forside (app/page.tsx)

JSON-LD:

ItemList som peker til (trackingUrl || url) for topp ~100 tilbud

Valgfritt: Product + Offer for 3–5 toppkort (med UnitPriceSpecification for påslag, PriceSpecification for månedsavgift, Offer.price = estimert pr. mnd, priceValidUntil = månedsslutt)

9.3 Leverandørsider (app/vendor/[slug]/page.tsx)

JSON-LD: Organization (leverandør), BreadcrumbList, Product/Offer for toppkort

generateStaticParams + revalidate gir ISR og god crawling

sitemap.ts inkluderer vendor-ruter

Viktige regler

Verdier i JSON-LD må matche visning.

Bruk NOK og punktum som desimal.

Absolutte URLer for url, logo, bilder.

Ikke bruk AggregateRating uten ekte, synlige omtaler.

10) CSS/tema & layoutkontrakt

globale variabler: --bg, --surface, --text, --muted, --border, --accent, --ok, --danger

Støtte for prefers-color-scheme + html[data-theme="light|dark"] override.

DealCard (rad):

.deal-box – ramme, radius 16, padding 15

.deal-grid – 5 kolonner (minmax(220px, 2fr) 1fr 1fr 1fr auto)

.deal-name – tittel + leverandør (kol 1)

.deal-cta – CTA (kol 5)

.deal-col – kol 2–4 med label + verdi

.deal-bottom – alltid nederst; venstre labels, høyre toggle

Detaljpanel .deal-details – spenner 1 / -1, med diskret skillelinje

Input-suffix inne i felt

.input-suffix-inside wrapper (position: relative)

.suffix absolutt høyre; .input { padding-right: 84px }

Sidebar

Sticky, max-height: calc(100vh - 32px), overflow: auto

Hurtigvalg-knapper markerer aktivt nivå, viser tall (kWh/mnd)

11) Feilhåndtering & robusthet

API ned/feil:

fetchOffersFromApi kaster → mapToPriceDump erstattes av stromapi-mockup.json.

Manglende CTA:

resolveCtaUrl(offer) returnerer undefined → skjul kort (eller disable CTA og plasser langt ned)

expiredAt i fortid: skjul kort

DB/LibSQL ikke konfigurert:

lib/db/sqlite.ts skal returnere null klient; kallere må “no-op’e” eller bruke fallback

Type-robusthet:

alle optional felter null-sikres i mapping og visning

12) Konfigurasjon (env)

NEXT_PUBLIC_SITE_URL – absolutt base for SEO (canonical/og)

(valgfritt) LIBSQL_URL / TURSO_DATABASE_URL, LIBSQL_AUTH_TOKEN – hvis du bruker Turso/libsql

(valgfritt) ADTRACTION_* – programID e.l. hvis lenkegenerering trenger det

(valgfritt) NODE_ENV, VERCEL (automasjon/vercel)

13) Bygg & deploy

Lokalt:

npm i
npm run typecheck
npm run dev
npm run build && npm run start


Vercel:

Next 14, Node 20

DB/env er optional; uten env skal build fortsatt lykkes (fallback-data)

14) Test & verifisering

Enheter (manuelt):

CTA-sikkerhet: inspiser href i DevTools – aldri undefined.

Grid: slå på CSS Grid overlay i DevTools → se 5 kolonner, riktig spenning .deal-bottom.

Tilgjengelighet: Tab gjennom rad → CTA, toggle, lenker har fokusmarkør. aria-labels finnes på kolonneverdier.

Sortering: bytt sort-valg, se at rekkefølge endres som forventet.

Område-påvirkning: sett postnr til annet prisområde; estimater endres (hvis areaSpot tilgjengelig).

SEO: “View source” → application/ld+json finnes; kjør siden i “Rich Results Test”.

Automatisert (forslag):

Unit-tester for estimateMonthlyCost, resolveCtaUrl, mapping fra API → Offer.

E2E-test (Playwright) for å sikre at kort uten CTA ikke vises i toppen.

15) Kjent atferd & forbedringsforslag

Vendor-sider eksisterer og gir god SEO. Legg inn internt CMS/MDX for “Om leverandøren” + trygge eksterne kildelenker.

Promoted-badge ved “Anbefalt” boost; justér styrken forsiktig (A/B senere).

Sticky mobil-CTA på åpne rad-detaljer kan øke konvertering (må ikke skjule info).

Historikk/DB: Valgfritt Turso for å lagre daglige dumps/konverteringstall; ikke nødvendig for første-release.

Spot/område-data: Eget datascript (kjøres sjelden/daglig) genererer postcode-area.json og spot/latest.json. Runtime gjør kun lette oppslag.

16) Hurtigreferanse – viktige funksjoner
// lib/vendorapi/client.ts
export async function fetchOffersFromApi(): Promise<unknown>;
export function mapToPriceDump(raw: unknown): PriceDump;

// lib/strom/utils.ts
export function estimateMonthlyCost(offer: Offer, monthlyKwh: number, areaSpot?: number): number;
export function formatCurrency(n: number): string;  // f.eks. "1 234 kr"
export function formatPricePerKwh(n: number): string; // "1,23 kr/kWh"
export function areaFromMunicipality(s: string): "NO1"|"NO2"|"NO3"|"NO4"|"NO5"|undefined; // heuristikk/lookup

// lib/strom/affiliate/links.ts
export function adtractionClickUrl({ programId, destination, subId }: { programId: string; destination: string; subId?: string }): string;
export function resolveCtaUrl(offer: Offer): string | undefined;

// components/strom/DealCard.tsx
type DealCardProps = { offer: Offer; variant: "row" };
export function DealCard(props: DealCardProps): JSX.Element;

// app/strom/StromClient.tsx
// (klientstate for filtre, sort, beregning og render av DealCard-listen)

17) FAQ

Hvorfor forsvinner noen kort?
De mangler gyldig CTA (orderUrl/affiliate). Vi skjuler dem for å unngå døde lenker on-top.

Bruker vi område som filter?
Nei. Område (NO1–NO5) påvirker bare spotpris i beregning.

Er DB nødvendig?
Nei. DB er valgfri for historikk og må ikke knekke build.

Kan vi plassere “Anbefalt”?
Ja, men prisdominans beholdes. Boost er moderat, badge “Promotert” mulig for transparens.
