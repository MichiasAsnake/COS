"use client";
import { useEffect, useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { PipelineStepper } from "@/components/pipeline/pipeline-stepper";
import type { CopySystem, OutputType, ShotList, VisualDirection } from "@/lib/agents/schemas";
import type { Stage } from "@/components/workspace";
import type { Json } from "@/types/database";

type ProductionOutputType = "copy_system" | "visual_direction" | "shot_list";
type FeedbackType = "make_more_premium" | "less_generic" | "more_playful" | "more_tiktok_native" | "client_safe" | "shorter" | "more_visual";

type ProductionOutput = {
  id: string;
  parent_output_id?: string | null;
  type: OutputType;
  title: string;
  content: Json;
  version: number;
  status?: string;
};

type ProductionWorkspace = {
  outputs?: ProductionOutput[];
};

const FEEDBACK_ACTIONS: { type: FeedbackType; label: string }[] = [
  { type: "less_generic", label: "Less generic" },
  { type: "make_more_premium", label: "More premium" },
  { type: "more_tiktok_native", label: "More TikTok-native" },
  { type: "shorter", label: "Shorter" },
];

const sampleOutputs: ProductionOutput[] = [
  {
    id: "sample-copy",
    type: "copy_system",
    title: "Copy System · Quiet Utility",
    version: 1,
    content: {
      hooks: ["Your bag should not need a search party.", "The pocket you need, before you need it."],
      scripts: [{ title: "15s Quiet Utility", duration: "15s", voiceover: "Start with the daily bag dump, then reveal the calm system inside.", beats: ["bag dump", "pocket reveal", "commute exit"] }],
      caption_options: ["A place for everything, finally."],
      copy_sets: [{ title: "PDP headlines", lines: ["Utility, quietly upgraded.", "Organization without the overpack."] }],
    } satisfies CopySystem,
  },
  {
    id: "sample-visual",
    type: "visual_direction",
    title: "Visual Direction · Quiet Utility",
    version: 1,
    content: {
      visual_direction: "Warm close-ups, useful hands, restrained product detail, and clean motion from mess to order.",
      image_prompts: ["Warm studio close-up of organized bag pockets with keys, lip balm, wallet, and notebook placed precisely"],
      video_prompts: ["TikTok UGC: chaotic bag dump turns into one calm organized pack in under 8 seconds"],
      do_rules: ["Use tactile macro details", "Keep backgrounds quiet"],
      dont_rules: ["Avoid luxury cliché props", "Avoid sterile tech-product lighting"],
    } satisfies VisualDirection,
  },
  {
    id: "sample-shots",
    type: "shot_list",
    title: "Shot List · Quiet Utility",
    version: 1,
    content: {
      shot_list: [{ shot: "Bag dump cold open", purpose: "Show the pain before the product promise", props: ["keys", "wallet", "earbuds", "lip balm"], notes: "Keep under 2 seconds" }],
      deliverables: ["3 TikTok cuts", "6 product stills", "1 PDP organization diagram"],
      production_risks: ["Avoid making the organization feel too staged"],
    } satisfies ShotList,
  },
];

const GROUPS: { id: ProductionOutputType; label: string }[] = [
  { id: "copy_system", label: "Copy System" },
  { id: "visual_direction", label: "Visuals" },
  { id: "shot_list", label: "Shot Lists" },
];

interface ProductionStageProps {
  projectSlug: string;
  jump: (stage: Stage) => void;
  ping: (msg: string) => void;
}

function productionOutputs(payload: ProductionWorkspace): ProductionOutput[] {
  return (payload.outputs ?? []).filter((output) => output.type === "copy_system" || output.type === "visual_direction" || output.type === "shot_list");
}

function isSample(output: ProductionOutput) {
  return output.id.startsWith("sample-");
}

function summaryForOutput(output: ProductionOutput) {
  if (output.type === "copy_system") {
    const content = output.content as CopySystem;
    return `${content.hooks?.length ?? 0} hooks · ${content.scripts?.length ?? 0} scripts · ${content.caption_options?.length ?? 0} captions`;
  }
  if (output.type === "visual_direction") {
    const content = output.content as VisualDirection;
    return `${content.image_prompts?.length ?? 0} image prompts · ${content.video_prompts?.length ?? 0} video prompts`;
  }
  if (output.type === "shot_list") {
    const content = output.content as ShotList;
    return `${content.shot_list?.length ?? 0} shots · ${content.deliverables?.length ?? 0} deliverables`;
  }
  return "Production output";
}

function OutputDetails({ output }: { output: ProductionOutput }) {
  if (output.type === "copy_system") {
    const content = output.content as CopySystem;
    return (
      <div className="prod-detail">
        <div className="finding" data-kind="insight"><div className="finding-tag">Hooks</div><div className="finding-body">{content.hooks.join(" · ")}</div></div>
        {content.scripts.map((script) => (
          <div className="finding" key={script.title}><div className="finding-tag">Script</div><div className="finding-body"><b>{script.title}</b> · {script.duration}<br />{script.voiceover}<br />{script.beats.join(" → ")}</div></div>
        ))}
        {content.copy_sets.map((set) => (
          <div className="finding" key={set.title}><div className="finding-tag">Copy</div><div className="finding-body"><b>{set.title}</b><br />{set.lines.join(" · ")}</div></div>
        ))}
      </div>
    );
  }

  if (output.type === "visual_direction") {
    const content = output.content as VisualDirection;
    return (
      <div className="prod-detail">
        <div className="finding" data-kind="insight"><div className="finding-tag">Direction</div><div className="finding-body">{content.visual_direction}</div></div>
        <div className="finding"><div className="finding-tag">Image</div><div className="finding-body">{content.image_prompts.join(" · ")}</div></div>
        <div className="finding"><div className="finding-tag">Video</div><div className="finding-body">{content.video_prompts.join(" · ")}</div></div>
        <div className="finding"><div className="finding-tag">Rules</div><div className="finding-body"><b>Do:</b> {content.do_rules.join(" · ")}<br /><b>Don&apos;t:</b> {content.dont_rules.join(" · ")}</div></div>
      </div>
    );
  }

  const content = output.content as ShotList;
  return (
    <div className="prod-detail">
      {content.shot_list.map((shot) => (
        <div className="finding" key={shot.shot}><div className="finding-tag">Shot</div><div className="finding-body"><b>{shot.shot}</b> · {shot.purpose}<br />Props: {shot.props.join(", ")}<br />{shot.notes}</div></div>
      ))}
      <div className="finding"><div className="finding-tag">Deliver</div><div className="finding-body">{content.deliverables.join(" · ")}</div></div>
      <div className="finding" data-kind="risk"><div className="finding-tag">Risks</div><div className="finding-body">{content.production_risks.join(" · ")}</div></div>
    </div>
  );
}

export function ProductionStage({ projectSlug, jump, ping }: ProductionStageProps) {
  const [active, setActive] = useState<ProductionOutputType>("copy_system");
  const [outputs, setOutputs] = useState<ProductionOutput[]>(sampleOutputs);
  const [selectedOutputId, setSelectedOutputId] = useState(sampleOutputs[0].id);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedbacking, setFeedbacking] = useState<FeedbackType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeRequest = true;

    async function loadProductionOutputs() {
      try {
        const response = await fetch(`/api/projects/${projectSlug}/production`, { cache: "no-store" });
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not load production outputs.");
        const payload = await response.json() as ProductionWorkspace;
        const saved = productionOutputs(payload);
        if (!activeRequest) return;
        if (saved.length) {
          setOutputs(saved);
          setActive(saved[0].type as ProductionOutputType);
          setSelectedOutputId(saved[0].id);
        }
        setError(null);
      } catch (loadError) {
        if (activeRequest) setError(loadError instanceof Error ? loadError.message : "Could not load production outputs. Showing sample outputs.");
      } finally {
        if (activeRequest) setLoading(false);
      }
    }

    void loadProductionOutputs();

    return () => {
      activeRequest = false;
    };
  }, [projectSlug]);

  const grouped = useMemo(() => GROUPS.map((group) => ({ ...group, outputs: outputs.filter((output) => output.type === group.id) })), [outputs]);
  const activeOutputs = outputs.filter((output) => output.type === active);
  const selectedOutput = outputs.find((output) => output.id === selectedOutputId) ?? activeOutputs[0] ?? outputs[0];
  const generatedFromBackend = outputs.some((output) => !isSample(output));

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/production`, { method: "POST" });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not generate production system.");
      const payload = await response.json() as ProductionWorkspace;
      const generated = productionOutputs(payload);
      if (!generated.length) throw new Error("Production agents returned no outputs.");
      setOutputs(generated);
      setActive(generated[0].type as ProductionOutputType);
      setSelectedOutputId(generated[0].id);
      ping("Production system generated");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Could not generate production system.");
    } finally {
      setGenerating(false);
    }
  };

  const applyFeedback = async (feedbackType: FeedbackType) => {
    if (!selectedOutput) return;
    if (isSample(selectedOutput)) {
      setError("Generate real production outputs before applying feedback.");
      return;
    }

    setFeedbacking(feedbackType);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/production`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outputId: selectedOutput.id, feedbackType }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not apply feedback.");
      const payload = await response.json() as { revisedOutput?: ProductionOutput };
      if (!payload.revisedOutput) throw new Error("Feedback engine returned no revised output.");
      setOutputs((current) => [...current, payload.revisedOutput!]);
      setActive(payload.revisedOutput.type as ProductionOutputType);
      setSelectedOutputId(payload.revisedOutput.id);
      ping(`Feedback applied · ${feedbackType}`);
    } catch (feedbackError) {
      setError(feedbackError instanceof Error ? feedbackError.message : "Could not apply feedback.");
    } finally {
      setFeedbacking(null);
    }
  };

  return (
    <div className="page stage-fade">
      <div className="stage-hero">
        <div>
          <div className="stage-eyebrow">Stage 03 · Production</div>
          <div className="stage-title">Direction, made executable.</div>
          <div className="stage-desc">Generate copy, visual direction, and shot-list outputs from the selected territory. Feedback creates a new version while preserving the original.</div>
        </div>
        <div className="next-action">
          <span className="next-label">Recommended next</span>
          <button className="btn primary" onClick={() => jump("review")} disabled={!generatedFromBackend}>
            Send to Review <Icons.arrowR width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div>
            <h3>Production Agents</h3>
            <div className="brief-meta">{loading ? "Loading persisted outputs" : generatedFromBackend ? "Saved production outputs" : "Sample production preview"}</div>
          </div>
          <button className="btn sm" onClick={handleGenerate} disabled={loading || generating}>
            <Icons.refresh width={12} height={12} /> {generating ? "Generating…" : generatedFromBackend ? "Regenerate production system" : "Generate production system"}
          </button>
        </div>
        {error && <div className="brief-error">{error}</div>}
      </div>

      <div className="prod-grid">
        <div className="prod-side">
          {grouped.map((g) => (
            <button key={g.id} className="prod-side-item" data-active={active === g.id ? "true" : "false"} onClick={() => { setActive(g.id); if (g.outputs[0]) setSelectedOutputId(g.outputs[0].id); }}>
              <span>{g.label}</span>
              <span className="count">{String(g.outputs.length).padStart(2, "0")}</span>
            </button>
          ))}
          <button className="btn sm ghost" style={{ justifyContent: "flex-start", marginTop: 8 }} onClick={handleGenerate} disabled={generating}>
            <Icons.plus width={12} height={12} /> Run agents
          </button>
        </div>
        <div className="prod-list">
          {activeOutputs.map((output, i) => (
            <div className="prod-item" key={output.id} data-active={selectedOutput?.id === output.id ? "true" : "false"} onClick={() => setSelectedOutputId(output.id)}>
              <div className="prod-num">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <div className="prod-title">{output.title}</div>
                <div className="prod-sub">v{output.version} · {summaryForOutput(output)}</div>
              </div>
              <div className="prod-actions">
                <button className="btn sm" onClick={(event) => { event.stopPropagation(); void applyFeedback("less_generic"); }} disabled={Boolean(feedbacking)}><Icons.refresh width={12} height={12} /> Less generic</button>
                <button className="btn sm" onClick={(event) => { event.stopPropagation(); setSelectedOutputId(output.id); }}><Icons.copy width={12} height={12} /></button>
                <button className="btn sm" onClick={(event) => { event.stopPropagation(); jump("review"); }} disabled={isSample(output)}>Open <Icons.arrowR width={12} height={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedOutput && (
        <div className="panel" style={{ marginTop: 22 }}>
          <div className="panel-head">
            <div>
              <h3>{selectedOutput.title}</h3>
              <div className="brief-meta">Version {selectedOutput.version}{selectedOutput.parent_output_id ? ` · revised from ${selectedOutput.parent_output_id}` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {FEEDBACK_ACTIONS.map((action) => (
                <button key={action.type} className="btn sm" onClick={() => void applyFeedback(action.type)} disabled={Boolean(feedbacking) || isSample(selectedOutput)}>
                  {feedbacking === action.type ? "Applying…" : action.label}
                </button>
              ))}
            </div>
          </div>
          <OutputDetails output={selectedOutput} />
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <PipelineStepper currentStage="production" onJump={jump} statuses={{ brief: "done", direction: "done", production: "active", review: generatedFromBackend ? "active" : "pending", export: "pending" }} />
      </div>
    </div>
  );
}
