import banner from "../assets/banner.jpeg";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <main className="content-page about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <p className="eyebrow">A little closer to home</p>
          <h1>Good dairy, made part of the everyday.</h1>
          <p>Milk Villa brings fresh dairy favourites to nearby homes, with straightforward ordering and care from preparation to delivery.</p>
          <Link className="button button-dark" to="/#products">
            Explore the dairy <span>↘</span>
          </Link>
        </div>
        <img src={banner} alt="Milk Villa dairy banner" />
      </section>
      <section className="about-story">
        <p className="eyebrow">Our approach</p>
        <h2>Simple things, handled with care.</h2>
        <p>We believe daily essentials should feel dependable. Our focus is fresh dairy, clear product information, and a local delivery experience that makes ordering easy.</p>
      </section>
      <section className="promise about-values" aria-label="Milk Villa service values">
        <div>
          <b>01</b>
          <strong>Prepared fresh</strong>
          <span>Careful preparation for everyday tables.</span>
        </div>
        <div>
          <b>02</b>
          <strong>Nearby delivery</strong>
          <span>Delivery charges are based on your distance.</span>
        </div>
        <div>
          <b>03</b>
          <strong>Made straightforward</strong>
          <span>Order online and pay on delivery.</span>
        </div>
      </section>
    </main>
  );
}
