import { useEffect, useMemo, useState } from "react";
import { FRUITS } from "../lib/fruitData.js";
import { getSortValue } from "../utils/deriveFruit.js";
import Toolbar from "../components/Toolbar.jsx";
import StatsRow from "../components/StatsRow.jsx";
import FruitTable from "../components/FruitTable.jsx";
import Pagination from "../components/Pagination.jsx";

const PAGE_SIZE = 25;

export default function FruitTablePage() {
  const [query, setQuery] = useState("");
  const [giFilter, setGiFilter] = useState("all");
  const [minFiber, setMinFiber] = useState(0);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [sortKey, setSortKey] = useState("common_name");
  const [sortDir, setSortDir] = useState("asc");
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = FRUITS.filter((f) => {
      if (query) {
        const q = query.toLowerCase();
        const hay = (f.common_name + " " + f.scientific_name + " " + f.region_note).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (giFilter !== "all" && f._giBucket !== giFilter) return false;
      if ((f.nutrients_per_100g.fiber_g ?? -1) < minFiber) return false;
      if (onlyFlagged && !f._flagged) return false;
      return true;
    });

    rows.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return rows;
  }, [query, giFilter, minFiber, onlyFlagged, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [query, giFilter, minFiber, onlyFlagged]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const stats = useMemo(() => {
    const withGi = FRUITS.filter((f) => f._gi !== null && f._gi !== undefined);
    const avgGi = Math.round(withGi.reduce((sum, f) => sum + f._gi, 0) / withGi.length);
    const highFiber = FRUITS.filter((f) => (f.nutrients_per_100g.fiber_g ?? 0) >= 5).length;
    const flagged = FRUITS.filter((f) => f._flagged).length;
    return { total: FRUITS.length, avgGi, highFiber, flagged };
  }, []);

  function handleSort(col) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir(col.num ? "desc" : "asc");
    }
  }

  function toggleRow(name) {
    setExpanded((e) => (e === name ? null : name));
  }

  return (
    <div className="wrap">
      <p className="eyebrow">Clinical nutrition reference</p>
      <h1 className="headline">Fruit composition &amp; counseling table</h1>

      <StatsRow stats={stats} />

      <Toolbar
        query={query}
        setQuery={setQuery}
        giFilter={giFilter}
        setGiFilter={setGiFilter}
        minFiber={minFiber}
        setMinFiber={setMinFiber}
        onlyFlagged={onlyFlagged}
        setOnlyFlagged={setOnlyFlagged}
        sortKey={sortKey}
        setSortKey={setSortKey}
      />

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        rangeStart={filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
        rangeEnd={Math.min(currentPage * PAGE_SIZE, filtered.length)}
        total={filtered.length}
      />

      <div className="legend">
        <span className="lg-item">
          <span className="pill low">
            <span className="pill-dot"></span>Low
          </span>{" "}
          GI &lt; 55
        </span>
        <span className="lg-item">
          <span className="pill medium">
            <span className="pill-dot"></span>Med
          </span>{" "}
          55–69
        </span>
        <span className="lg-item">
          <span className="pill high">
            <span className="pill-dot"></span>High
          </span>{" "}
          ≥ 70
        </span>
        <span className="lg-item">Click any row to expand full clinical detail</span>
      </div>

      <FruitTable
        rows={pageRows}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        expanded={expanded}
        onToggleRow={toggleRow}
      />

      <footer>
        Sources: USDA FoodData Central (fdc.nal.usda.gov) · ICMR‑NIN Indian Food Composition
        Tables 2017 · Atkinson et al., International Tables of Glycemic Index and Glycemic Load
        Values, 2021 (doi.org/10.1093/ajcn/nqab233). Values are approximate and vary by cultivar,
        ripeness, storage and analytical method; clinical notes are educational, not
        patient‑specific medical advice.
      </footer>
    </div>
  );
}
