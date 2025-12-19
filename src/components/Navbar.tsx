import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

export function Navbar() {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          Maya Database
        </Link>
        
        <div className="navbar-links">
          <Link 
            to="/" 
            className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Search
          </Link>
          <Link 
            to="/analytics" 
            className={`navbar-link ${location.pathname === '/analytics' ? 'active' : ''}`}
          >
            Analytics
          </Link>
          <Link 
            to="/stats" 
            className={`navbar-link ${location.pathname === '/stats' ? 'active' : ''}`}
          >
            Statistics
          </Link>
          <Link 
            to="/about" 
            className={`navbar-link ${location.pathname === '/about' ? 'active' : ''}`}
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}
