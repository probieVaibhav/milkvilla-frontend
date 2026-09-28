import { Link } from "react-router-dom";

export default function Brand({ dark = false }) {
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
