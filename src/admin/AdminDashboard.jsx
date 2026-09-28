import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, apiUrl } from "../api.js";
import Brand from "../components/Brand.jsx";
import Pagination from "../components/Pagination.jsx";
import useAutoDismiss from "../hooks/useAutoDismiss.js";
import CancelOrderDialog from "./components/CancelOrderDialog.jsx";
import OrderCard from "./components/OrderCard.jsx";
import StatusSummary from "./components/StatusSummary.jsx";

const outOfStockReason = "Canceled because one or more items are not in stock.";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  const [cancelOrderId, setCancelOrderId] = useState(null);
  useAutoDismiss(error, setError);
  useAutoDismiss(notificationNotice, setNotificationNotice);
  const load = (requestedPage = page, signal) => {
    setLoading(true);
    return apiRequest(`/orders?page=${requestedPage}&limit=${pagination.limit}`, { signal })
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
  }, [page]);
  useEffect(() => {
    const events = new EventSource(`${apiUrl}/admin/order-events`, { withCredentials: true });
    const refreshOrders = () => load(page);
    events.onopen = refreshOrders;
    events.addEventListener("order-created", refreshOrders);
    return () => events.close();
  }, [page]);
  const update = async (id, status, cancellationReason) => {
    try {
      const result = await apiRequest(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status, cancellationReason }) });
      setNotificationNotice(result.notification?.warning ? `Email not sent: ${result.notification.warning}` : result.notification?.skipped ? "Order status was unchanged; no email was sent." : "Customer status email sent.");
      load(page);
      return true;
    } catch (err) {
      setNotificationNotice("");
      setError(err.message);
      return false;
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
  const confirmCancellation = async (reason) => {
    if (await update(cancelOrderId, "canceled", reason)) setCancelOrderId(null);
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
        <StatusSummary counts={counts} />
        {error && <div className="feedback error">{error}</div>}
        {notificationNotice && (
          <div className={`feedback ${notificationNotice.startsWith("Email not sent") ? "error" : ""}`} aria-live="polite">
            {notificationNotice}
          </div>
        )}
        {loading ? (
          <div className="empty-admin">Loading orders...</div>
        ) : !orders.length ? (
          <div className="empty-admin">No orders yet. Your next one will appear here.</div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
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
      {cancelOrderId && <CancelOrderDialog onCancel={() => setCancelOrderId(null)} onConfirm={confirmCancellation} />}
    </main>
  );
}
