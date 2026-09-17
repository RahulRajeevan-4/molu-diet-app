export default function StatsRow({ stats }) {
  return (
    <div className="stats">
      <div className="stat">
        <div className="n">{stats.total}</div>
        <div className="l">Fruits profiled</div>
      </div>
      <div className="stat">
        <div className="n">{stats.avgGi}</div>
        <div className="l">Average GI (typical)</div>
      </div>
      <div className="stat">
        <div className="n">{stats.highFiber}</div>
        <div className="l">≥5g fibre / 100g</div>
      </div>
      <div className="stat">
        <div className="n">{stats.flagged}</div>
        <div className="l">Flagged for caution</div>
      </div>
    </div>
  );
}
