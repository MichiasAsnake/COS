"use client";
import { Icons } from "@/components/icons";
import { Spark } from "@/components/stripe-placeholder";
import type { ProjectSummary } from "@/types/projects";

const NAV_ITEMS = [
  { id: "home",      label: "Home",         icon: Icons.home, enabled: false },
  { id: "inbox",     label: "Inbox",        icon: Icons.inbox, enabled: false },
];
const WS_ITEMS = [
  { id: "projects",  label: "Projects",     icon: Icons.folder, enabled: true },
  { id: "agents",    label: "Agents",       icon: Icons.agents, enabled: false },
  { id: "templates", label: "Templates",    icon: Icons.tpl, enabled: false },
  { id: "brand",     label: "Brand Memory", icon: Icons.brain, enabled: false },
  { id: "kb",        label: "Knowledge Base", icon: Icons.book, enabled: false },
  { id: "analytics", label: "Analytics",   icon: Icons.bars, enabled: false },
];

interface SidebarProps {
  activeNav: string;
  onNav: (id: string) => void;
  activeProject: string;
  onProject: (id: string) => void;
  projects: ProjectSummary[];
  onNewProject: () => void;
  creatingProject?: boolean;
}

function projectLabel(project: ProjectSummary) {
  return project.name.replace(/^Project\s+/i, "");
}

export function Sidebar({ activeNav, onNav, activeProject, onProject, projects, onNewProject, creatingProject = false }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">COS</div>
        <div>
          <div className="brand-name">COS</div>
          <div className="brand-sub">Creative OS</div>
        </div>
      </div>

      <button className="new-project" onClick={onNewProject} disabled={creatingProject} type="button">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icons.plus width={14} height={14} />
          {creatingProject ? "Creating…" : "New Project"}
        </span>
        <span className="kbd">form</span>
      </button>

      <nav className="nav">
        {NAV_ITEMS.map((it) => (
          <button key={it.id} className="nav-item" data-active={activeNav === it.id ? "true" : "false"} onClick={() => it.enabled && onNav(it.id)} type="button" disabled={!it.enabled} title={it.id === "projects" ? "Open project index" : it.enabled ? it.label : `${it.label} is not enabled yet`}>
            <span className="ico"><it.icon width={16} height={16} /></span>
            {it.label}
            {!it.enabled && <span className="badge">Soon</span>}
          </button>
        ))}

        <div className="nav-section">Workspace</div>
        {WS_ITEMS.map((it) => (
          <button key={it.id} className="nav-item" data-active={activeNav === it.id ? "true" : "false"} onClick={() => it.enabled && onNav(it.id)} type="button" disabled={!it.enabled} title={it.id === "projects" ? "Open project index" : it.enabled ? it.label : `${it.label} is not enabled yet`}>
            <span className="ico"><it.icon width={16} height={16} /></span>
            {it.label}
            {!it.enabled && <span className="badge">Soon</span>}
          </button>
        ))}

        <div className="nav-section">Projects</div>
        {projects.length === 0 ? (
          <div style={{ padding: "8px 10px", color: "var(--fg-2)", fontSize: 12 }}>No projects yet</div>
        ) : projects.map((project) => (
          <button key={project.id} className="fav-item" data-active={activeProject === project.slug ? "true" : "false"} onClick={() => onProject(project.slug)} type="button">
            <span className="fav-dot" />
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectLabel(project)}</span>
          </button>
        ))}
      </nav>

      <div className="sys-card">
        <div className="sys-label">System Status</div>
        <div className="sys-row"><span className="sys-dot" />Backend connected</div>
        <div className="sys-row" style={{ color: "var(--fg-2)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
          {projects.length} active project{projects.length === 1 ? "" : "s"}
        </div>
        <Spark />
      </div>

      <div className="user-row">
        <div className="avatar">JA</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">Jori Andre</div>
          <div className="user-role">Creative Technologist</div>
        </div>
        <button className="icon-btn" title="Settings are not enabled yet" type="button" disabled><Icons.cog width={16} height={16} /></button>
      </div>
    </aside>
  );
}
