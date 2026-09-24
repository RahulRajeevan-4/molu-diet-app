import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="nav-bar">
      <div className="nav-bar-inner">
        <span className="nav-brand">Clinical Nutrition Reference</span>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            Fruit Table
          </NavLink>
          <NavLink to="/recipes" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            Recipe Builder
          </NavLink>
          <NavLink to="/quiz" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            Quiz
          </NavLink>
          <NavLink to="/calculator" className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
            Nutrition Calculator
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
