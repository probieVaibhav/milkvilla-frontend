import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FixedSizeList } from "react-window";
import { apiRequest } from "../api.js";
import Brand from "../components/Brand.jsx";
import { productInputSchema } from "../validation/product.js";

const EmojiPicker = lazy(() => import("emoji-picker-react"));
const emptyProduct = { name: "", category: "", price: "", packSize: "", unitType: "L", description: "", emoji: "" };
const productPageSize = 20;

function ProductListingRow({ index, style, data }) {
  const product = data.products[index];
  if (!product) {
    return (
      <div className="product-listing-loader" style={style}>
        {data.catalogError ? (
          <button type="button" onClick={data.onRetry}>Couldn’t load more products · Retry</button>
        ) : (
          <span>{data.loadingMore ? "Loading more products…" : "Scroll to load more"}</span>
        )}
      </div>
    );
  }
  return (
    <article className="managed-product" style={style}>
      <span className="managed-product-emoji" aria-hidden="true">{product.emoji}</span>
      <div className="managed-product-info">
        <h3>{product.name}</h3>
        <span>{product.category} · {product.unit}</span>
        <small>{product.id}</small>
      </div>
      <strong>₹{product.price}</strong>
    </article>
  );
}

export default function ProductManagement() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [productTotal, setProductTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const emojiPickerRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const productListRef = useRef(null);

  useEffect(() => {
    if (!emojiPickerOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!emojiPickerRef.current?.contains(event.target)) setEmojiPickerOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setEmojiPickerOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [emojiPickerOpen]);

  useEffect(() => {
    let active = true;
    apiRequest(`/admin/products?limit=${productPageSize}`)
      .then((result) => {
        if (!active) return;
        setProducts(result.products);
        setProductTotal(result.total);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) navigate("/admin/login");
        else setCatalogError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "category" ? value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-") : value,
    }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  };

  const loadNextPage = async () => {
    if (!hasMore || loadingMoreRef.current || nextCursor === null) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setCatalogError("");
    try {
      const query = new URLSearchParams({ limit: String(productPageSize), cursor: String(nextCursor) });
      const result = await apiRequest(`/admin/products?${query}`);
      setProducts((current) => [...current, ...result.products]);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
      setProductTotal(result.total);
    } catch (requestError) {
      if (requestError.status === 401) navigate("/admin/login");
      else setCatalogError(requestError.message);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const addProduct = async (event) => {
    event.preventDefault();
    const validation = productInputSchema.safeParse(form);
    if (!validation.success) {
      setFieldErrors(Object.fromEntries(validation.error.issues.map(({ path, message }) => [path[0], message])));
      setError("Please correct the highlighted fields before adding this product.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    setFieldErrors({});
    try {
      const { product } = await apiRequest("/admin/products", {
        method: "POST",
        body: JSON.stringify(validation.data),
      });
      setProducts((current) => [product, ...current]);
      setProductTotal((current) => current + 1);
      productListRef.current?.scrollTo(0);
      setForm(emptyProduct);
      setFieldErrors({});
      setNotice(`${product.name} was added to your store.`);
    } catch (requestError) {
      if (requestError.status === 401) navigate("/admin/login");
      else {
        setFieldErrors(Object.fromEntries(Object.entries(requestError.fieldErrors || {}).map(([field, messages]) => [field, Array.isArray(messages) ? messages[0] : messages])));
        setError(requestError.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
      navigate("/admin/login");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-top">
        <Brand />
        <div>
          <Link className="admin-link" to="/admin">Orders dashboard</Link>
          <button className="text-button" type="button" onClick={logout}>Sign out</button>
        </div>
      </header>
      <section className="admin-content product-admin-content">
        <div className="admin-intro">
          <div>
            <p className="eyebrow">Store management</p>
            <h1>Products, made fresh.</h1>
            <p className="product-intro-copy">Add a listing once and it appears in your customer store and checkout.</p>
          </div>
          <Link className="product-back-link" to="/admin">← Back to orders</Link>
        </div>

        {error && <div className="feedback error" role="alert">{error}</div>}
        {notice && <div className="feedback success" role="status">{notice}</div>}

        <div className="product-management-layout">
          <section className="product-editor" aria-labelledby="product-editor-title">
            <div className="product-editor-heading">
              <span className="product-editor-icon" aria-hidden="true">＋</span>
              <div>
                <p className="eyebrow">New listing</p>
                <h2 id="product-editor-title">Add a product</h2>
              </div>
            </div>
            <form className="product-form" noValidate onSubmit={addProduct}>
              <label className="product-form-field">
                <span>Product name</span>
                <input name="name" value={form.name} onChange={updateField} placeholder="e.g. Fresh Cow Milk" maxLength="80" required aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "product-name-error" : undefined} />
                {fieldErrors.name && <small className="product-field-error" id="product-name-error">{fieldErrors.name}</small>}
              </label>
              <div className="product-form-row product-form-row-category">
                <label className="product-form-field">
                  <span>Product type</span>
                  <input name="category" value={form.category} onChange={updateField} placeholder="e.g. milk" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength="40" required aria-invalid={Boolean(fieldErrors.category)} aria-describedby={fieldErrors.category ? "product-category-error" : undefined} />
                  {fieldErrors.category && <small className="product-field-error" id="product-category-error">{fieldErrors.category}</small>}
                </label>
              </div>
              <div className="product-form-row product-form-row-price">
                <label className="product-form-field">
                  <span>Price (₹)</span>
                  <input name="price" type="number" value={form.price} onChange={updateField} placeholder="55" min="0.01" max="1000000" step="0.01" required aria-invalid={Boolean(fieldErrors.price)} aria-describedby={fieldErrors.price ? "product-price-error" : undefined} />
                  {fieldErrors.price && <small className="product-field-error" id="product-price-error">{fieldErrors.price}</small>}
                </label>
                <label className="product-form-field">
                  <span>Pack size</span>
                  <input name="packSize" type="number" value={form.packSize} onChange={updateField} placeholder="e.g. 1" min="0.01" max="100000" step="0.01" required aria-invalid={Boolean(fieldErrors.packSize)} aria-describedby={fieldErrors.packSize ? "product-pack-size-error" : undefined} />
                  {fieldErrors.packSize && <small className="product-field-error" id="product-pack-size-error">{fieldErrors.packSize}</small>}
                </label>
                <label className="product-form-field">
                  <span>Unit</span>
                  <select name="unitType" value={form.unitType} onChange={updateField} required aria-invalid={Boolean(fieldErrors.unitType)} aria-describedby={fieldErrors.unitType ? "product-unit-type-error" : undefined}>
                    <option value="L">L</option>
                    <option value="KG">KG</option>
                    <option value="G">G</option>
                  </select>
                  {fieldErrors.unitType && <small className="product-field-error" id="product-unit-type-error">{fieldErrors.unitType}</small>}
                </label>
                <div className="product-form-field product-emoji-field" ref={emojiPickerRef}>
                  <span>Emoji</span>
                  <button
                    className={`emoji-picker-trigger${fieldErrors.emoji ? " has-error" : ""}`}
                    type="button"
                    aria-label={form.emoji ? `Selected emoji ${form.emoji}. Choose a different emoji.` : "Choose product emoji"}
                    aria-expanded={emojiPickerOpen}
                    aria-haspopup="dialog"
                    aria-invalid={Boolean(fieldErrors.emoji)}
                    aria-describedby={fieldErrors.emoji ? "product-emoji-error" : undefined}
                    onClick={() => setEmojiPickerOpen((open) => !open)}
                  >
                    <span className={form.emoji ? "emoji-picker-selection" : "emoji-picker-placeholder"}>{form.emoji || "Choose"}</span>
                    <span aria-hidden="true">⌄</span>
                  </button>
                  {fieldErrors.emoji && <small className="product-field-error" id="product-emoji-error">{fieldErrors.emoji}</small>}
                  {emojiPickerOpen && (
                    <div className="emoji-picker-popover" role="dialog" aria-label="Choose a product emoji">
                      <Suspense fallback={<div className="emoji-picker-loading">Loading emoji keyboard…</div>}>
                        <EmojiPicker
                          onEmojiClick={({ emoji }) => {
                            setForm((current) => ({ ...current, emoji }));
                            setFieldErrors((current) => ({ ...current, emoji: "" }));
                            setError("");
                            setEmojiPickerOpen(false);
                          }}
                          emojiStyle="native"
                          lazyLoadEmojis
                          searchPlaceHolder="Search all emojis"
                          previewConfig={{ showPreview: false }}
                          width={320}
                          height={380}
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              </div>
              <div className="generated-product-id">
                <span>Product ID · generated automatically</span>
                <code>{form.category && form.packSize ? `${form.category}-${String(Number(form.packSize)).replace(".", "-")}${form.unitType.toLowerCase()}` : "Set product type and pack size"}</code>
                <small>Product name is added automatically if this ID already exists.</small>
              </div>
              <label className="product-form-field">
                <span>Description</span>
                <textarea name="description" value={form.description} onChange={updateField} placeholder="A short description customers will see." maxLength="300" rows="3" required aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "product-description-error" : undefined} />
                <small>{form.description.length}/300 characters</small>
                {fieldErrors.description && <small className="product-field-error" id="product-description-error">{fieldErrors.description}</small>}
              </label>
              <button className="product-save-button" type="submit" disabled={saving}>
                {saving ? "Adding product..." : "Add product to store"}
                {!saving && <span aria-hidden="true">→</span>}
              </button>
            </form>
          </section>

          <section className="product-catalog" aria-labelledby="product-catalog-title">
            <div className="product-catalog-heading">
              <div>
                <p className="eyebrow">Your storefront</p>
                <h2 id="product-catalog-title">Product listings</h2>
              </div>
              {!loading && <span>{productTotal} products</span>}
            </div>
            {loading || catalogError && !products.length ? (
              <div className="product-catalog-empty">
                {loading ? "Loading products…" : catalogError}
                {!loading && <button className="catalog-retry-button" type="button" onClick={() => window.location.reload()}>Retry</button>}
              </div>
            ) : products.length ? (
              <div className="managed-product-list">
                <FixedSizeList
                  ref={productListRef}
                  className="managed-product-virtual-list"
                  height={550}
                  width="100%"
                  itemSize={76}
                  itemCount={products.length + (hasMore || loadingMore || Boolean(catalogError) ? 1 : 0)}
                  itemData={{ products, loadingMore, catalogError, onRetry: loadNextPage }}
                  itemKey={(index, data) => data.products[index]?.id || "next-product-page"}
                  onItemsRendered={({ visibleStopIndex }) => {
                    if (!catalogError && visibleStopIndex >= products.length - 3) loadNextPage();
                  }}
                >
                  {ProductListingRow}
                </FixedSizeList>
              </div>
            ) : (
              <div className="product-catalog-empty">No products have been added yet.</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
