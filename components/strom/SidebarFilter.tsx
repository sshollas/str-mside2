"use client";

import MunicipalitySelect from "@/components/strom/MunicipalitySelect";
import UsageTierPicker from "@/components/strom/UsageTierPicker";
import InlineSuffixInput from "@/components/ui/InlineSuffixInput";
import type { Area } from "@/lib/strom/utils";

type Warranty = { ge12: boolean; m6to11: boolean; lt6: boolean };
type SortKey = "est" | "addon" | "fee" | "name" | "rec";
type AreaFilter = "alle" | "auto" | Area;

type Props = {
  municipality: string;
  onMunicipality: (v: string) => void;

  area: AreaFilter;
  onArea: (v: AreaFilter) => void;
  suggestedArea?: Area;
  onSuggestedArea?: (a?: Area) => void;

  /** Primærsannhet: månedlig forbruk i kWh */
  monthlyConsumption: number;
  onMonthlyConsumption: (v: number) => void;

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

  sort: SortKey;
  onSort: (v: SortKey) => void;

  onReset?: () => void;
};

export function SidebarFilter(props: Props) {
  const autoLabel = props.suggestedArea ? `Auto (${props.suggestedArea.toUpperCase()})` : "Auto (ukjent)";
  const yearly = Math.max(0, Math.round(props.monthlyConsumption * 12)); // hint

  return (
    <form className="filter-side" onSubmit={(e) => e.preventDefault()}>
      {/* Kommune / postnummer */}
      <MunicipalitySelect
        value={props.municipality}
        onChange={props.onMunicipality}
        onAreaSuggest={(a) => props.onSuggestedArea?.(a)}
      />

      {/* Forbruk (MÅNEDLIG) */}
      <div className="form-group">
        <label className="label">Hva er ditt månedlige forbruk?</label>

        <InlineSuffixInput
          value={props.monthlyConsumption}
          onChangeValue={(v) => props.onMonthlyConsumption(v)}
          suffix="kWh"
          inputClassName="input"
          min={0}
          step={10}
          aria-label="Månedlig forbruk i kWh"
        />

        <div className="hint">≈ {yearly.toLocaleString("nb-NO")} kWh per år</div>

        <UsageTierPicker
          monthly={props.monthlyConsumption}
          onPick={(monthly) => {
            props.onMonthlyConsumption(monthly);
            if (props.unsure && monthly > 0) props.onUnsure(false);
          }}
        />

        <label className="checkbox">
          <input
            type="checkbox"
            checked={props.unsure}
            onChange={(e) => {
              props.onUnsure(e.target.checked);
              if (e.target.checked && props.monthlyConsumption === 0) {
                props.onMonthlyConsumption(1333); // rimelig default
              }
            }}
          />
          Usikker?
        </label>
      </div>

      <hr className="sep" />

      {/* Søk */}
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

      {/* Selskap */}
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

      {/* Avtaletype */}
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

      {/* Vilkår */}
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

      {/* Område */}
      <div className="form-group">
        <label className="label">Område</label>
        <select className="select" value={props.area} onChange={(e) => props.onArea(e.target.value as AreaFilter)}>
          <option value="alle">Alle</option>
          {props.suggestedArea ? <option value="auto">{autoLabel}</option> : <option value="auto">Auto (ukjent)</option>}
          <option value="no1">NO1</option>
          <option value="no2">NO2</option>
          <option value="no3">NO3</option>
          <option value="no4">NO4</option>
          <option value="no5">NO5</option>
        </select>
        <div className="hint">Velg “Auto” for å bruke område ut fra kommune/postnummer.</div>
      </div>

      {/* Sortering */}
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
