import StromClient from "@/app/strom/StromClient";
import { getOffersCached } from "@/lib/strom/data";
import { type PriceDump } from "@/lib/strom/utils";

export const revalidate = 900;
export const runtime = "nodejs";

function jsonLd(dump: PriceDump) {
  const list = Array.isArray(dump?.offers) ? dump.offers : [];
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: list.map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: o.trackingUrl || o.url,
      item: {
        "@type": "Product",
        name: o.name,
        brand: { "@type": "Organization", name: o.vendor },
        offers: {
          "@type": "Offer",
          priceCurrency: "NOK",
          price: o.spotPrice,
          url: o.trackingUrl || o.url,
          category: o.contractType,
        },
      },
    })),
  };
}

export default async function Page() {
  const data = await getOffersCached(15);

  return (
    <>
      <main id="main" className="container">
        <header className="page-header">
          <h1 className="text-2xl font-semibold">Strømsiden</h1>
          <p className="text-sm opacity-80">
            Her kan du sammenligne alle strømavtaler, sammenlign spotpris, månedsavgift og estimert pris pr. måned - og finne ut hva som passer best for deg.
          </p>
        </header>
        <StromClient initialDump={data} />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(data)) }}
      />
    </>
  );
}
