import { Link, NavLink, Outlet } from "react-router-dom";
import Brand from "./Brand.jsx";

export default function SiteLayout() {
  return (
    <div className="site-shell">
      <header className="topbar">
        <Brand />
        <nav className="site-nav" aria-label="Main navigation">
          {/* <NavLink to="/">Shop</NavLink> */}
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>
        <a className="call-link" href="tel:8199932213">
          <span>Call today</span>
          <strong>81999 32213</strong>
        </a>
      </header>
      <Outlet />
      <footer className="site-footer">
        <Brand dark />
        <span>Fresh dairy for ordinary, beautiful days.</span>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/admin/login">Owner access</Link>
        </div>
      </footer>
    </div>
  );
}
