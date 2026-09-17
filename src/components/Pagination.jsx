export default function Pagination({ page, pageCount, onPageChange, rangeStart, rangeEnd, total }) {
  if (total === 0) return null;

  return (
    <div className="pagination">
      <span className="pagination-range">
        {rangeStart}&ndash;{rangeEnd} of {total}
      </span>
      <div className="pagination-controls">
        <button
          className="chip-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          &lsaquo; Prev
        </button>
        <span className="pagination-page">
          Page {page} of {pageCount}
        </span>
        <button
          className="chip-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          Next &rsaquo;
        </button>
      </div>
    </div>
  );
}
