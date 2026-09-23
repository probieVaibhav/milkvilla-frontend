import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { apiRequest, calculateDistanceKm, locationConfig } from "./api.js";

const fallbackProducts = [
  { id: "milk-1l", name: "Fresh Milk", price: 48, unit: "1 L", description: "Pure farm milk, rich in nutrients.", emoji: "🥛" },
  { id: "ghee-250g", name: "Original Ghee", price: 220, unit: "250 g", description: "Traditional taste and rich aroma.", emoji: "🧈" },
  { id: "dahi-500g", name: "Fresh Dahi", price: 75, unit: "500 g", description: "Creamy and probiotic-rich yogurt.", emoji: "🥣" },
  { id: "lassi-500ml", name: "Sweet Lassi", price: 80, unit: "500 ml", description: "Refreshing, chilled, and naturally delicious.", emoji: "🥤" },
  { id: "paneer-250g", name: "Farm Paneer", price: 180, unit: "250 g", description: "Soft paneer for curries and snacks.", emoji: "🧀" },
  { id: "buttermilk-1l", name: "Buttermilk", price: 55, unit: "1 L", description: "Cooling and protein-packed natural drink.", emoji: "🥛" },
];

function Brand({ dark = false }) {
  return (
    <Link className={`brand ${dark ? "brand-dark" : ""}`} to="/">
      <span className="brand-mark">M</span>
      <span>
        <strong>Milk Villa</strong>
        <small>daily dairy, done right</small>
      </span>
    </Link>
  );
}

function Storefront() {
  const [products, setProducts] = useState(fallbackProducts);
  const [cart, setCart] = useState({});
  const [form, setForm] = useState({ customerName: "", phone: "", address: "", city: "", pincode: "", notes: "" });
  const [position, setPosition] = useState(null);
  const [locationState, setLocationState] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiRequest("/products")
      .then((data) => setProducts(data.products))
      .catch(() => {});
  }, []);
  const cartItems = products.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id], total: product.price * cart[product.id] }));
  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const distance = position ? Number(calculateDistanceKm(position.latitude, position.longitude).toFixed(2)) : null;
  const delivery = distance !== null && distance > 10 ? 40 : 0;
  const total = subtotal + delivery;
  const setField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const changeQuantity = (id, delta) =>
    setCart((current) => {
      const next = Math.max(0, (current[id] || 0) + delta);
      const updated = { ...current };
      if (next) updated[id] = next;
      else delete updated[id];
      return updated;
    });
  const useLocation = () => {
    if (!navigator.geolocation || !Number.isFinite(locationConfig.latitude)) {
      setLocationState("error");
      setFeedback("Delivery coordinates are not configured yet.");
      return;
    }
    setLocationState("loading");
    navigator.geolocation.getCurrentPosition(
      (next) => {
        setPosition(next.coords);
        setLocationState("ready");
        setFeedback("");
      },
      () => {
        setLocationState("error");
        setFeedback("Please allow location access to calculate delivery.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };
  const placeOrder = async () => {
    if (!Object.values(form).slice(0, 5).every(Boolean) || !cartItems.length) return setFeedback("Complete your details and add at least one product.");
    if (!position) return setFeedback("Use your location before placing the order.");
    setBusy(true);
    setFeedback("");
    try {
      const { order } = await apiRequest("/orders", { method: "POST", body: JSON.stringify({ ...form, latitude: position.latitude, longitude: position.longitude, items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })) }) });
      setCart({});
      setForm({ customerName: "", phone: "", address: "", city: "", pincode: "", notes: "" });
      setPosition(null);
      setLocationState("idle");
      setFeedback(`Order ${order.id} is confirmed. Pay ₹${order.total} on delivery.`);
    } catch (error) {
      setFeedback(error.message);
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
            <p className="eyebrow">Bottled at sunrise · delivered by lunch</p>
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
                2019
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
              <span className="section-count">{products.length} essentials</span>
            </div>
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
                      <button onClick={() => changeQuantity(product.id, -1)} aria-label={`Remove ${product.name}`}>
                        −
                      </button>
                      <span>{cart[product.id] || 0}</span>
                      <button onClick={() => changeQuantity(product.id, 1)} aria-label={`Add ${product.name}`}>
                        +
                      </button>
                    </div>
                    <button className="add-button" onClick={() => changeQuantity(product.id, 1)}>
                      Add to order
                    </button>
                  </div>
                </article>
              ))}
            </div>
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
              <div className="empty-cart">
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
                ["phone", "Phone number", "tel"],
                ["address", "House, street, locality", "text"],
                ["city", "City", "text"],
                ["pincode", "Pincode", "text"],
              ].map(([name, placeholder, type]) => (
                <label key={name}>
                  <span>{placeholder}</span>
                  <input name={name} type={type} value={form[name]} onChange={setField} placeholder={placeholder} />
                </label>
              ))}
              <label className="wide">
                <span>
                  Order notes <em>optional</em>
                </span>
                <textarea name="notes" value={form.notes} onChange={setField} placeholder="Any special instructions" />
              </label>
            </div>
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
            <button className="button button-dark full-button" onClick={placeOrder} disabled={busy}>
              {busy ? "Placing order..." : "Place order · COD"}
            </button>
            {feedback && <div className="feedback">{feedback}</div>}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () =>
    apiRequest("/orders")
      .then((data) => setOrders(data.orders))
      .catch((err) => {
        if (err.status === 401) navigate("/admin/login");
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);
  const counts = useMemo(() => ["pending", "placed", "out-for-delivery", "delivered"].map((status) => ({ status, count: orders.filter((order) => order.status === status).length })), [orders]);
  const update = async (id, status) => {
    try {
      await apiRequest(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      load();
    } catch (err) {
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
            <p className="eyebrow">Owner dashboard</p>
            <h1>Today at the dairy</h1>
            <p>Every order, in one quiet place.</p>
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
                    <small>{new Date(order.createdAt).toLocaleString()}</small>
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
                  <select value={order.status} onChange={(event) => update(order.id, event.target.value)}>
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
