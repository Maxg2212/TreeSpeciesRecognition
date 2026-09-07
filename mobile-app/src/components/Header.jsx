import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
  color: isActive ? "#2e7d32" : "#555",
  fontWeight: isActive ? "bold" : "normal",
  textDecoration: "none",
});

export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 1.5rem",
        borderBottom: "1px solid #ddd",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Tree Identifier</h1>
      <nav style={{ display: "flex", gap: "1rem" }}>
        <NavLink to="/" end style={linkStyle}>
          Home
        </NavLink>
        <NavLink to="/history" style={linkStyle}>
          History
        </NavLink>
        <NavLink to="/about" style={linkStyle}>
          About
        </NavLink>
      </nav>
    </header>
  );
}
