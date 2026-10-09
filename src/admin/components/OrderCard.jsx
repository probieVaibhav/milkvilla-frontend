import { useState } from "react";

export default function OrderCard({ order, onStatusChange, statusUpdating }) {
  const canceled = order.status === "canceled";
  const hasCoordinates = Number.isFinite(order.latitude) && Number.isFinite(order.longitude);
  const [locating, setLocating] = useState(false);
  const [mapMessage, setMapMessage] = useState("");
  const [fallbackDirectionsUrl, setFallbackDirectionsUrl] = useState("");
  const openDirections = () => {
    setFallbackDirectionsUrl("");
    setMapMessage("");
    if (!navigator.geolocation) {
      setMapMessage("Location access is unavailable. Open this dashboard over HTTPS and allow location access.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const origin = `${coords.latitude},${coords.longitude}`;
        const destination = `${order.latitude},${order.longitude}`;
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
        setLocating(false);
        const mapWindow = window.open(directionsUrl, "_blank");
        if (!mapWindow) {
          setFallbackDirectionsUrl(directionsUrl);
          setMapMessage("Your location is ready. Allow pop-ups or use the link to open directions.");
        } else {
          mapWindow.opener = null;
        }
      },
      (error) => {
        setLocating(false);
        const messages = {
          1: "Location permission was denied. Allow location access in your browser settings and try again.",
          2: "Your current location could not be determined. Check your device location settings and try again.",
          3: "Finding your location took too long. Please try again.",
        };
        setMapMessage(messages[error.code] || "Could not access your location. Please try again.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
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
      <div className="order-location">
        <div className="order-location-details">
          <span className="order-location-label">Delivery location</span>
          <span className="order-coordinates">
            {hasCoordinates ? `${order.latitude.toFixed(6)}, ${order.longitude.toFixed(6)}` : "Coordinates unavailable"}
          </span>
        </div>
        {hasCoordinates && (
          <button className="map-link" type="button" onClick={openDirections} disabled={locating}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
              <circle cx="12" cy="9" r="2.2" />
              <path d="M14.2 9h5.3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-1.3" />
            </svg>
            <span>{locating ? "Finding your location…" : "Directions from my location"}</span>
            {!locating && <span className="map-link-arrow" aria-hidden="true">↗</span>}
          </button>
        )}
        {(mapMessage || fallbackDirectionsUrl) && (
          <div className="map-feedback" role="status" aria-live="polite">
            <span>{mapMessage}</span>
            {fallbackDirectionsUrl && <a href={fallbackDirectionsUrl} target="_blank" rel="noopener noreferrer">Open directions ↗</a>}
          </div>
        )}
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
          <select value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value)} disabled={order.status === "delivered" || statusUpdating} className={order.status === "delivered" || statusUpdating ? "disabled" : ""}>
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
