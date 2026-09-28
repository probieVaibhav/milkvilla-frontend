export default function Pagination({ page, totalPages, onPageChange, disabled = false }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={disabled || page <= 1} aria-label="Previous page" title="Previous page">
        ←
      </button>
      <span>
        Page <strong>{page}</strong> of {totalPages}
      </span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={disabled || page >= totalPages} aria-label="Next page" title="Next page">
        →
      </button>
    </nav>
  );
}
