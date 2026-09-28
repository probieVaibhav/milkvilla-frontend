import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { apiRequest, calculateDistanceKm, locationConfig } from "./api.js";
import logo from "./assets/logo.jpeg";

/* const fallbackProducts = [
  { id: "milk-1l", name: "Fresh Milk", price: 48, unit: "1 L", description: "Pure farm milk, rich in nutrients.", emoji: "🥛" },
  { id: "ghee-250g", name: "Original Ghee", price: 220, unit: "250 g", description: "Traditional taste and rich aroma.", emoji: "🧈" },
  { id: "dahi-500g", name: "Fresh Dahi", price: 75, unit: "500 g", description: "Creamy and probiotic-rich yogurt.", emoji: "🥣" },
  { id: "lassi-500ml", name: "Sweet Lassi", price: 80, unit: "500 ml", description: "Refreshing, chilled, and naturally delicious.", emoji: "🥤" },
  { id: "paneer-250g", name: "Farm Paneer", price: 180, unit: "250 g", description: "Soft paneer for curries and snacks.", emoji: "🧀" },
  { id: "buttermilk-1l", name: "Buttermilk", price: 55, unit: "1 L", description: "Cooling and protein-packed natural drink.", emoji: "🥛" },
]; */
const fallbackProducts = [];

function useAutoDismiss(value, setValue, emptyValue = "") {
  useEffect(() => {
    if (!value) return undefined;
    const timeout = window.setTimeout(() => setValue(emptyValue), 5000);
    return () => window.clearTimeout(timeout);
  }, [value, setValue, emptyValue]);
}

function Brand({ dark = false }) {
  return (
    <Link className={`brand ${dark ? "brand-dark" : ""}`} to="/">
      <span className="brand-mark">M</span>
      {/* <span className="brand-mark">
        <img src={logo} alt="Milk Villa Logo" />
      </span> */}
      <span>
        <strong>Milk Villa</strong>
        <small>daily dairy, done right</small>
      </span>
    </Link>
  );
}

