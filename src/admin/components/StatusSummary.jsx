export default function StatusSummary({ counts }) {
  return (
    <div className="stat-grid">
      {counts.map(({ status, count }) => (
        <div className="stat" key={status}>
          <span>{status.replaceAll("-", " ")}</span>
          <strong>{count}</strong>
        </div>
      ))}
    </div>
  );
}
