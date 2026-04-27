"use client";
import { useEffect, useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { PipelineStepper } from "@/components/pipeline/pipeline-stepper";
import type { Stage } from "@/components/workspace";
import type { QAReview } from "@/lib/agents/schemas";

type ProductionOutput = {
  id: string;
  type: "copy_system" | "visual_direction" | "shot_list" | string;
  title: string;
  version: number;
  status?: string;
};

type QAReviewOutput = {
  id: string;
  title: string;
  content: QAReview;
  version: number;
};

const SAMPLE_OUTPUTS: ProductionOutput[] = [
  { id: "sample-copy", type: "copy_system", title: "Copy System · Quiet Utility", version: 1, status: "draft" },
  { id: "sample-visual", type: "visual_direction", title: "Visual Direction · Quiet Utility", version: 1, status: "draft" },
  { id: "sample-shots", type: "shot_list", title: "Shot List · Quiet Utility", version: 1, status: "draft" },
];

const SAMPLE_REVIEW: QAReview = {
  brand_fit: 86,
  clarity: 91,
  novelty: 72,
  channel_fit: 88,
  issues: [
    { severity: "medium", title: "Hook could land faster", body: "The promise is clear, but the pain should appear in the first beat.", recommended_fix: "Open on the bag dump before showing the organized result." },
    { severity: "low", title: "CTA is slightly generic", body: "The CTA works but does not reinforce Quiet Utility.", recommended_fix: "Tie the CTA to calm everyday carry instead of a generic shop prompt." },
  ],
  recommended_fixes: ["Lead with a specific commuter pain.", "Make the CTA echo the territory language."],
  verdict: "revise",
};

interface ReviewStageProps {
  projectSlug?: string;
  jump: (stage: Stage) => void;
  ping: (msg: string) => void;
}

function scoreTone(score: number) {
  if (score >= 85) return "high";
  if (score >= 70) return "med";
  return "low";
}

export function ReviewStage({ projectSlug = "atlas", jump, ping }: ReviewStageProps) {
  const [outputs, setOutputs] = useState<ProductionOutput[]>(SAMPLE_OUTPUTS);
  const [selectedOutputId, setSelectedOutputId] = useState(SAMPLE_OUTPUTS[0]?.id ?? "");
  const [review, setReview] = useState<QAReviewOutput | null>({ id: "sample-review", title: "Sample QA Review", content: SAMPLE_REVIEW, version: 1 });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [source, setSource] = useState<"backend" | "sample">("sample");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadReview() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectSlug}/review`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Review workspace unavailable (${response.status})`);
        const data = await response.json();
        if (!active) return;
        const loadedOutputs = Array.isArray(data.productionOutputs) && data.productionOutputs.length ? data.productionOutputs : SAMPLE_OUTPUTS;
        setOutputs(loadedOutputs);
        setSelectedOutputId((current) => loadedOutputs.some((output: ProductionOutput) => output.id === current) ? current : loadedOutputs[0]?.id ?? "");
        setReview(data.qaReview ?? null);
        setSource("backend");
      } catch (err) {
        if (!active) return;
        setOutputs(SAMPLE_OUTPUTS);
        setSelectedOutputId(SAMPLE_OUTPUTS[0]?.id ?? "");
        setReview({ id: "sample-review", title: "Sample QA Review", content: SAMPLE_REVIEW, version: 1 });
        setSource("sample");
        setError(err instanceof Error ? err.message : "Review workspace unavailable");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReview();
    return () => { active = false; };
  }, [projectSlug]);

  const selectedOutput = useMemo(
    () => outputs.find((output) => output.id === selectedOutputId) ?? outputs[0],
    [outputs, selectedOutputId],
  );

  const activeReview = review?.content;
  const resolvedCount = activeReview?.issues.length ? activeReview.issues.filter((issue) => issue.severity === "low").length : 0;

  async function runReview() {
    if (!selectedOutput) {
      ping("Generate production outputs first");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outputId: selectedOutput.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? `QA review failed (${response.status})`);
      setReview(data.qaReview);
      setSource("backend");
      ping("QA review completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "QA review failed");
      ping("QA review unavailable · showing sample");
      setReview({ id: "sample-review", title: "Sample QA Review", content: SAMPLE_REVIEW, version: 1 });
      setSource("sample");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="page stage-fade">
      <div className="stage-hero">
        <div>
          <div className="stage-eyebrow">Stage 04 · Review · {source === "backend" ? "Persisted" : "Sample fallback"}</div>
          <div className="stage-title">Critique, not commentary.</div>
          <div className="stage-desc">The QA Critic scores production output, flags issues with severity, and gives fixes that can drive feedback or export decisions.</div>
        </div>
        <div className="next-action">
          <span className="next-label">Recommended next</span>
          <button className="btn primary" onClick={() => jump("export")} disabled={!activeReview}>
            Approve &amp; Export <Icons.arrowR width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div>
            <div className="panel-title">Output under review</div>
            <div className="panel-subtitle">Choose one production output, then run the QA Critic.</div>
          </div>
          <button className="btn primary" onClick={runReview} disabled={running || loading || !selectedOutput}>
            <Icons.wand width={14} height={14} /> {running ? "Reviewing…" : "Run QA Critic"}
          </button>
        </div>
        <div className="output-grid" style={{ marginTop: 14 }}>
          {outputs.map((output) => (
            <button
              key={output.id}
              className="output-card"
              data-selected={selectedOutputId === output.id ? "true" : "false"}
              onClick={() => setSelectedOutputId(output.id)}
              type="button"
            >
              <div className="output-type">{output.type.replaceAll("_", " ")}</div>
              <div className="output-title">{output.title}</div>
              <div className="output-meta">v{output.version} · {output.status ?? "draft"}</div>
            </button>
          ))}
        </div>
        {error && <div className="error-note" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      <div className="review-grid">
        <div className="review-asset">
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="panel-title">QA Scorecard</div>
                <div className="panel-subtitle">{selectedOutput?.title ?? "No output selected"}</div>
              </div>
              <span className="pill">{activeReview?.verdict ?? "pending"}</span>
            </div>
            {activeReview ? (
              <div className="score-grid" style={{ marginTop: 16 }}>
                {[
                  ["Brand fit", activeReview.brand_fit],
                  ["Clarity", activeReview.clarity],
                  ["Novelty", activeReview.novelty],
                  ["Channel fit", activeReview.channel_fit],
                ].map(([label, value]) => (
                  <div className="metric-card" key={label as string}>
                    <span>{label}</span>
                    <strong data-tone={scoreTone(value as number)}>{value}/100</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">No QA review yet. Run the critic to generate scores, issues, and fixes.</div>
            )}
          </div>
        </div>

        <div>
          <div className="rail-head" style={{ marginBottom: 12 }}>
            <div className="rail-title">QA Critic Notes</div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-2)" }}>
              {resolvedCount}/{activeReview?.issues.length ?? 0} LOW-RISK
            </span>
          </div>
          <div className="crit-list">
            {activeReview?.issues.length ? activeReview.issues.map((issue, i) => (
              <div className="crit" key={`${issue.title}-${i}`}>
                <div className="crit-head">
                  <span className="crit-tag" data-sev={issue.severity === "medium" ? "med" : issue.severity}>{issue.severity}</span>
                  <span className="crit-num">L{i + 1}</span>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 500, marginTop: 8 }}>{issue.title}</div>
                <div className="crit-body">{issue.body}</div>
                <div className="crit-body"><b>Fix:</b> {issue.recommended_fix}</div>
                <div className="crit-actions">
                  <button className="btn sm" onClick={() => ping("Use Production feedback to refine this output")}>Retry via feedback</button>
                </div>
              </div>
            )) : <div className="empty">No critique notes yet.</div>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <PipelineStepper currentStage="review" onJump={jump} statuses={{ brief: "done", direction: "done", production: "done", review: "active", export: activeReview ? "active" : "pending" }} />
      </div>
    </div>
  );
}
