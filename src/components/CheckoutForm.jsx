import { useEffect, useState } from "react";
import { apiRequest, calculateDistanceKm, locationConfig } from "../api.js";
import useAutoDismiss from "../hooks/useAutoDismiss.js";
import { checkoutCustomerSchema, checkoutEmailSchema } from "../validation/checkout.js";

export default function CheckoutForm({ cartItems, onOrderPlaced, onRestoreCheckout }) {
  const [form, setForm] = useState({ customerName: "", email: "", phone: "", address: "", city: "", pincode: "", notes: "" });
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState(null);
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [position, setPosition] = useState(null);
  const [locationState, setLocationState] = useState("idle");
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useAutoDismiss(feedback, setFeedback, null);
  useAutoDismiss(verificationNotice, setVerificationNotice, null);

  useEffect(() => {
    if (!verificationCooldown) return undefined;
    const timeout = window.setTimeout(() => setVerificationCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [verificationCooldown]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("verify");
    if (!token) return;
    apiRequest("/email/verify", { method: "POST", body: JSON.stringify({ token }) })
      .then(({ email, verificationToken, checkout }) => {
        setForm((current) => ({ ...current, email }));
        setVerifiedEmail({ email, token: verificationToken });
        setVerificationNotice({ type: "success", message: `Email verified: ${email}` });
        if (checkout) {
          setForm((current) => ({ ...current, ...checkout.form, email }));
          const restoredItems = checkout.items || [];
          onRestoreCheckout(restoredItems);
          setPosition(checkout.position || null);
          setLocationState(checkout.position ? "ready" : "idle");
          window.history.replaceState({}, "", `${window.location.pathname}#checkout`);
        }
      })
      .catch((error) => setVerificationNotice({ type: "error", message: error.message }))
      .finally(() => {
        if (window.location.search) window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      });
  }, []);

  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const distance = position ? Number(calculateDistanceKm(position.latitude, position.longitude).toFixed(2)) : null;
  const delivery = distance !== null && distance > 10 ? 40 : 0;
  const total = subtotal + delivery;
  const setField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (showValidation || fieldErrors[name]) {
      const result = checkoutCustomerSchema.shape[name].safeParse(value);
      setFieldErrors((current) => ({ ...current, [name]: result.success ? "" : result.error.issues[0]?.message || "Invalid value." }));
    }
    if (name === "email" && verifiedEmail?.email !== value.trim().toLowerCase()) {
      setVerifiedEmail(null);
      setVerificationNotice(null);
    }
  };
  const checkEmailStatus = async (value = form.email) => {
    const validation = checkoutEmailSchema.safeParse(value);
    if (!validation.success || verifiedEmail?.email === validation.data) return;
    const email = validation.data;
    try {
      const result = await apiRequest("/email/status", { method: "POST", body: JSON.stringify({ email }) });
      if (result.verified && form.email.trim().toLowerCase() === email) {
        setVerifiedEmail({ email, token: null });
        setVerificationNotice({ type: "success", message: "This email is already verified." });
      }
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    }
  };
  const handleFieldBlur = (name) => {
    const result = checkoutCustomerSchema.shape[name].safeParse(form[name]);
    setFieldErrors((current) => ({ ...current, [name]: result.success ? "" : result.error.issues[0]?.message || "Invalid value." }));
    if (name === "email" && result.success) checkEmailStatus(result.data);
  };
  const showFeedback = (message, type = "error") => setFeedback({ type, message });
  const requestEmailVerification = async () => {
    const validation = checkoutEmailSchema.safeParse(form.email);
    if (!validation.success) {
      setFieldErrors((current) => ({ ...current, email: validation.error.issues[0]?.message || "Enter a valid email address." }));
      setVerificationNotice({ type: "error", message: "Enter a valid email address first." });
      return;
    }
    const email = validation.data;
    setVerificationBusy(true);
    setVerificationNotice(null);
    try {
      const checkout = {
        form,
        items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
        position: position ? { latitude: position.latitude, longitude: position.longitude } : null,
      };
      const result = await apiRequest("/email/verification", { method: "POST", body: JSON.stringify({ email, checkout }) });
      if (result.verified) setVerifiedEmail({ email, token: null });
      setVerificationCooldown(result.verified ? 0 : result.retryAfter || 30);
      setVerificationNotice({ type: "success", message: result.message });
    } catch (error) {
      if (error.retryAfter) setVerificationCooldown(error.retryAfter);
      setVerificationNotice({ type: "error", message: error.message });
    } finally {
      setVerificationBusy(false);
    }
  };
  const useLocation = () => {
    if (!navigator.geolocation || !Number.isFinite(locationConfig.latitude)) {
      setLocationState("error");
      showFeedback("Delivery coordinates are not configured yet.");
      return;
    }
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      (next) => {
        setPosition(next.coords);
        setLocationState("ready");
        setFeedback(null);
      },
      () => {
        setLocationState("error");
        showFeedback("Please allow location access to calculate delivery.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };
  const placeOrder = async (event) => {
    event.preventDefault();
    const validation = checkoutCustomerSchema.safeParse(form);
    setShowValidation(true);
    if (!validation.success) {
      const nextErrors = Object.fromEntries(validation.error.issues.map(({ path, message }) => [path[0], message]));
      setFieldErrors(nextErrors);
    }
    if (!cartItems.length) {
      showFeedback("Add at least one product to your order.");
      return;
    }
    if (!validation.success) {
      showFeedback("Please correct the highlighted fields before placing your order.");
      return;
    }
    const validatedForm = validation.data;
    const email = validatedForm.email;
    if (verifiedEmail?.email !== email) {
      try {
        const result = await apiRequest("/email/status", { method: "POST", body: JSON.stringify({ email }) });
        if (!result.verified) return showFeedback("Verify your email before placing the order. Use the link we sent to your inbox.");
        setVerifiedEmail({ email, token: null });
      } catch (error) {
        return showFeedback(error.message);
      }
    }
    if (!position) return showFeedback("Use your location before placing the order.");
    setBusy(true);
    setFeedback(null);
    try {
      const { order, customerEmail } = await apiRequest("/orders", { method: "POST", body: JSON.stringify({ ...validatedForm, verificationToken: verifiedEmail?.token, latitude: position.latitude, longitude: position.longitude, items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })) }) });
      onOrderPlaced();
      setShowValidation(false);
      setFieldErrors({});
      const message = customerEmail?.sent ? `Order ${order.id} placed successfully. Confirmation sent to ${email}. Pay ₹${order.total} on delivery.` : `Order ${order.id} placed successfully, but the confirmation email could not be sent. ${customerEmail?.warning || "Please contact Milk Villa."}`;
      showFeedback(message, customerEmail?.sent ? "success" : "warning");
    } catch (error) {
      if (error.fieldErrors) {
        setFieldErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([name, messages]) => [name, messages?.[0] || "Invalid value."])));
      }
      showFeedback(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="checkout" id="checkout" noValidate onSubmit={placeOrder}>
      <div className="checkout-heading">
        <div>
          <p className="eyebrow">Almost there</p>
          <h2>Your order</h2>
        </div>
        <span>{cartItems.length} items</span>
      </div>
      {cartItems.length ? (
        <div className="cart-items">
          {cartItems.map((item) => (
            <div className="cart-row" key={item.id}>
              <span>
                {item.name}
                <small>
                  {item.quantity} × ₹{item.price}
                </small>
              </span>
              <strong>₹{item.total}</strong>
            </div>
          ))}
        </div>
      ) : (
        <div className={`empty-cart ${showValidation && !cartItems.length ? "invalid" : ""}`}>
          Your basket is waiting.
          <br />
          Add something fresh to begin.
        </div>
      )}
      <div className="totals">
        <div>
          <span>Subtotal</span>
          <strong>₹{subtotal}</strong>
        </div>
        <div>
          <span>Delivery</span>
          <strong>{distance === null ? "Location needed" : delivery ? `₹${delivery}` : "Free"}</strong>
        </div>
        {distance !== null && <small>Estimated route: {distance} km</small>}
        <div className="grand-total">
          <span>Total</span>
          <strong>₹{total}</strong>
        </div>
      </div>
      <div className="form-grid">
        {[
          ["customerName", "Your name", "text"],
          ["email", "Email address", "email"],
          ["phone", "Phone number", "tel"],
          ["address", "House, street, locality", "text"],
          ["city", "City", "text"],
          ["pincode", "Pincode", "text"],
        ].map(([name, placeholder, type]) => (
          <label className={fieldErrors[name] ? "invalid" : ""} key={name}>
            <span>
              {placeholder}{" "}
              <span className="required-marker" aria-hidden="true">
                *
              </span>
            </span>
            <input
              name={name}
              type={type}
              inputMode={name === "phone" ? "tel" : name === "pincode" ? "numeric" : undefined}
              autoComplete={{ customerName: "name", email: "email", phone: "tel", address: "street-address", city: "address-level2", pincode: "postal-code" }[name]}
              maxLength={{ customerName: 80, email: 254, phone: 25, address: 200, city: 80, pincode: 6 }[name]}
              value={form[name]}
              onChange={setField}
              onBlur={() => handleFieldBlur(name)}
              placeholder={placeholder}
              required
              aria-invalid={Boolean(fieldErrors[name])}
              aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
            />
            {fieldErrors[name] && (
              <small className="field-error" id={`${name}-error`}>
                {fieldErrors[name]}
              </small>
            )}
          </label>
        ))}
        <div className={`email-verification ${verifiedEmail?.email === form.email.trim().toLowerCase() ? "verified" : ""}`}>
          <button type="button" onClick={requestEmailVerification} disabled={verificationBusy || verificationCooldown > 0 || !form.email.trim() || verifiedEmail?.email === form.email.trim().toLowerCase()}>
            {verificationBusy ? "Sending link..." : verifiedEmail?.email === form.email.trim().toLowerCase() ? "Email verified" : verificationCooldown ? `Resend in ${verificationCooldown}s` : "Send verification link"}
          </button>
          <span className={verificationNotice?.type === "success" ? "notice-success" : verificationNotice ? "notice-error" : ""} aria-live="polite">
            {verificationNotice?.message || (verifiedEmail ? (cartItems.length ? "You can now place your order." : "This email is verified.") : "Verify your email before checkout.")}
          </span>
        </div>
        <label className="wide">
          <span>
            Order notes <em>optional</em>
          </span>
          <textarea name="notes" value={form.notes} onChange={setField} onBlur={() => handleFieldBlur("notes")} placeholder="Any special instructions" maxLength={500} aria-invalid={Boolean(fieldErrors.notes)} aria-describedby={fieldErrors.notes ? "notes-error" : undefined} />
          {fieldErrors.notes && (
            <small className="field-error" id="notes-error">
              {fieldErrors.notes}
            </small>
          )}
        </label>
      </div>
      <p className="required-note">
        <span aria-hidden="true">*</span> marked fields are required
      </p>
      <div className={`location-action ${locationState}`}>
        <span>
          <b>{locationState === "ready" ? "Delivery distance ready" : "Calculate your delivery"}</b>
          <small>{locationState === "ready" ? `${distance} km from Milk Villa` : "Use your location for accurate pricing."}</small>
        </span>
        <button type="button" onClick={useLocation} disabled={locationState === "loading"}>
          {locationState === "loading" ? "Locating..." : locationState === "ready" ? "Refresh" : "Use location"}
        </button>
      </div>
      <p className="policy">Free within 10 km · ₹40 beyond · cash on delivery</p>
      <button type="submit" className="button button-dark full-button" disabled={busy || !cartItems.length}>
        {busy ? "Placing order..." : verifiedEmail?.email === form.email.trim().toLowerCase() ? (cartItems.length ? "Place order · COD" : "Add products to place another order") : "Verify email to continue"}
      </button>
      {feedback && (
        <div className={`feedback toast ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
          {feedback.message}
        </div>
      )}
    </form>
  );
}
