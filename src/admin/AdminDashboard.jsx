import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { VariableSizeList } from "react-window";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, apiUrl, downloadDatabaseBackup } from "../api.js";
import Brand from "../components/Brand.jsx";
import Pagination from "../components/Pagination.jsx";
import useAutoDismiss from "../hooks/useAutoDismiss.js";
import CancelOrderDialog from "./components/CancelOrderDialog.jsx";
import OrderCard from "./components/OrderCard.jsx";
import StatusSummary from "./components/StatusSummary.jsx";

const outOfStockReason = "Canceled because one or more items are not in stock.";
const emptyFilters = { dateFrom: "", dateTo: "", category: "", distance: "", sortDate: "newest" };

function OrderListRow({ index, style, data }) {
  const order = data.orders[index];
  const cardRef = useRef(null);
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      data.onRowResize(order.id, index, Math.ceil(entry.contentRect.height) + 16);
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [data.onRowResize, index, order.id]);
  return (
    <div style={style} className="order-virtual-row">
      <div ref={cardRef}>
        <OrderCard order={order} onStatusChange={data.onStatusChange} statusUpdating={data.updatingOrderIds.has(order.id)} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const orderListRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [orders, setOrders] = useState([]);
  const [orderHeights, setOrderHeights] = useState({});
  const [counts, setCounts] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [activeStatus, setActiveStatus] = useState("all");
  const [filterDraft, setFilterDraft] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [updatingOrderIds, setUpdatingOrderIds] = useState(() => new Set());
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  useAutoDismiss(error, setError);
  useAutoDismiss(notificationNotice, setNotificationNotice);
  const load = (requestedPage = page, signal) => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(requestedPage), limit: String(pagination.limit), sortDate: appliedFilters.sortDate });
    if (activeStatus !== "all") query.set("status", activeStatus);
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value && key !== "sortDate") query.set(key, value);
    });
    return apiRequest(`/orders?${query}`, { signal })
      .then((data) => {
        setOrders(data.orders);
        setPagination(data.pagination);
        setPage(data.pagination.page);
        setCounts(["pending", "placed", "out-for-delivery", "delivered", "canceled"].map((status) => ({ status, count: data.counts[status] || 0 })));
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
  }, [page, activeStatus, appliedFilters]);
  useEffect(() => {
    apiRequest("/products/categories")
      .then(({ categories }) => setProductCategories(categories))
      .catch((requestError) => setError(requestError.message));
  }, []);
  useEffect(() => {
    const events = new EventSource(`${apiUrl}/admin/order-events`, { withCredentials: true });
    const refreshOrders = () => load(page);
    events.onopen = refreshOrders;
    events.addEventListener("order-created", refreshOrders);
    return () => events.close();
  }, [page, activeStatus, appliedFilters]);
  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);
  const selectStatus = (status) => {
    setActiveStatus(status);
    setPage(1);
  };
  const setFilterValue = (event) => {
    const { name, value } = event.target;
    setFilterDraft((current) => ({ ...current, [name]: value }));
  };
  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filterDraft });
  };
  const clearFilters = () => {
    setFilterDraft({ ...emptyFilters });
    setAppliedFilters({ ...emptyFilters });
    setActiveStatus("all");
    setPage(1);
  };
  const update = async (id, status, cancellationReason) => {
    setUpdatingOrderIds((current) => new Set(current).add(id));
    try {
      const result = await apiRequest(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status, cancellationReason }) });
      setNotificationNotice(result.notification?.warning ? `Email not sent: ${result.notification.warning}` : result.notification?.skipped ? "Order status was unchanged; no email was sent." : "Customer status email sent.");
      load(page);
      return true;
    } catch (err) {
      setNotificationNotice("");
      setError(err.message);
      return false;
    } finally {
      setUpdatingOrderIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };
  const handleStatusChange = (id, selectedStatus) => {
    if (selectedStatus === "cancel") {
      setCancelOrderId(id);
      return;
    }
    if (selectedStatus === "not-in-stock") {
      update(id, "canceled", outOfStockReason);
      return;
    }
    update(id, selectedStatus);
  };
  const handleOrderRowResize = useCallback((id, index, height) => {
    setOrderHeights((current) => {
      if (current[id] === height) return current;
      return { ...current, [id]: height };
    });
    orderListRef.current?.resetAfterIndex(index);
  }, []);
  const confirmCancellation = async (reason) => {
    if (await update(cancelOrderId, "canceled", reason)) setCancelOrderId(null);
  };
  const logout = async () => {
    await apiRequest("/auth/logout", { method: "POST" });
    navigate("/admin/login");
  };
  const downloadBackup = async () => {
    if (!window.confirm("The backup contains customer and order data. Only download it to a trusted device and store it securely. Continue?")) return;
    setDownloadingBackup(true);
    try {
      await downloadDatabaseBackup();
      setNotificationNotice("Database backup downloaded. Store it securely.");
    } catch (err) {
      if (err.status === 401) navigate("/admin/login");
      else setError(err.message);
    } finally {
      setDownloadingBackup(false);
    }
  };
  return (
    <main className="admin-page">
      <header className="admin-top">
        <Brand />
        <div>
          <Link className="admin-link" to="/admin/products">
            Manage products
          </Link>
          <button className="text-button" onClick={downloadBackup} disabled={downloadingBackup}>
            {downloadingBackup ? "Preparing backup..." : "Download backup"}
          </button>
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
        <StatusSummary counts={counts} total={counts.reduce((sum, { count }) => sum + count, 0)} activeStatus={activeStatus} onSelectStatus={selectStatus} />
        {error && <div className="feedback error">{error}</div>}
        {notificationNotice && (
          <div className={`feedback ${notificationNotice.startsWith("Email not sent") ? "error" : ""}`} aria-live="polite">
            {notificationNotice}
          </div>
        )}
        <section className="order-filters" aria-labelledby="order-filters-title">
          <div className="order-filters-heading">
            <div>
              <p className="eyebrow">Find what you need</p>
              <h2 id="order-filters-title">Filter &amp; sort orders</h2>
            </div>
            <span>Filters are applied to all matching orders</span>
          </div>
          <form className="order-filter-form" onSubmit={applyFilters}>
            <label className="filter-field">
              <span>From date</span>
              <input type="date" name="dateFrom" value={filterDraft.dateFrom} onChange={setFilterValue} max={filterDraft.dateTo || undefined} />
            </label>
            <label className="filter-field">
              <span>To date</span>
              <input type="date" name="dateTo" value={filterDraft.dateTo} onChange={setFilterValue} min={filterDraft.dateFrom || undefined} />
            </label>
            <label className="filter-field">
              <span>Product type</span>
              <select name="category" value={filterDraft.category} onChange={setFilterValue}>
                <option value="">All product types</option>
                {productCategories.map((category) => (
                  <option value={category} key={category}>
                    {category.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Delivery distance</span>
              <select name="distance" value={filterDraft.distance} onChange={setFilterValue}>
                <option value="">Any distance</option>
                <option value="1-10">1–10 km</option>
                <option value="10-20">10–20 km</option>
                <option value="20-50">20–50 km</option>
                <option value="50+">50+ km</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Order date</span>
              <select name="sortDate" value={filterDraft.sortDate} onChange={setFilterValue}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <div className="filter-actions">
              <button className="filter-apply" type="submit">
                Apply filters <span aria-hidden="true">→</span>
              </button>
              <button className="filter-clear" type="button" onClick={clearFilters}>
                Clear all
              </button>
            </div>
          </form>
        </section>
        {loading ? (
          <div className="empty-admin">Loading orders...</div>
        ) : !orders.length ? (
          <div className="empty-admin">{activeStatus === "all" ? "No orders yet. Your next one will appear here." : `No ${activeStatus.replaceAll("-", " ")} orders right now.`}</div>
        ) : (
          <VariableSizeList
            ref={orderListRef}
            className="orders-list"
            height={(viewportWidth <= 560 ? 460 : viewportWidth <= 900 ? 380 : 230) * 2}
            itemCount={orders.length}
            itemData={{ orders, onStatusChange: handleStatusChange, updatingOrderIds, onRowResize: handleOrderRowResize }}
            itemKey={(index, data) => data.orders[index].id}
            itemSize={(index) => orderHeights[orders[index].id] ?? (viewportWidth <= 560 ? 460 : viewportWidth <= 900 ? 380 : 230)}
            width="100%"
          >
            {OrderListRow}
          </VariableSizeList>
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
      {cancelOrderId && <CancelOrderDialog onCancel={() => setCancelOrderId(null)} onConfirm={confirmCancellation} />}
    </main>
  );
}
