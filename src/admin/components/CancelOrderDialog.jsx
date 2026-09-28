import { useState } from "react";

export default function CancelOrderDialog({ onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Cancellation reason is required.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onConfirm(trimmedReason);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cancel-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel()}>
      <form className="cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title" onSubmit={submit}>
        <p className="eyebrow">Order cancellation</p>
        <h2 id="cancel-dialog-title">Add a reason</h2>
        <p>This reason will appear on the order and be included in the customer email.</p>
        <label htmlFor="cancel-reason">
          Cancellation reason{" "}
          <span className="required-marker" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (event.target.value.trim()) setError("");
          }}
          maxLength={1000}
          aria-required="true"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "cancel-reason-error" : undefined}
          autoFocus
        />
        {error && (
          <div className="feedback error cancel-dialog-toast" id="cancel-reason-error" role="alert">
            {error}
          </div>
        )}
        <div className="cancel-dialog-actions">
          <button type="button" onClick={onCancel} disabled={busy}>
            Keep order
          </button>
          <button className="cancel-confirm" type="submit" disabled={busy}>
            {busy ? "Canceling..." : "Cancel order"}
          </button>
        </div>
      </form>
    </div>
  );
}
