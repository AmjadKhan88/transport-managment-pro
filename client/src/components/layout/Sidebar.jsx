import { NavLink } from "react-router-dom";
import { navigation, getModuleFromPath } from "@/config/navigation";
import { NavIcon } from "./icons";
import { useAuth } from "@/hooks/useAuth";
import { useVehicleSummary } from "@/hooks/useVehicleSummary";

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] ${isActive
          ? " bg-green-600 font-semibold text-white shadow-lg shadow-emerald-600/25"
          : "font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <NavIcon
            name={item.icon}
            className={`h-[18px] w-[18px] ${isActive ? "" : "text-slate-400 transition group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
              }`}
          />
          <span>{item.label}</span>
          {item.badge && (
            <span
              className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isActive
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
            >
              {item.badge}
            </span>
          )}
          {item.dot && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {

  const { can } = useAuth();
  const { data: vehicleSummary } = useVehicleSummary(can("vehicles", "view"));

  const visibleNav = navigation
    .map((s) => ({
      ...s,
      items: s.items
        .filter((i) => can(getModuleFromPath(i.path), "view"))
        .map((i) =>
          i.path === "/vehicles" && vehicleSummary ? { ...i, badge: String(vehicleSummary.total) } : i
        ),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-700 shadow-lg shadow-emerald-600/25">
          <svg
            className="h-5 w-5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7h11v9H3z" />
            <path d="M14 10h4l3 3v3h-7z" />
            <circle cx="7" cy="18" r="1.8" />
            <circle cx="17" cy="18" r="1.8" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
            Geo Shalmani
          </p>
          <p className="truncate text-[11px] font-medium text-emerald-800 dark:text-emerald-400">
            Transport &amp; Business
          </p>
        </div>
      </div>

      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />

      {/* Nav */}
      <nav className="nav-scroll flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {visibleNav.map((section) => (
          <div key={section.group}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {section.group}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.path} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200/70 p-3 dark:border-slate-800">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-3.5 ring-1 ring-emerald-100 dark:from-emerald-500/10 dark:to-green-500/5 dark:ring-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <p className="text-[11px] font-bold text-green-800 dark:text-emerald-300">Auto Backup Active</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-green-700/70 dark:text-emerald-400/70">
            Last backup: Today, 09:42 AM
          </p>
        </div>
      </div>
    </>
  );
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-[266px] shrink-0 flex-col border-r border-slate-200/70 bg-white/85 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen dark:border-slate-800 dark:bg-slate-900/80">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"
            }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[266px] flex-col border-r border-slate-200/70 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 ${open ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <SidebarContent onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}