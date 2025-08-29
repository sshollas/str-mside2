// components/strom/FilterSheet.tsx
"use client";

import { useEffect } from "react";

export type ContractType = "spot" | "variable" | "fixed" | null;

type Area = { code: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;

  areas: Area[];
  areaCode: string;
  onChangeArea: (code: string) => void;

  // Bruk din UsageTier-type om du har den – her støtter vi tall
  usage: number;
  onChangeUsage: (v: number) => void;

  contract: ContractType;
  onChangeContract: (v: ContractType) => void;

  sort: "price" | "name";
  onChangeSort: (v: "price" | "name") => void;

  query: string;
  onChangeQuery: (v: string) => void;

  onReset?: () => void;
  applyLabel?: string; // f.eks. "Vis 23 avtaler"
};

export default function FilterSheet({
  open, onClose,
  areas, areaCode, onChangeArea,
  usage, onChangeUsage,
  contract, onChangeContract,
  sort, onChangeSort,
  query, onChangeQuery,
  onReset, applyLabel = "Bruk filtre",
}: Props) {

  // Lukk med ESC
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Bakgrunn */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

      {/* Panel: mobil = bunnskuff, desktop = liten dialog */}
      <div
        className="
          absolute left-0 right-0 bottom-0
          md:left-1/2 md:top-20 md:bottom-auto md:-translate-x-1/2
          md:w-[520px]
          bg-white rounded-t-xl md:rounded-xl shadow-lg border
          overflow-hidden
        "
        role="dialog"
        aria-modal="true"
        aria-label="Filtre"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">Filtre & sortering</h2>
          <button
            onClick={onClose}
            className="px-2 py-1 text-sm rounded border"
            aria-label="Lukk"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] md:max-h-[65vh] overflow-y-auto px-4 py-4 space-y-5">
          {/* Søk */}
          <section>
            <label className="block text-xs font-medium mb-1">Søk</label>
            <input
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="Søk etter avtale/leverandør"
              className="w-full rounded border px-3 py-2"
            />
          </section>

          {/* Område */}
          <section>
            <label className="block text-xs font-medium mb-1">Prisområde</label>
            <select
              value={areaCode}
              onChange={(e) => onChangeArea(e.target.value)}
              className="w-full rounded border px-3 py-2"
            >
              {areas.map(a => (
                <option key={a.code} value={a.code}>{a.name}</option>
              ))}
            </select>
          </section>

          {/* Forbruk */}
          <section>
            <label className="block text-xs font-medium mb-2">Forbruk (kWh/mnd)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={300}
                max={4000}
                step={100}
                value={usage}
                onChange={(e) => onChangeUsage(Number(e.target.value))}
                className="flex-1"
              />
              <div className="w-20 text-right text-sm">{usage} kWh</div>
            </div>
          </section>

          {/* Kontraktstype */}
          <section>
            <label className="block text-xs font-medium mb-2">Kontraktstype</label>
            <div className="flex flex-wrap gap-2">
              {[
                { v: null, label: "Alle" },
                { v: "spot", label: "Spot" },
                { v: "variable", label: "Variabel" },
                { v: "fixed", label: "Fastpris" },
              ].map(opt => (
                <button
                  key={String(opt.v)}
                  onClick={() => onChangeContract(opt.v as any)}
                  className={[
                    "px-3 py-1.5 rounded border text-sm",
                    contract === opt.v ? "bg-gray-900 text-white border-gray-900" : "bg-white"
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Sortering */}
          <section>
            <label className="block text-xs font-medium mb-2">Sorter etter</label>
            <div className="flex gap-2">
              <button
                onClick={() => onChangeSort("price")}
                className={[
                  "px-3 py-1.5 rounded border text-sm",
                  sort === "price" ? "bg-gray-900 text-white border-gray-900" : "bg-white"
                ].join(" ")}
              >
                Laveste månedspris
              </button>
              <button
                onClick={() => onChangeSort("name")}
                className={[
                  "px-3 py-1.5 rounded border text-sm",
                  sort === "name" ? "bg-gray-900 text-white border-gray-900" : "bg-white"
                ].join(" ")}
              >
                Navn A–Å
              </button>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t">
          <button
            className="px-3 py-2 rounded border text-sm"
            onClick={onReset}
            type="button"
          >
            Tilbakestill
          </button>
          <button
            className="px-4 py-2 rounded bg-gray-900 text-white"
            onClick={onClose}
            type="button"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
