export function SyncSummary({ pending }: { pending: number }) {
  return (
    <div className="queue-summary">
      <div>
        <span className="muted">Local queue</span>
        <strong>{pending}</strong>
        <small>Pending or requires attention</small>
      </div>
    </div>
  );
}
