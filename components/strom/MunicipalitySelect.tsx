"use client";

import { useEffect, useMemo, useState } from "react";
import type { Area } from "@/lib/strom/utils";
import { resolveAreaFromInputClient, searchMunicipalities } from "@/lib/strom/geo-client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onAreaSuggest?: (a?: Area) => void;
};

export default function MunicipalitySelect({ value, onChange, onAreaSuggest }: Props) {
  const [suggest, setSuggest] = useState<{ label: string }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const v = value.trim();
      if (!v) {
        setSuggest([]);
        onAreaSuggest?.(undefined);
        return;
      }
      // trigger forslag
      if (/\d/.test(v)) {
        const res = await resolveAreaFromInputClient(v);
        if (!alive) return;
        if (res.area) onAreaSuggest?.(res.area);
        setSuggest(res.municipality ? [{ label: res.municipality }] : []);
      } else {
        const list = await searchMunicipalities(v, 8);
        if (!alive) return;
        setSuggest(list.map((m) => ({ label: m.name })));
        // foreslå område hvis eksakt treff
        const exact = list.find((m) => m.name.toLowerCase() === v.toLowerCase());
        if (exact) onAreaSuggest?.(exact.area);
      }
    })();
    return () => {
      alive = false;
    };
  }, [value, onAreaSuggest]);

  const placeholder = useMemo(
    () => "Søk kommune eller postnummer",
    []
  );

  return (
    <div className="form-group">
      <label className="label">Kommune / postnummer</label>
      <input
        className="input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list="municipality-hints"
        autoComplete="off"
        spellCheck={false}
      />
      <datalist id="municipality-hints">
        {suggest.map((s) => (
          <option key={s.label} value={s.label} />
        ))}
      </datalist>
      <div className="hint">Skriv f.eks. “Bodø” eller “8006”.</div>
    </div>
  );
}
