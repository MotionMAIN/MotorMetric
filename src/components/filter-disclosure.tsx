import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export function FilterDisclosure({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  return (
    <aside className="filter-disclosure">
      <input className="filter-checkbox" id="mobile-filter-toggle" type="checkbox" />
      <label className="filter-toggle" htmlFor="mobile-filter-toggle">
        <SlidersHorizontal size={19} aria-hidden="true" />
        <span className="filter-show-label">Ergebnisse filtern</span>
        <span className="filter-hide-label">Filter ausblenden</span>
        {activeCount > 0 && <span className="filter-count">{activeCount} aktiv</span>}
        <ChevronDown className="filter-chevron" size={19} aria-hidden="true" />
      </label>
      <div className="filter-content" id="vehicle-filters">
        {children}
      </div>
    </aside>
  );
}
