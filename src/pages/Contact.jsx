import { Link } from "react-router-dom";

export default function Contact() {
  return (
    <main className="content-page contact-page">
      <section className="contact-intro">
        <p className="eyebrow">We’re here to help</p>
        <h1>Contact Milk Villa</h1>
        <p>Questions about an order or delivery? Call us and we’ll help you get it sorted.</p>
      </section>
      <section className="contact-details" aria-label="Contact details">
        <div className="contact-detail">
          <span className="eyebrow">Call us</span>
          <a className="contact-phone" href="tel:8199932213">
            81999 32213
          </a>
          <p>For order and delivery questions.</p>
        </div>
        <div className="contact-detail">
          <span className="eyebrow">Delivery</span>
          <strong>Local routes, clear pricing</strong>
          <p>Delivery is free within 10 km and ₹40 beyond. Orders are paid on delivery.</p>
        </div>
      </section>
      <section className="contact-next">
        <p className="eyebrow">Ready when you are</p>
        <h2>Need something fresh?</h2>
        <Link className="button button-dark" to="/#products">
          Browse products <span>↘</span>
        </Link>
      </section>
    </main>
  );
}
