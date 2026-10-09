import { Navigate, Route, Routes } from "react-router-dom";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import AdminLogin from "./admin/AdminLogin.jsx";
import ProductManagement from "./admin/ProductManagement.jsx";
import SiteLayout from "./components/SiteLayout.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Storefront from "./components/Storefront.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Storefront />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/products" element={<ProductManagement />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
