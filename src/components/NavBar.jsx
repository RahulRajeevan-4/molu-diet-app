import { Link, NavLink } from "react-router-dom";

export const NAV_ITEMS = [
  { to: "/fruits", label: "Fruit Table", description: "Browse nutrition data for fruits and vegetables." },
  { to: "/recipes", label: "Recipe Builder", description: "Build recipes and see their combined nutrition." },
  { to: "/quiz", label: "Quiz", description: "Test what you know about food nutrition." },
  { to: "/calculator", label: "Nutrition Calculator", description: "Calculate clinical nutrition requirements." },
];

export default function NavBar() {
  return (
    <nav className="nav-bar">
      <div className="nav-bar-inner">
        <Link to="/" className="nav-brand">Clinical Nutrition Reference</Link>
        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
