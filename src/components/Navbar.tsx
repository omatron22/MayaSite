import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">Maya Database</Link>
      <div className="nav-links">
        <Link to="/">Search</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/about">About</Link>
      </div>
    </nav>
  );
}
