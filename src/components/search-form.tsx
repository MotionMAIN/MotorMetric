import { Search } from "lucide-react";

export function SearchForm({ defaultValue = "", compact = false }: { defaultValue?: string; compact?: boolean }) {
  return (
    <form action="/" method="get" role="search" className={compact ? "search-panel compact" : "search-panel"}>
      <label className="search-box">
        <span className="search-field">
          <Search size={21} aria-hidden="true" />
          <span className="sr-only">Fahrzeugmodell oder HSN/TSN suchen</span>
          <input
            name="q"
            defaultValue={defaultValue}
            placeholder="z. B. Mercedes CL 500, 0999 oder AFT"
            autoComplete="off"
            list="vehicle-examples"
          />
        </span>
        <button className="primary-button" type="submit">Bestand suchen</button>
      </label>
      <datalist id="vehicle-examples">
        <option value="CL 500" />
        <option value="E 420 CDI" />
        <option value="0999 AFT" />
        <option value="0999" />
        <option value="AFT" />
      </datalist>
    </form>
  );
}
