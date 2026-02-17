import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const links = [
  { path: '/', label: 'Search' },
  { path: '/research', label: 'Research' },
  { path: '/tools', label: 'Tools' },
  { path: '/about', label: 'About' },
];

export function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || /^\/(sign|block|grapheme)\//.test(location.pathname);
    }
    return location.pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `no-underline text-sm font-medium transition-colors ${
      isActive(path) ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-8 max-md:px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-lg font-semibold text-gray-900 no-underline">
          Maya Database
        </Link>

        <div className="flex gap-8 max-md:hidden">
          {links.map(({ path, label }) => (
            <Link key={path} to={path} className={linkClass(path)}>{label}</Link>
          ))}
        </div>

        <button
          className="hidden max-md:flex items-center justify-center w-10 h-10 text-gray-500 hover:text-gray-900 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-8 py-4 flex flex-col gap-4">
          {links.map(({ path, label }) => (
            <Link key={path} to={path} className={linkClass(path)} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
