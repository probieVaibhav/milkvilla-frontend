import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";
import CheckoutForm from "../components/CheckoutForm.jsx";
import Pagination from "../components/Pagination.jsx";

/* const fallbackProducts = [
  { id: "milk-1l", name: "Fresh Milk", price: 48, unit: "1 L", description: "Pure farm milk, rich in nutrients.", emoji: "🥛" },
  { id: "ghee-250g", name: "Original Ghee", price: 220, unit: "250 g", description: "Traditional taste and rich aroma.", emoji: "🧈" },
  { id: "dahi-500g", name: "Fresh Dahi", price: 75, unit: "500 g", description: "Creamy and probiotic-rich yogurt.", emoji: "🥣" },
  { id: "lassi-500ml", name: "Sweet Lassi", price: 80, unit: "500 ml", description: "Refreshing, chilled, and naturally delicious.", emoji: "🥤" },
  { id: "paneer-250g", name: "Farm Paneer", price: 180, unit: "250 g", description: "Soft paneer for curries and snacks.", emoji: "🧀" },
  { id: "buttermilk-1l", name: "Buttermilk", price: 55, unit: "1 L", description: "Cooling and protein-packed natural drink.", emoji: "🥛" },
]; */
const fallbackProducts = [];

export default function Storefront() {
  const [products, setProducts] = useState(fallbackProducts);
  const [productsById, setProductsById] = useState({});
  const [productPage, setProductPage] = useState(1);
  const [productPagination, setProductPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState({});

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

  return (
    <div className="storefront">
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
          <CheckoutForm
            cartItems={cartItems}
            onOrderPlaced={() => setCart({})}
            onRestoreCheckout={(items) => {
              setCart(Object.fromEntries(items.map((item) => [item.id, item.quantity])));
              setProductsById((current) => ({ ...current, ...Object.fromEntries(items.map((item) => [item.id, item])) }));
            }}
          />
        </div>
      </main>
    </div>
  );
}
