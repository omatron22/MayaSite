import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { path: '/search', label: 'Search' },
  { path: '/scanner', label: 'Scanner' },
  { path: '/collections', label: 'Collections' },
  { path: '/about', label: 'About' },
];

export function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/search') {
      return location.pathname === '/search' || /^\/(sign|block|grapheme|entry)\//.test(location.pathname);
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="max-w-[80ch] mx-auto px-4 pt-6">
      {/* Desktop */}
      <div className="max-md:hidden">
        <table className="w-auto mb-4">
          <tbody>
            <tr>
              <td className="px-4 py-3" colSpan={links.length}>
                <Link to="/" className="no-underline">
                  <h1 className="text-2xl m-0 leading-tight">Maya Database</h1>
                </Link>
                <span className="text-xs">A unified hieroglyphic research interface</span>
              </td>
            </tr>
            <tr>
              {links.map(({ path, label }) => (
                <td key={path} className="px-4 py-2 text-sm">
                  <Link
                    to={path}
                    className={`no-underline ${isActive(path) ? 'font-[800]' : ''}`}
                  >
                    {isActive(path) ? `[${label}]` : label}
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="hidden max-md:block">
        <table className="w-full mb-4">
          <tbody>
            <tr>
              <td className="px-4 py-3">
                <Link to="/" className="font-[800] uppercase tracking-wider no-underline text-lg">
                  Maya Database
                </Link>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  className="cursor-pointer font-[600] uppercase text-xs"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Toggle menu"
                >
                  {menuOpen ? '[Close]' : 'Menu'}
                </button>
              </td>
            </tr>
            {menuOpen && links.map(({ path, label }) => (
              <tr key={path}>
                <td className="px-4 py-1" colSpan={2}>
                  <Link
                    to={path}
                    className={`no-underline ${isActive(path) ? 'font-[800]' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {isActive(path) ? `[${label}]` : label}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </nav>
  );
}
