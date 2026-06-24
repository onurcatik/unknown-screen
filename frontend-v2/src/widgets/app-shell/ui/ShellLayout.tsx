import { NavLink, Outlet } from "react-router-dom";
import { env } from "@shared/config";
import { cn } from "@shared/lib";
import { Badge, ConnectionStatusBadge } from "@shared/ui";

const navigation = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/create", label: "Create" },
  { to: "/renders", label: "Renders" },
  { to: "/settings", label: "Settings" },
] as const;

export function ShellLayout() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <span className="brand-mark">US</span>
          <div>
            <strong>{env.appName}</strong>
            <span>Frontend V2 studio shell</span>
          </div>
        </div>

        <nav className="nav-list">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn("nav-link", isActive && "nav-link-active")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div>
            <Badge tone="accent">Backend contract locked</Badge>
            <ConnectionStatusBadge />
          </div>
          <NavLink to="/create" className="primary-link">
            Create scene plan
          </NavLink>
        </header>

        <section className="page-frame">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
