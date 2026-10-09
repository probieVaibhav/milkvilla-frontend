export default function StatusSummary({ counts, total, activeStatus, onSelectStatus }) {
  return (
    <section className="status-overview" aria-label="Order overview">
      <div className="status-overview-heading">
        <div>
          <p className="eyebrow">At a glance</p>
          <h2>Order overview</h2>
        </div>
        <span>Select a status to filter orders</span>
      </div>
      <div className="stat-grid" aria-label="Filter orders by status">
        {[{ status: "all", count: total, label: "All orders" }, ...counts.map(({ status, count }) => ({ status, count, label: status.replaceAll("-", " ") }))].map(({ status, count, label }) => (
          <button
            className={`stat${activeStatus === status ? " is-active" : ""}`}
            key={status}
            type="button"
            onClick={() => onSelectStatus(status)}
            aria-pressed={activeStatus === status}
          >
            <span className="stat-label">{label}</span>
            <strong>{count}</strong>
            <span className="stat-action">{activeStatus === status ? "Showing orders" : "View orders"}<span aria-hidden="true"> ↗</span></span>
          </button>
        ))}
      </div>
    </section>
  );
}
