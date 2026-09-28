export default function OrderCard({ order, onStatusChange }) {
  const canceled = order.status === "canceled";
  return (
    <article className="order-card">
      <div className="order-main">
        <div className="order-id">
          <span>{order.id}</span>
          <small>{new Date(order.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}</small>
        </div>
        <h3>{order.customerName}</h3>
        <p>
          {order.address}, {order.city} · {order.pincode}
        </p>
        <a href={`tel:${order.phone}`}>{order.phone}</a>
      </div>
      <div className="order-items">
        {order.items.map((item) => (
          <span key={item.productId}>
            {item.name} × {item.quantity}
          </span>
        ))}
      </div>
      <div className="order-total">
        <span>{order.distanceKm} km</span>
        <strong>₹{order.total}</strong>
        {canceled ? (
          <div className="order-cancellation">
            <strong>Order canceled</strong>
            <p>{order.cancellationReason}</p>
          </div>
        ) : (
          <select value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value)} disabled={order.status === "delivered"} className={order.status === "delivered" ? "disabled" : ""}>
            {["pending", "placed", "out-for-delivery", "delivered"].map((status) => (
              <option value={status} key={status}>
                {status.replaceAll("-", " ")}
              </option>
            ))}
            <option value="not-in-stock">Not in stock</option>
            <option value="cancel">Cancel</option>
          </select>
        )}
      </div>
    </article>
  );
}
