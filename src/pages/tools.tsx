import { NavLink, Outlet } from 'react-router-dom';

export function ToolsPage() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
      isActive ? 'text-gray-900 border-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'
    }`;

  return (
    <div className="bg-white">
      <div className="max-w-[1400px] mx-auto px-6 max-md:px-4">
        <div className="flex gap-1 border-b border-gray-200 pt-4">
          <NavLink to="/tools/scanner" className={linkClass}>Scanner</NavLink>
          <NavLink to="/tools/map" className={linkClass}>Map</NavLink>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
