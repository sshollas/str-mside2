"use client";

type Warranty = { ge12: boolean; m6to11: boolean; lt6: boolean };

type Props = {
  municipality: string;
  onMunicipality: (v: string) => void;

  area: string;
  onArea: (v: string) => void;
  suggestedArea?: string;

  yearlyConsumption: number;
  onYearlyConsumption: (v: number) => void;

  unsure: boolean;
  onUnsure: (v: boolean) => void;

  query: string;
  onQuery: (v: string) => void;

  vendor: string;
  onVendor: (v: string) => void;
  vendorOptions: string[];

  contractType: string;
  onContractType: (v: string) => void;

  warrantyFilters: Warranty;
  onWarrantyFilters: (v: Warranty) => void;

  sort: "est" | "addon" | "fee" | "name" | "rec";
  onSort: (v: "est" | "addon" | "fee" | "name" | "rec") => void;

  monthlyConsumption: number;

  onReset?: () => void;
};

export function SidebarFilter(props: Props) {
  const autoLabel = props.suggestedArea ? `Auto (${props.suggestedArea.toUpperCase()})` : "Auto (ukjent)";

  return (
    <form className="filter-side" onSubmit={(e) => e.preventDefault()}>
      <div className="form-group">
        <label className="label">Kommune</label>
        <select
          className="select"
          value={props.municipality}
          onChange={(e) => props.onMunicipality(e.target.value)}
        >
          <option>Oslo</option>
          <option>Bergen</option>
          <option>Trondheim</option>
          <option>Tromsø</option>
          <option>Stavanger</option>
        </select>
      </div>

      <div className="form-group">
        <label className="label">Hva er ditt årlige forbruk?</label>
        <div className="input-with-suffix">
          <input
            className="input"
            type="number"
            min={0}
            step={100}
            value={props.yearlyConsumption}
            onChange={(e) => props.onYearlyConsumption(Number(e.target.value || 0))}
          />
          <span className="suffix">kWt</span>
        </div>
        <div className="hint">(Sjekk strømregningen din)</div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={props.unsure}
            onChange={(e) => {
              props.onUnsure(e.target.checked);
              if (e.target.checked && props.yearlyConsumption === 0) {
                props.onYearlyConsumption(16000);
              }
            }}
          />
          Usikker?
        </label>
        <div className="hint">≈ {props.monthlyConsumption} kWh per måned</div>
      </div>

      <hr className="sep" />

      <div className="form-group">
        <label className="label">Søk</label>
        <div className="input-with-icon">
          <input
            className="input"
            type="search"
            placeholder="Søk etter avtalenavn"
            value={props.query}
            onChange={(e) => props.onQuery(e.target.value)}
            spellCheck={false}
          />
          <span aria-hidden>🔍</span>
        </div>
      </div>

      <div className="form-group">
        <label className="label">Velg selskap</label>
        <select className="select" value={props.vendor} onChange={(e) => props.onVendor(e.target.value)}>
          {props.vendorOptions.map((v) => (
            <option key={v} value={v}>
              {v === "alle" ? "Velg selskap" : v}
            </option>
          ))}
        </select>
      </div>

      <hr className="sep" />

      <fieldset className="form-group">
        <legend className="label">Avtaletype</legend>
        <label className="radio">
          <input type="radio" name="contractType" checked={props.contractType === "spotpris"} onChange={() => props.onContractType("spotpris")} />
          Spotpris
        </label>
        <label className="radio">
          <input type="radio" name="contractType" checked={props.contractType === "fastpris"} onChange={() => props.onContractType("fastpris")} />
          Fastpris
        </label>
        <label className="radio">
          <input type="radio" name="contractType" checked={props.contractType === "variabel"} onChange={() => props.onContractType("variabel")} />
          Plussavtaler/Variabel
        </label>
        <label className="radio">
          <input type="radio" name="contractType" checked={props.contractType === "alle"} onChange={() => props.onContractType("alle")} />
          Andre/alle
        </label>
        <a className="link" href="#avtaleinfo">Les mer om avtaletypene ↗</a>
      </fieldset>

      <hr className="sep" />

      <fieldset className="form-group">
        <legend className="label">Vilkårsgaranti</legend>
        <label className="checkbox">
          <input type="checkbox" checked={props.warrantyFilters.ge12} onChange={(e) => props.onWarrantyFilters({ ...props.warrantyFilters, ge12: e.target.checked })} />
          12 måneder eller mer
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={props.warrantyFilters.m6to11} onChange={(e) => props.onWarrantyFilters({ ...props.warrantyFilters, m6to11: e.target.checked })} />
          Fra 6 til 11 måneder
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={props.warrantyFilters.lt6} onChange={(e) => props.onWarrantyFilters({ ...props.warrantyFilters, lt6: e.target.checked })} />
          Under 6 måneder
        </label>
      </fieldset>

      <hr className="sep" />

      <div className="form-group">
        <label className="label">Område</label>
        <select className="select" value={props.area} onChange={(e) => props.onArea(e.target.value)}>
          <option value="alle">Alle</option>
          {props.suggestedArea ? <option value="auto">{autoLabel}</option> : null}
          <option value="no1">NO1</option>
          <option value="no2">NO2</option>
          <option value="no3">NO3</option>
          <option value="no4">NO4</option>
          <option value="no5">NO5</option>
        </select>
        <div className="hint">Velg “Auto” for å bruke område ut fra kommune.</div>
      </div>

      <div className="form-group">
        <label className="label">Sorter</label>
        <select
          className="select"
          value={props.sort}
          onChange={(e) => props.onSort(e.target.value as Props["sort"])}
        >
          <option value="est">Estimert pr. mnd (objektiv)</option>
          <option value="addon">Påslag</option>
          <option value="fee">Månedsavgift</option>
          <option value="name">Navn</option>
          <option value="rec">Anbefalt (kan være kommersielt påvirket)</option>
        </select>
      </div>

      <div className="form-group">
        <button type="button" className="btn-cta" onClick={props.onReset}>Tilbakestill filtre</button>
      </div>
    </form>
  );
}
