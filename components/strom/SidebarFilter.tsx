"use client";

import UsageTierPicker from "@/components/strom/UsageTierPicker";

type Warranty = { ge12: boolean; m6to11: boolean; lt6: boolean };

type Props = {
  municipality: string;
  onMunicipality: (v: string) => void;

  monthlyConsumption: number;
  onMonthlyConsumption: (v: number) => void;

  query: string;
  onQuery: (v: string) => void;

  vendor: string;
  onVendor: (v: string) => void;
  vendorOptions: string[];

  contractType: string;
  onContractType: (v: string) => void;

  warrantyFilters: Warranty;
  onWarrantyFilters: (v: Warranty) => void;

  onReset: () => void;
};

export function SidebarFilter({
  municipality,
  onMunicipality,
  monthlyConsumption,
  onMonthlyConsumption,
  query,
  onQuery,
  vendor,
  onVendor,
  vendorOptions,
  contractType,
  onContractType,
  warrantyFilters,
  onWarrantyFilters,
  onReset,
}: Props) {
  const yearly = Math.max(0, Math.round(monthlyConsumption * 12));

  return (
    <div className="filter-side" role="form" aria-label="Filter">
      {/* Kommune/Postnummer – styrer prisområde bak fasaden, ikke filter */}
      <div className="form-group">
        <label className="label" htmlFor="fld-municipality">Kommune eller postnummer</label>
        <input
          id="fld-municipality"
          className="input"
          value={municipality}
          placeholder="F.eks. 0150 eller Oslo"
          onChange={(e) => onMunicipality(e.target.value)}
          inputMode="text"
          autoComplete="postal-code"
        />
        <div className="hint">Brukes til å velge riktig prisområde (spotpris).</div>
      </div>

      {/* Månedlig forbruk */}
      <div className="form-group">
        <label className="label" htmlFor="fld-monthly">Hva er ditt månedlige forbruk?</label>

        {/* Suffix inni input-boksen */}
        <div className="input-suffix-inside">
          <input
            id="fld-monthly"
            className="input"
            type="number"
            min={0}
            step={1}
            value={Number.isFinite(monthlyConsumption) ? monthlyConsumption : 0}
            onChange={(e) => onMonthlyConsumption(Math.max(0, Number(e.target.value)))}
            placeholder="1500"
            inputMode="numeric"
            aria-describedby="monthly-hint"
          />
          <span className="suffix" aria-hidden>kWh/mnd</span>
        </div>

        <div id="monthly-hint" className="hint">≈ {yearly.toLocaleString("nb-NO")} kWh per år</div>
      </div>

      {/* Hurtigvalg – lite/middels/stort */}
      <div className="form-group">
        <UsageTierPicker
          yearly={yearly}
          onPick={(newYearly) => onMonthlyConsumption(Math.round(newYearly / 12))}
        />
      </div>

      <hr className="sep" />

      {/* Søk */}
      <div className="form-group">
        <label className="label" htmlFor="fld-q">Søk</label>
        <div className="input-with-icon">
          <input
            id="fld-q"
            className="input"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Søk etter avtalenavn"
          />
          <span aria-hidden>🔎</span>
        </div>
      </div>

      {/* Velg selskap */}
      <div className="form-group">
        <label className="label" htmlFor="fld-vendor">Velg selskap</label>
        <select
          id="fld-vendor"
          className="select"
          value={vendor}
          onChange={(e) => onVendor(e.target.value)}
        >
          {vendorOptions.map((v) => (
            <option key={v} value={v}>{v === "alle" ? "Alle" : v}</option>
          ))}
        </select>
      </div>

      {/* Avtaletype */}
      <div className="form-group" role="group" aria-label="Avtaletype">
        <div className="label">Avtaletype</div>
        {["spotpris", "fastpris", "plussavtaler", "andre"].map((t) => {
          const id = `ct-${t}`;
          return (
            <label key={t} className="radio" htmlFor={id}>
              <input
                id={id}
                type="radio"
                name="contractType"
                checked={contractType === t}
                onChange={() => onContractType(t)}
              />
              <span style={{ textTransform: "capitalize" }}>{t}</span>
            </label>
          );
        })}
        <label className="radio" htmlFor="ct-alle">
          <input
            id="ct-alle"
            type="radio"
            name="contractType"
            checked={contractType === "alle"}
            onChange={() => onContractType("alle")}
          />
          <span>Alle</span>
        </label>
      </div>

      {/* Vilkårsgaranti */}
      <div className="form-group" role="group" aria-label="Vilkårsgaranti">
        <div className="label">Vilkårsgaranti</div>
        <label className="checkbox" htmlFor="w12">
          <input
            id="w12"
            type="checkbox"
            checked={warrantyFilters.ge12}
            onChange={(e) => onWarrantyFilters({ ...warrantyFilters, ge12: e.target.checked })}
          />
          <span>12 måneder eller mer</span>
        </label>
        <label className="checkbox" htmlFor="w611">
          <input
            id="w611"
            type="checkbox"
            checked={warrantyFilters.m6to11}
            onChange={(e) => onWarrantyFilters({ ...warrantyFilters, m6to11: e.target.checked })}
          />
          <span>Fra 6 til 11 måneder</span>
        </label>
        <label className="checkbox" htmlFor="wlt6">
          <input
            id="wlt6"
            type="checkbox"
            checked={warrantyFilters.lt6}
            onChange={(e) => onWarrantyFilters({ ...warrantyFilters, lt6: e.target.checked })}
          />
          <span>Under 6 måneder</span>
        </label>
      </div>

      <hr className="sep" />

      <button type="button" className="btn-cta" onClick={onReset}>Tilbakestill filtre</button>
    </div>
  );
}
