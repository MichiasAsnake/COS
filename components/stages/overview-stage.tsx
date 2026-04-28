"use client";
import { useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { StripePlaceholder, PlatformGlyphs } from "@/components/stripe-placeholder";
import { PipelineStepper } from "@/components/pipeline/pipeline-stepper";
import type { Stage } from "@/components/workspace";
import { jsonRecord, type OutputSummary, type ProjectSummary, type WorkflowStageSummary } from "@/types/projects";
import type { Json } from "@/types/database";

const OUT_FILTERS = [
  { id: "all",         label: "All" },
  { id: "territories", label: "Territories" },
  { id: "scripts",     label: "Scripts" },
  { id: "visuals",     label: "Visuals" },
  { id: "shots",       label: "Shot Lists" },
];

interface OverviewStageProps {
  project: ProjectSummary;
  stages: WorkflowStageSummary[];
  outputs: OutputSummary[];
  progress: number;
  statuses: Partial<Record<Stage, "done" | "active" | "pending">>;
  jump: (stage: Stage) => void;
  feedback: string[];
  ping: (msg: string) => void;
}

function asText(value: Json | undefined, fallback = "") {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function channelGlyphs(channels: string[]) {
  if (!channels.length) return ["A", "B", "D"];
  return channels.slice(0, 3).map((channel, index) => {
    const normalized = channel.toLowerCase();
    if (normalized.includes("tiktok")) return "A";
    if (normalized.includes("instagram") || normalized.includes("reels")) return "B";
    if (normalized.includes("youtube")) return "C";
    return ["A", "B", "D"][index] ?? "D";
  });
}

function outputTag(output: OutputSummary) {
  if (output.type === "territory") return "TERRITORY";
  if (output.type === "copy_system") return "SCRIPT";
  if (output.type === "visual_direction") return "VISUAL";
  if (output.type === "shot_list") return "SHOT LIST";
  if (output.type === "prompt_pack") return "PROMPT";
  if (output.type === "qa_review") return "REVIEW";
  if (output.type === "export_doc") return "EXPORT";
  return output.type.replace(/_/g, " ").toUpperCase();
}

function outputMatchesFilter(output: OutputSummary, filter: string) {
  if (filter === "all") return true;
  if (filter === "territories") return output.type === "territory";
  if (filter === "scripts") return output.type === "copy_system";
  if (filter === "visuals") return output.type === "visual_direction" || output.type === "prompt_pack";
  if (filter === "shots") return output.type === "shot_list";
  return true;
}

function activeStage(stages: WorkflowStageSummary[]): Exclude<Stage, "overview"> {
  return stages.find((stage) => stage.status === "in_progress" || stage.status === "needs_review")?.stage
    ?? stages.find((stage) => stage.status !== "complete")?.stage
    ?? "export";
}

export function OverviewStage({ project, stages, outputs, progress, statuses, jump, feedback, ping }: OverviewStageProps) {
  const [tab, setTab] = useState("overview");
  const [outFilter, setOutFilter] = useState("all");
  const [compare, setCompare] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState(0);

  const territories = useMemo(() => outputs
    .filter((output) => output.type === "territory")
    .map((output, index) => {
      const content = jsonRecord(output.content);
      return {
        id: output.id,
        title: output.title,
        blurb: feedback.includes("Less generic")
          ? asText(content.strategic_angle, asText(content.description, "No territory description yet."))
          : asText(content.description, asText(content.manifesto, "No territory description yet.")),
        stats: {
          Potential: asText(content.potential, output.status),
          Risk: asText(content.risk, "unknown"),
          Distinctiveness: asText(content.distinctiveness, "unknown"),
        },
        channels: Array.isArray(content.best_channels) ? content.best_channels.map((c) => asText(c)).filter(Boolean) : [],
        hue: 60 + index * 70,
      };
    }), [feedback, outputs]);

  const filtered = outputs.filter((output) => outputMatchesFilter(output, outFilter));
  const currentStage = activeStage(stages);
  const currentStageIndex = ["brief", "direction", "production", "review", "export"].indexOf(currentStage) + 1;

  const TAB_MAP: Record<string, Stage | null> = {
    "overview": null, "territories": "direction", "production-system": "production",
    "assets": "production", "feedback": "review", "exports": "export",
  };

  return (
    <div className="page stage-fade">
      <div className="project-head">
        <div className="thumb">
          <StripePlaceholder label={project.client_name ?? project.slug.toUpperCase()} hue={280} seed={project.slug.length} />
        </div>
        <div>
          <div className="proj-title-row">
            <div className="proj-title">{project.name}</div>
            <button className="proj-edit" title="Rename"><Icons.edit width={14} height={14} /></button>
          </div>
          <div className="proj-desc">{project.description ?? "No project description yet. Add a brief to start building this workspace."}</div>
          <div className="chips">
            <span className="chip"><span className="dot" />{project.client_name ?? "Client TBD"}</span>
            <span className="chip">Updated {formatDate(project.updated_at)}</span>
            <span className="chip">Status: {project.status}</span>
            <span className="chip">Slug: {project.slug}</span>
          </div>
        </div>
        <div className="progress-card">
          <div className="progress-row">
            <span className="progress-label">Project Progress</span>
            <span className="progress-val">{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">
            <span>STAGE {currentStageIndex} / 5</span>
            <span>· {currentStage.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        {["Overview", "Territories", "Production System", "Assets", "Feedback", "Exports"].map((t) => {
          const id = t.toLowerCase().replace(/\s+/g, "-");
          return (
            <button key={t} className="tab" data-active={tab === id ? "true" : "false"} onClick={() => {
              setTab(id);
              const dest = TAB_MAP[id];
              if (dest) jump(dest);
            }}>
              {t}
            </button>
          );
        })}
      </div>

      <div className="section">
        <PipelineStepper currentStage={currentStage} onJump={jump} statuses={statuses} />
      </div>

      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              Creative Territories{" "}
              <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {territories.length} generated
              </span>
            </div>
            <div className="section-sub">Loaded from persisted direction outputs for this project.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-1)" }}>
              Compare
              <button
                onClick={() => setCompare(!compare)}
                style={{ width: 32, height: 18, borderRadius: 999, background: compare ? "var(--accent)" : "var(--bg-3)", position: "relative", transition: "background .15s" }}
              >
                <span style={{ position: "absolute", top: 2, left: compare ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left .15s" }} />
              </button>
            </label>
            <button className="btn-icon"><Icons.chevL width={14} height={14} /></button>
            <button className="btn-icon"><Icons.chevR width={14} height={14} /></button>
          </div>
        </div>

        <div className="terr-grid">
          {territories.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", padding: 28, textAlign: "center", color: "var(--fg-2)", fontFamily: "var(--font-mono)", fontSize: 12, border: "1px dashed var(--line-soft)", borderRadius: "var(--r-md)" }}>
              No territories yet. Open Direction to generate creative territories.
            </div>
          ) : territories.map((t, i) => (
            <div key={t.id} className="terr-card" data-selected={selectedTerritory === i ? "true" : "false"}
              onClick={() => { setSelectedTerritory(i); ping(`Selected · ${t.title}`); }} role="button">
              <div className="terr-head">
                <div className="terr-title-row">
                  <span className="terr-num">0{i + 1}</span>
                  <div className="terr-title">{t.title}</div>
                </div>
                <button className="icon-btn" onClick={(e) => e.stopPropagation()}><Icons.bookmark width={15} height={15} /></button>
              </div>
              <div className="terr-blurb">{t.blurb}</div>
              <div className="terr-imgs">
                <div className="terr-img"><StripePlaceholder label="A" hue={t.hue} seed={i * 3 + 1} /></div>
                <div className="terr-img"><StripePlaceholder label="B" hue={t.hue + 20} seed={i * 3 + 2} /></div>
                <div className="terr-img"><StripePlaceholder label="C" hue={t.hue + 40} seed={i * 3 + 3} /></div>
              </div>
              <div className="terr-meta">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-2)" }}>Best for</span>
                <PlatformGlyphs which={channelGlyphs(t.channels)} />
              </div>
              <div className="terr-stats">
                {Object.entries(t.stats).map(([k, v]) => (
                  <div className="stat" key={k}>
                    <span className="stat-label">{k}</span>
                    <span className="stat-row"><span className="stat-dot" data-v={v} />{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div><div className="section-title">Recent Outputs</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="outputs-tabs">
              {OUT_FILTERS.map((f) => (
                <button key={f.id} className="otab" data-active={outFilter === f.id ? "true" : "false"} onClick={() => setOutFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            <button className="btn ghost sm" onClick={() => jump("production")}>View all outputs <Icons.arrowR width={12} height={12} /></button>
          </div>
        </div>

        <div className="outputs">
          {filtered.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", padding: 28, textAlign: "center", color: "var(--fg-2)", fontFamily: "var(--font-mono)", fontSize: 12, border: "1px dashed var(--line-soft)", borderRadius: "var(--r-md)" }}>
              No outputs of this type yet.
            </div>
          ) : filtered.map((o, i) => (
            <button key={o.id} className="out-card" onClick={() => ping(`Opening · ${o.title}`)}>
              <div className="out-thumb">
                <StripePlaceholder label="" hue={60 + i * 43} seed={i * 7 + 11} />
                <span className="out-tag">{outputTag(o)}</span>
              </div>
              <div className="out-body">
                <div className="out-name">{o.title}</div>
                <div className="out-meta"><span>{o.status}</span><span>{formatDate(o.updated_at)}</span></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
