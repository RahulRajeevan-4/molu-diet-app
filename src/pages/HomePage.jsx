import { Link } from "react-router-dom";
import { NAV_ITEMS } from "../components/NavBar.jsx";

export default function HomePage() {
  return (
    <div className="wrap">
      <div className="home-grid">
        {NAV_ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className="home-card">
            <h2 className="home-card-title">{item.label}</h2>
            <p className="home-card-desc">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