function Pagination({ page, totalPages, onPageChange, disabled = false }) {
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

function Storefront() {
  const [products, setProducts] = useState(fallbackProducts);
  const [productsById, setProductsById] = useState({});
  const [productPage, setProductPage] = useState(1);
  const [productPagination, setProductPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState({});
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
          setCart(Object.fromEntries(restoredItems.map((item) => [item.id, item.quantity])));
          setProductsById((current) => ({ ...current, ...Object.fromEntries(restoredItems.map((item) => [item.id, item])) }));
          setPosition(checkout.position || null);
          setLocationState(checkout.position ? "ready" : "idle");
          window.history.replaceState({}, "", `${window.location.pathname}#checkout`);
          return;
        }
      })
      .catch((error) => setVerificationNotice({ type: "error", message: error.message }))
      .finally(() => {
        if (window.location.search) window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      });
  }, []);

  useEffect(() => {
    let active = true;
    setProductsLoading(true);
    apiRequest(`/products?page=${productPage}&limit=6`)
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setProductsById((current) => ({ ...current, ...Object.fromEntries(data.products.map((product) => [product.id, product])) }));
        setProductPagination(data.pagination);
        setProductPage(data.pagination.page);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setProductsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productPage]);
  const cartItems = Object.entries(cart).flatMap(([id, quantity]) => {
    const product = productsById[id];
    return product ? [{ ...product, quantity, total: product.price * quantity }] : [];
  });
  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const distance = position ? Number(calculateDistanceKm(position.latitude, position.longitude).toFixed(2)) : null;
  const delivery = distance !== null && distance > 10 ? 40 : 0;
  const total = subtotal + delivery;
  const setField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "email" && verifiedEmail?.email !== value.trim().toLowerCase()) {
      setVerifiedEmail(null);
      setVerificationNotice(null);
    }
  };
  const checkEmailStatus = async () => {
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || verifiedEmail?.email === email) return;
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
  const showFeedback = (message, type = "error") => setFeedback({ type, message });
  const requestEmailVerification = async () => {
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setVerificationNotice({ type: "error", message: "Enter a valid email address first." });
      return;
    }
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
  const changeQuantity = (product, delta) => {
    setProductsById((current) => ({ ...current, [product.id]: product }));
    setCart((current) => {
      const next = Math.max(0, (current[product.id] || 0) + delta);
      const updated = { ...current };
      if (next) updated[product.id] = next;
      else delete updated[product.id];
      return updated;
    });
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
  const placeOrder = async () => {
    if (![form.customerName, form.email, form.phone, form.address, form.city, form.pincode].every((value) => value.trim()) || !cartItems.length) {
      setShowValidation(true);
      return showFeedback("Complete your details and add at least one product.");
    }
    const email = form.email.trim().toLowerCase();
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
      const { order, customerEmail } = await apiRequest("/orders", { method: "POST", body: JSON.stringify({ ...form, verificationToken: verifiedEmail?.token, latitude: position.latitude, longitude: position.longitude, items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })) }) });
      setCart({});
      setShowValidation(false);
      const message = customerEmail?.sent ? `Order ${order.id} placed successfully. Confirmation sent to ${email}. Pay ₹${order.total} on delivery.` : `Order ${order.id} placed successfully, but the confirmation email could not be sent. ${customerEmail?.warning || "Please contact Milk Villa."}`;
      showFeedback(message, customerEmail?.sent ? "success" : "warning");
    } catch (error) {
      showFeedback(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="storefront">
      <header className="topbar">
        <Brand />
        <nav>
          <a href="#products">Shop</a>
          <a href="#promise">Our promise</a>
          <a href="#checkout">Your order</a>
        </nav>
        <a className="call-link" href="tel:8199932213">
          <span>Call today</span>
          <strong>81999 32213</strong>
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Packed at sunrise · delivered by lunch</p>
            <h1>The good stuff, from our dairy to your door.</h1>
            <p className="hero-lede">Fresh milk and small-batch favourites for the everyday table. Honest ingredients, local delivery, and a little more care in every order.</p>
            <a className="button button-dark" href="#products">
              Shop the dairy <span>↘</span>
            </a>
            <div className="hero-notes">
              <span>
                <b>01</b> Made fresh
              </span>
              <span>
                <b>02</b> Local routes
              </span>
              <span>
                <b>03</b> Pay on delivery
              </span>
            </div>
          </div>
          <div className="hero-image">
            <div className="sun-disc" />
            <div className="milk-poster">
              <span className="poster-stamp">
                Since
                <br />
                2026
              </span>
              <strong>
                pure
                <br />
                <i>milk</i>
              </strong>
              <small>from our farm</small>
            </div>
            <div className="hero-caption">
              A calmer morning starts here <span>✳</span>
            </div>
          </div>
        </section>
        <section className="promise" id="promise">
          <div>
            <b>01</b>
            <strong>Freshly prepared</strong>
            <span>Simple ingredients, careful hands.</span>
          </div>
          <div>
            <b>02</b>
            <strong>Nearby delivery</strong>
            <span>Your distance sets the delivery fee.</span>
          </div>
          <div>
            <b>03</b>
            <strong>Easy ordering</strong>
            <span>Cash on delivery, no fuss.</span>
          </div>
        </section>
        <div className="shop-layout">
          <section className="products-section" id="products">
            <div className="section-top">
              <div>
                <p className="eyebrow">Straight from the dairy</p>
                <h2>Pick your favourites</h2>
              </div>
              <span className="section-count">{productPagination.total ? `Showing ${(productPage - 1) * productPagination.limit + 1}-${Math.min(productPage * productPagination.limit, productPagination.total)} of ${productPagination.total}` : "No products"}</span>
            </div>
            {productsLoading ? (
              <div className="empty-products">Loading products...</div>
            ) : products.length ? (
              <div className="product-grid">
                {products.map((product, index) => (
                  <article className={`product-card ${cart[product.id] ? "selected" : ""}`} key={product.id}>
                    <div className={`product-visual visual-${index % 3}`}>
                      <span>{product.emoji}</span>
                      <small>{product.unit}</small>
                    </div>
                    <div className="product-info">
                      <div>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                      </div>
                      <strong>₹{product.price}</strong>
                    </div>
                    <div className="product-actions">
                      <div className="stepper">
                        <button onClick={() => changeQuantity(product, -1)} aria-label={`Remove ${product.name}`}>
                          −
                        </button>
                        <span>{cart[product.id] || 0}</span>
                        <button onClick={() => changeQuantity(product, 1)} aria-label={`Add ${product.name}`}>
                          +
                        </button>
                      </div>
                      <button className="add-button" onClick={() => changeQuantity(product, 1)}>
                        Add to order
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-products">No products are available right now.</div>
            )}
            <Pagination page={productPage} totalPages={productPagination.totalPages} onPageChange={setProductPage} disabled={productsLoading} />
          </section>
          <aside className="checkout" id="checkout">
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
                <label className={showValidation && !form[name].trim() ? "invalid" : ""} key={name}>
                  <span>
                    {placeholder}{" "}
                    <span className="required-marker" aria-hidden="true">
                      *
                    </span>
                  </span>
                  <input name={name} type={type} value={form[name]} onChange={setField} onBlur={name === "email" ? checkEmailStatus : undefined} placeholder={placeholder} required aria-invalid={showValidation && !form[name].trim()} />
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
                <textarea name="notes" value={form.notes} onChange={setField} placeholder="Any special instructions" />
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
              <button onClick={useLocation} disabled={locationState === "loading"}>
                {locationState === "loading" ? "Locating..." : locationState === "ready" ? "Refresh" : "Use location"}
              </button>
            </div>
            <p className="policy">Free within 10 km · ₹40 beyond · cash on delivery</p>
            <button className="button button-dark full-button" onClick={placeOrder} disabled={busy || !cartItems.length}>
              {busy ? "Placing order..." : verifiedEmail?.email === form.email.trim().toLowerCase() ? (cartItems.length ? "Place order · COD" : "Add products to place another order") : "Verify email to continue"}
            </button>
            {feedback && (
              <div className={`feedback toast ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
                {feedback.message}
              </div>
            )}
          </aside>
        </div>
      </main>
      <footer>
        <Brand dark />
        <span>Fresh dairy for ordinary, beautiful days.</span>
        <Link to="/admin/login">Owner access</Link>
      </footer>
    </div>
  );
}

function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useAutoDismiss(error, setError);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest("/auth/login", { method: "POST", body: JSON.stringify(form) });
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <div className="auth-art">
        <Brand dark />
        <div>
          <p className="eyebrow">The back room</p>
          <h1>Good orders deserve good care.</h1>
          <p>Keep an eye on every bottle, basket, and doorstep.</p>
        </div>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <p className="eyebrow">Owner access</p>
        <h2>Welcome back</h2>
        <p>Sign in to manage Milk Villa orders.</p>
        <label>
          Username
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>
        {error && <div className="feedback error">{error}</div>}
        <button className="button button-dark full-button" disabled={busy}>
          {busy ? "Signing in..." : "Enter dashboard"}
        </button>
        <Link to="/">← Back to customer store</Link>
      </form>
    </main>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  useAutoDismiss(error, setError);
  useAutoDismiss(notificationNotice, setNotificationNotice);
  const load = (requestedPage = page, signal) => {
    setLoading(true);
    return apiRequest(`/orders?page=${requestedPage}&limit=${pagination.limit}`, { signal })
      .then((data) => {
        setOrders(data.orders);
        setPagination(data.pagination);
        setPage(data.pagination.page);
        setCounts(["pending", "placed", "out-for-delivery", "delivered"].map((status) => ({ status, count: data.counts[status] || 0 })));
        setError("");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (err.status === 401) navigate("/admin/login");
        else setError(err.message);
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  };
  useEffect(() => {
    const controller = new AbortController();
    load(page, controller.signal);
    return () => controller.abort();
  }, [page]);
  const update = async (id, status) => {
    try {
      const result = await apiRequest(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      setNotificationNotice(result.notification?.warning ? `Email not sent: ${result.notification.warning}` : result.notification?.skipped ? "Order status was unchanged; no email was sent." : "Customer status email sent.");
      load(page);
    } catch (err) {
      setNotificationNotice("");
      setError(err.message);
    }
  };
  const logout = async () => {
    await apiRequest("/auth/logout", { method: "POST" });
    navigate("/admin/login");
  };
  return (
    <main className="admin-page">
      <header className="admin-top">
        <Brand />
        <div>
          <Link className="admin-link" to="/">
            Customer view
          </Link>
          <button className="text-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <section className="admin-content">
        <div className="admin-intro">
          <div>
            <p className="eyebrow">Owner's dashboard</p>
            <h1>Check Order's Status</h1>
          </div>
          <span className="date-chip">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span>
        </div>
        <div className="stat-grid">
          {counts.map(({ status, count }) => (
            <div className="stat" key={status}>
              <span>{status.replaceAll("-", " ")}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
        {error && <div className="feedback error">{error}</div>}
        {/* {notificationNotice && (
          <div className={`feedback ${notificationNotice.startsWith("Email not sent") ? "error" : ""}`} aria-live="polite">
            {notificationNotice}
          </div>
        )} */}
        <div className={`feedback ${notificationNotice.startsWith("Email not sent") ? "error" : ""}`} aria-live="polite">
          {notificationNotice}
        </div>
        {loading ? (
          <div className="empty-admin">Loading orders...</div>
        ) : !orders.length ? (
          <div className="empty-admin">No orders yet. Your next one will appear here.</div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
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
                  <select value={order.status} onChange={(event) => update(order.id, event.target.value)} disabled={order.status === "delivered"} className={order.status === "delivered" ? "disabled" : ""}>
                    {["pending", "placed", "out-for-delivery", "delivered"].map((status) => (
                      <option value={status} key={status}>
                        {status.replaceAll("-", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && pagination.total > 0 && (
          <div className="orders-pagination">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
            </span>
            <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} disabled={loading} />
          </div>
        )}
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Storefront />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
