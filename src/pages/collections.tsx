import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { path: '/collections/kerr', label: 'Kerr Vases' },
  { path: '/collections/cmhi', label: 'CMHI' },
];

export function CollectionsPage() {
  return (
    <div>
      <div className="max-w-[80ch] mx-auto px-4 pt-4">
        <table className="w-auto">
          <tbody>
            <tr>
              {tabs.map(({ path, label }) => (
                <td key={path} className="px-3 py-1">
                  <NavLink
                    to={path}
                    className="no-underline text-sm"
                  >
                    {({ isActive }) => isActive ? <strong>[{label}]</strong> : <span>{label}</span>}
                  </NavLink>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <Outlet />
    </div>
  );
}
