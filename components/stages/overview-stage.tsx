"use client";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { StripePlaceholder, PlatformGlyphs } from "@/components/stripe-placeholder";
import { PipelineStepper } from "@/components/pipeline/pipeline-stepper";
import type { Stage } from "@/components/workspace";

const OUT_FILTERS = [
  { id: "all",         label: "All" },
  { id: "territories", label: "Territories" },
  { id: "scripts",     label: "Scripts" },
  { id: "visuals",     label: "Visuals" },
  { id: "shots",       label: "Shot Lists" },
];

const OUTPUTS = [
  { tag: "SCRIPT",    name: "UGC Hook Variations",  sub: "Quiet Utility",     time: "10:24 AM", hue: 60 },
  { tag: "VISUAL",    name: "Hero Concept v2",      sub: "Quiet Utility",     time: "10:24 AM", hue: 70 },
  { tag: "SHOT LIST", name: "Storyboard A",         sub: "Move With It",      time: "10:18 AM", hue: 280 },
  { tag: "VISUAL",    name: "Detail Shots",         sub: "Pocket, Perfected", time: "10:15 AM", hue: 200 },
  { tag: "SCRIPT",    name: "Hook Script 03",       sub: "Move With It",      time: "10:12 AM", hue: 290 },
];

interface OverviewStageProps {
  progress: number;
  statuses: Partial<Record<Stage, "done" | "active" | "pending">>;
  jump: (stage: Stage) => void;
  feedback: string[];
  ping: (msg: string) => void;
}

export function OverviewStage({ progress, statuses, jump, feedback, ping }: OverviewStageProps) {
  const [tab, setTab] = useState("overview");
  const [outFilter, setOutFilter] = useState("all");
  const [compare, setCompare] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState(0);

  const territories = [
    {
      title: "Quiet Utility",
      blurb: feedback.includes("Make it more premium")
        ? "Premium everyday object. Considered, durable, quietly luxurious."
        : "Elevate the everyday. Soft, tactile, organized.",
      stats: { Potential: "High", Risk: "Low", Distinctiveness: "High" },
      hue: 60,
    },
    {
      title: feedback.includes("More playful") ? "Move With It" : "Carry Your Calm",
      blurb: feedback.includes("More playful")
        ? "A bag that moves with your rhythm — and bounces, and laughs."
        : "A bag that moves with your rhythm, not against it.",
      stats: { Potential: "High", Risk: "Medium", Distinctiveness: "Medium" },
      hue: 280,
    },
    {
      title: "Pocket, Perfected",
      blurb: feedback.includes("Less generic")
        ? "The 47-pocket carry-all that solves the bag-rummage problem nobody admits to."
        : "Small bag. Big main character energy.",
      stats: { Potential: "Medium", Risk: "Low", Distinctiveness: "High" },
      hue: 200,
    },
  ];

  const filtered = outFilter === "all" ? OUTPUTS : OUTPUTS.filter((o) => {
    if (outFilter === "scripts")     return o.tag === "SCRIPT";
    if (outFilter === "visuals")     return o.tag === "VISUAL";
    if (outFilter === "shots")       return o.tag === "SHOT LIST";
    if (outFilter === "territories") return false;
    return true;
  });

  const TAB_MAP: Record<string, Stage | null> = {
    "overview": null, "territories": "direction", "production-system": "production",
    "assets": "production", "feedback": "review", "exports": "export",
  };

  return (
    <div className="page stage-fade">
      {/* Project header */}
      <div className="project-head">
        <div className="thumb">
          <StripePlaceholder label="HERO IMAGE" hue={280} seed={3} />
        </div>
        <div>
          <div className="proj-title-row">
            <div className="proj-title">Project Atlas — Q3 Launch</div>
            <button className="proj-edit" title="Rename"><Icons.edit width={14} height={14} /></button>
          </div>
          <div className="proj-desc">Reposition the flagship product line for a new generation. Functional honesty meets quiet personality.</div>
          <div className="chips">
            <span className="chip"><span className="dot" />Atlas Line</span>
            <span className="chip">May 22 → Jul 14</span>
            <span className="chip">Channels: A, B, D</span>
            <span className="chip">Owner: Jori A.</span>
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
            <span>STAGE 2 / 5</span>
            <span>· DIRECTION</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Pipeline */}
      <div className="section">
        <PipelineStepper currentStage="direction" onJump={jump} statuses={statuses} />
      </div>

      {/* Territories */}
      <div className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              Creative Territories{" "}
              <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                3 generated
              </span>
            </div>
            <div className="section-sub">Parallel directions. Pick one to commit, or compare.</div>
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
          {territories.map((t, i) => (
            <div key={i} className="terr-card" data-selected={selectedTerritory === i ? "true" : "false"}
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
                <PlatformGlyphs which={["A", "B", "D"]} />
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

      {/* Recent outputs */}
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
            <button className="btn ghost sm">View all outputs <Icons.arrowR width={12} height={12} /></button>
          </div>
        </div>

        <div className="outputs">
          {filtered.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", padding: 28, textAlign: "center", color: "var(--fg-2)", fontFamily: "var(--font-mono)", fontSize: 12, border: "1px dashed var(--line-soft)", borderRadius: "var(--r-md)" }}>
              No outputs of this type yet.
            </div>
          ) : filtered.map((o, i) => (
            <button key={i} className="out-card" onClick={() => ping(`Opening · ${o.name}`)}>
              <div className="out-thumb">
                <StripePlaceholder label="" hue={o.hue} seed={i * 7 + 11} />
                <span className="out-tag">{o.tag}</span>
              </div>
              <div className="out-body">
                <div className="out-name">{o.name}</div>
                <div className="out-meta"><span>{o.sub}</span><span>{o.time}</span></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
