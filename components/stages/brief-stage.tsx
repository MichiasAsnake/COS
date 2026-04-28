"use client";
import { useEffect, useMemo, useState } from "react";
import { Icons } from "@/components/icons";
import { PipelineStepper } from "@/components/pipeline/pipeline-stepper";
import type { Stage } from "@/components/workspace";
import type { BriefIntelligence } from "@/lib/agents/schemas";

interface BriefStageProps {
  projectSlug: string;
  jump: (stage: Stage) => void;
  ping: (msg: string) => void;
  onWorkspaceMutated: () => void;
}

type BriefWorkspaceResponse = {
  input?: { id: string; content: string | null } | null;
  output?: { id: string; content: BriefIntelligence } | null;
  error?: string;
};

type BriefSource = "empty" | "persisted" | "generated";

function asBriefIntelligence(value: unknown): BriefIntelligence | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Partial<BriefIntelligence>;
  if (!data.audience || !data.core_insight || !data.opportunity || !data.recommended_next_step) return null;
  return {
    audience: data.audience,
    core_insight: data.core_insight,
    opportunity: data.opportunity,
    risks: Array.isArray(data.risks) ? data.risks : [],
    missing_information: Array.isArray(data.missing_information) ? data.missing_information : [],
    recommended_next_step: data.recommended_next_step,
  };
}

export function BriefStage({ projectSlug, jump, ping, onWorkspaceMutated }: BriefStageProps) {
  const [rawBrief, setRawBrief] = useState("");
  const [intelligence, setIntelligence] = useState<BriefIntelligence | null>(null);
  const [source, setSource] = useState<BriefSource>("empty");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBrief() {
      setIsLoading(true);
      setError(null);
      setRawBrief("");
      setIntelligence(null);
      setSource("empty");
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectSlug)}/brief`, { cache: "no-store" });
        const data = await response.json() as BriefWorkspaceResponse;
        if (!active) return;

        if (!response.ok) {
          setError(data.error ?? "Brief workspace could not load.");
          return;
        }

        setRawBrief(data.input?.content ?? "");
        const persisted = asBriefIntelligence(data.output?.content);
        if (persisted) {
          setIntelligence(persisted);
          setSource("persisted");
        }
        setError(null);
      } catch {
        if (active) setError("Could not load persisted brief intelligence. Check the backend connection and try again.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadBrief();
    return () => { active = false; };
  }, [projectSlug]);

  const findings = useMemo(() => {
    if (!intelligence) return [];
    return [
      { kind: "insight" as const, tag: "Audience", body: intelligence.audience },
      { kind: "insight" as const, tag: "Insight", body: intelligence.core_insight },
      { kind: "insight" as const, tag: "Opportunity", body: intelligence.opportunity },
      ...intelligence.risks.map((risk) => ({ kind: "risk" as const, tag: "Risk", body: risk })),
      ...intelligence.missing_information.map((missing) => ({ kind: "missing" as const, tag: "Missing", body: missing })),
    ];
  }, [intelligence]);

  async function parseBrief() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectSlug)}/brief`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawBrief }),
      });
      const data = await response.json() as { output?: { content: BriefIntelligence }; error?: string };

      if (!response.ok) throw new Error(data.error ?? "Brief agent failed");

      const generated = asBriefIntelligence(data.output?.content);
      if (!generated) throw new Error("Brief agent returned an unexpected response shape.");

      setIntelligence(generated);
      setSource("generated");
      onWorkspaceMutated();
      ping("Brief Intelligence saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Brief agent failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page stage-fade">
      <div className="stage-hero">
        <div>
          <div className="stage-eyebrow">Stage 01 · Brief</div>
          <div className="stage-title">From raw input to structured understanding.</div>
          <div className="stage-desc">Paste a messy project brief. COS stores the source input, runs the Brief Intelligence Agent, and reloads the persisted output on refresh.</div>
        </div>
        <div className="next-action">
          <span className="next-label">Recommended next</span>
          <button className="btn primary" onClick={() => jump("direction")} disabled={!intelligence}>
            Continue to Direction <Icons.arrowR width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="brief-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Raw Brief</h3>
            <span className="status-pill" data-tone={rawBrief.trim() ? "ok" : "warn"}>{isLoading ? "Loading" : rawBrief.trim() ? "saved input" : "empty"}</span>
          </div>
          <textarea
            className="brief-input"
            value={rawBrief}
            onChange={(event) => setRawBrief(event.target.value)}
            placeholder="Paste the project brief, meeting notes, client context, constraints, or campaign ask…"
          />
          <div className="brief-actions">
            <button className="btn primary" onClick={parseBrief} disabled={isSubmitting || rawBrief.trim().length < 40}>
              {isSubmitting ? "Running agent…" : "Parse + save brief"}
            </button>
            <span className="brief-meta">{rawBrief.trim().length} chars · project/{projectSlug}</span>
          </div>
          {error && <div className="brief-error">{error}</div>}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>System Findings</h3>
            <span className="status-pill" data-tone={intelligence ? "ok" : "warn"}>{isLoading ? "loading" : intelligence ? source : "empty"}</span>
          </div>
          {intelligence ? (
            <div className="findings">
              {findings.map((finding, index) => (
                <div key={`${finding.tag}-${index}`} className="finding" data-kind={finding.kind}>
                  <span className="finding-tag">{finding.tag}</span>
                  <div className="finding-body"><b>{finding.body}</b></div>
                </div>
              ))}
              <div className="finding" data-kind="insight">
                <span className="finding-tag">Next</span>
                <div className="finding-body">
                  <b>{intelligence.recommended_next_step}</b>{" "}
                  <button className="btn sm" style={{ marginTop: 6 }} disabled title="Clarification drafting is not enabled yet">
                    Request clarification
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty">
              No brief intelligence has been saved for this project yet. Paste the real brief, then run Brief Intelligence to unlock Direction.
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <PipelineStepper currentStage="brief" onJump={jump} statuses={{ brief: intelligence ? "done" : "active", direction: "pending", production: "pending", review: "pending", export: "pending" }} />
      </div>
    </div>
  );
}
