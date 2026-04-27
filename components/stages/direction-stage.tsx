"use client";
import { useEffect, useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { StripePlaceholder } from "@/components/stripe-placeholder";
import { PipelineStepper } from "@/components/pipeline/pipeline-stepper";
import type { Stage } from "@/components/workspace";
import type { Territory } from "@/lib/agents/schemas";

interface DirectionStageProps {
  projectSlug: string;
  jump: (stage: Stage) => void;
  ping: (msg: string) => void;
  feedback: string[];
}

type TerritoryOutput = {
  id: string;
  title: string;
  content: Territory;
  status?: "draft" | "selected" | "approved" | "archived";
};

type DirectionWorkspace = {
  project?: { selected_territory_id?: string | null };
  territories?: TerritoryOutput[];
  outputs?: TerritoryOutput[];
};

const sampleTerritories: TerritoryOutput[] = [
  {
    id: "sample-quiet-utility",
    title: "Quiet Utility",
    status: "draft",
    content: {
      name: "Quiet Utility",
      description: "Elevate the everyday. Soft, tactile, organized.",
      strategic_angle: "Make usefulness feel desirable without over-selling the lifestyle around it.",
      visual_language: "Warm neutrals, tight product details, intentional negative space, hands in real moments.",
      tone: "Considered, restrained, quietly premium.",
      manifesto: "Atlas is what happens when the everyday gets serious about itself. We don't sell the lifestyle around the product — we sell the product, and let the lifestyle take care of itself.",
      best_channels: ["TikTok", "Meta", "Retail PDP"],
      potential: "high",
      risk: "low",
      distinctiveness: "high",
    },
  },
  {
    id: "sample-move-with-it",
    title: "Carry Your Calm",
    status: "draft",
    content: {
      name: "Carry Your Calm",
      description: "A bag that moves with your rhythm, not against it.",
      strategic_angle: "Position organization as a calm companion for people in motion.",
      visual_language: "Walking shots, transit texture, rhythmic edits, soft motion blur.",
      tone: "Reassuring, kinetic, lightly playful.",
      manifesto: "Movement isn't a feature — it's the whole point. We show people in motion, and the bag becoming part of the motion, not fighting it.",
      best_channels: ["TikTok", "Reels"],
      potential: "high",
      risk: "medium",
      distinctiveness: "medium",
    },
  },
  {
    id: "sample-pocket-perfected",
    title: "Pocket, Perfected",
    status: "draft",
    content: {
      name: "Pocket, Perfected",
      description: "Small bag. Big main character energy.",
      strategic_angle: "Turn internal organization into the hero and the reason to believe.",
      visual_language: "Exploded pocket layouts, satisfying reveals, labeled systems, before/after rummage cuts.",
      tone: "Specific, clever, product-obsessed.",
      manifesto: "We obsess over the inside. Every pocket has a job, every job has a name. The bag becomes a system you can rely on — and brag about.",
      best_channels: ["TikTok", "PDP", "Paid social"],
      potential: "medium",
      risk: "low",
      distinctiveness: "high",
    },
  },
];

function normalizeTerritories(payload: DirectionWorkspace): TerritoryOutput[] {
  const territories = payload.territories ?? payload.outputs ?? [];
  return territories
    .filter((output): output is TerritoryOutput => Boolean(output?.id && output?.content?.name))
    .map((output) => ({
      id: output.id,
      title: output.title || output.content.name,
      content: output.content,
      status: output.status ?? "draft",
    }));
}

export function DirectionStage({ projectSlug, jump, ping, feedback }: DirectionStageProps) {
  const [selected, setSelected] = useState(0);
  const [territories, setTerritories] = useState<TerritoryOutput[]>(sampleTerritories);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPersistedTerritories() {
      try {
        const response = await fetch(`/api/projects/${projectSlug}/territories`, { cache: "no-store" });
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not load saved territories.");
        const payload = await response.json() as DirectionWorkspace;
        const saved = normalizeTerritories(payload);
        if (!active) return;

        if (saved.length > 0) {
          setTerritories(saved);
          const persistedSelected = payload.project?.selected_territory_id ?? saved.find((territory) => territory.status === "selected")?.id ?? null;
          setSelectedTerritoryId(persistedSelected);
          const selectedIndex = persistedSelected ? saved.findIndex((territory) => territory.id === persistedSelected) : 0;
          setSelected(selectedIndex >= 0 ? selectedIndex : 0);
        }
        setError(null);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load saved territories. Showing sample territory cards.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPersistedTerritories();

    return () => {
      active = false;
    };
  }, [projectSlug]);

  const generatedFromBackend = useMemo(() => territories.some((territory) => !territory.id.startsWith("sample-")), [territories]);
  const feedbackPrompt = feedback.length ? `Active feedback lens: ${feedback.join(" · ")}.` : "Generate real territories, select one, then unlock Production.";
  const t = territories[selected] ?? territories[0];

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/territories`, { method: "POST" });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not generate territories.");
      const payload = await response.json() as DirectionWorkspace;
      const generated = normalizeTerritories(payload);
      if (!generated.length) throw new Error("Creative Director returned no territories.");
      setTerritories(generated);
      setSelected(0);
      setSelectedTerritoryId(null);
      ping(`Generated ${generated.length} territories`);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Could not generate territories.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSelect = async () => {
    if (!t) return;
    if (t.id.startsWith("sample-")) {
      setError("Generate real territories before committing a direction.");
      return;
    }

    setSelecting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/territories`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ territoryId: t.id }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not select territory.");
      setSelectedTerritoryId(t.id);
      setTerritories((current) => current.map((territory) => ({ ...territory, status: territory.id === t.id ? "selected" : "draft" })));
      ping(`Selected · ${t.title}`);
      jump("production");
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Could not select territory.");
    } finally {
      setSelecting(false);
    }
  };

  if (!t) return null;

  return (
    <div className="page stage-fade">
      <div className="stage-hero">
        <div>
          <div className="stage-eyebrow">Stage 02 · Direction</div>
          <div className="stage-title">Three parallel paths. Pick one — or compare.</div>
          <div className="stage-desc">Creative Director turns the saved brief intelligence into strategic territories. {feedbackPrompt}</div>
        </div>
        <div className="next-action">
          <span className="next-label">Recommended next</span>
          <button className="btn primary" onClick={handleSelect} disabled={selecting || loading || !generatedFromBackend}>
            {selecting ? "Committing…" : `Commit “${t.title}” → Production`} <Icons.arrowR width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div>
            <h3>Creative Director Agent</h3>
            <div className="brief-meta">{loading ? "Loading persisted territories" : generatedFromBackend ? "Saved territory outputs" : "Sample territory preview"}</div>
          </div>
          <button className="btn sm" onClick={handleGenerate} disabled={generating || loading}>
            <Icons.refresh width={12} height={12} /> {generating ? "Generating…" : generatedFromBackend ? "Regenerate territories" : "Generate territories"}
          </button>
        </div>
        {error && <div className="brief-error">{error}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        {territories.map((territory, i) => {
          const selectedCard = selected === i;
          const committed = selectedTerritoryId === territory.id || territory.status === "selected";
          return (
            <div key={territory.id} className="terr-card" data-selected={selectedCard ? "true" : "false"}
              onClick={() => { setSelected(i); ping(`Selected · ${territory.title}`); }} role="button" tabIndex={0}>
              <div className="terr-head">
                <div className="terr-title-row">
                  <span className="terr-num">0{i + 1}</span>
                  <div className="terr-title">{territory.title}</div>
                </div>
                <button className="icon-btn" onClick={(e) => e.stopPropagation()} aria-label="Bookmark territory">
                  {committed ? <Icons.check width={15} height={15} /> : <Icons.bookmark width={15} height={15} />}
                </button>
              </div>
              <div className="terr-blurb">{territory.content.description}</div>
              <div className="terr-imgs">
                <div className="terr-img"><StripePlaceholder hue={60 + i * 80} seed={i * 3 + 1} /></div>
                <div className="terr-img"><StripePlaceholder hue={80 + i * 80} seed={i * 3 + 2} /></div>
                <div className="terr-img"><StripePlaceholder hue={100 + i * 80} seed={i * 3 + 3} /></div>
              </div>
              <div className="terr-stats">
                {Object.entries({ Potential: territory.content.potential, Risk: territory.content.risk, Distinctiveness: territory.content.distinctiveness }).map(([k, v]) => (
                  <div className="stat" key={k}>
                    <span className="stat-label">{k}</span>
                    <span className="stat-row"><span className="stat-dot" data-v={v} />{v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Territory Manifesto · {t.title}</h3>
          {selectedTerritoryId === t.id && <span className="status-pill" data-tone="ok">selected</span>}
        </div>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 500, lineHeight: 1.55, letterSpacing: "-0.012em", color: "var(--fg-0)", maxWidth: 720 }}>
          &ldquo;{t.content.manifesto}&rdquo;
        </div>
        <div className="findings" style={{ marginTop: 16 }}>
          <div className="finding" data-kind="insight"><div className="finding-tag">Angle</div><div className="finding-body">{t.content.strategic_angle}</div></div>
          <div className="finding"><div className="finding-tag">Visual</div><div className="finding-body">{t.content.visual_language}</div></div>
          <div className="finding"><div className="finding-tag">Tone</div><div className="finding-body">{t.content.tone}</div></div>
          <div className="finding"><div className="finding-tag">Channels</div><div className="finding-body">{t.content.best_channels.join(" · ")}</div></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn sm" onClick={handleGenerate} disabled={generating || loading}><Icons.refresh width={12} height={12} /> Regenerate</button>
          <button className="btn sm" onClick={() => ping("Forking territories lands in feedback loop phase") }><Icons.copy width={12} height={12} /> Fork to variant</button>
          <button className="btn sm" onClick={() => jump("brief")}><Icons.chevL width={12} height={12} /> Back to Brief</button>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <PipelineStepper currentStage="direction" onJump={jump} statuses={{ brief: "done", direction: selectedTerritoryId ? "done" : "active", production: selectedTerritoryId ? "active" : "pending", review: "pending", export: "pending" }} />
      </div>
    </div>
  );
}
