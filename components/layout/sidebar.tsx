"use client";
import { Icons } from "@/components/icons";
import { Spark } from "@/components/stripe-placeholder";

const NAV_ITEMS = [
  { id: "home",      label: "Home",         icon: Icons.home },
  { id: "inbox",     label: "Inbox",        icon: Icons.inbox, badge: "7" },
];
const WS_ITEMS = [
  { id: "projects",  label: "Projects",     icon: Icons.folder },
  { id: "agents",    label: "Agents",       icon: Icons.agents },
  { id: "templates", label: "Templates",    icon: Icons.tpl },
  { id: "brand",     label: "Brand Memory", icon: Icons.brain },
  { id: "kb",        label: "Knowledge Base", icon: Icons.book },
  { id: "analytics", label: "Analytics",   icon: Icons.bars },
];
const FAVORITES = [
  { id: "atlas", label: "Project Atlas" },
  { id: "north", label: "Northwind Refresh" },
  { id: "halo",  label: "Halo · Q3 Brand" },
];

interface SidebarProps {
  activeNav: string;
  onNav: (id: string) => void;
  activeProject: string;
  onProject: (id: string) => void;
}

export function Sidebar({ activeNav, onNav, activeProject, onProject }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">COS</div>
        <div>
          <div className="brand-name">COS</div>
          <div className="brand-sub">Creative OS</div>
        </div>
      </div>

      <button className="new-project">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icons.plus width={14} height={14} />
          New Project
        </span>
        <span className="kbd">⌘ N</span>
      </button>

      <nav className="nav">
        {NAV_ITEMS.map((it) => (
          <button key={it.id} className="nav-item" data-active={activeNav === it.id ? "true" : "false"} onClick={() => onNav(it.id)}>
            <span className="ico"><it.icon width={16} height={16} /></span>
            {it.label}
            {it.badge && <span className="badge">{it.badge}</span>}
          </button>
        ))}

        <div className="nav-section">Workspace</div>
        {WS_ITEMS.map((it) => (
          <button key={it.id} className="nav-item" data-active={activeNav === it.id ? "true" : "false"} onClick={() => onNav(it.id)}>
            <span className="ico"><it.icon width={16} height={16} /></span>
            {it.label}
          </button>
        ))}

        <div className="nav-section">Favorites</div>
        {FAVORITES.map((f) => (
          <button key={f.id} className="fav-item" data-active={activeProject === f.id ? "true" : "false"} onClick={() => onProject(f.id)}>
            <span className="fav-dot" />
            {f.label}
          </button>
        ))}
      </nav>

      <div className="sys-card">
        <div className="sys-label">System Status</div>
        <div className="sys-row"><span className="sys-dot" />All systems operational</div>
        <div className="sys-row" style={{ color: "var(--fg-2)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
          12 agents online
        </div>
        <Spark />
      </div>

      <div className="user-row">
        <div className="avatar">JA</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">Jori Andre</div>
          <div className="user-role">Creative Technologist</div>
        </div>
        <button className="icon-btn" title="Settings"><Icons.cog width={16} height={16} /></button>
      </div>
    </aside>
  );
}
