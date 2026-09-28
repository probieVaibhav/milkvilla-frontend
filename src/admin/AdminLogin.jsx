import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api.js";
import Brand from "../components/Brand.jsx";
import useAutoDismiss from "../hooks/useAutoDismiss.js";

export default function AdminLogin() {
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
          <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
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
