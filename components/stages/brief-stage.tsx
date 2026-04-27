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
}

type BriefWorkspaceResponse = {
  input?: { id: string; content: string | null } | null;
  output?: { id: string; content: BriefIntelligence } | null;
  error?: string;
};

const SAMPLE_BRIEF = "We are launching the next iteration of the Atlas line for people who value functional honesty over status signaling. The work should feel quietly distinctive, product-led, and built for social and partnerships. Timeline is tight at eight weeks, paid amplification budget is still unclear, and prior lifestyle-heavy launches did not convert as well as expected.";

const SAMPLE_INTELLIGENCE: BriefIntelligence = {
  audience: "People who value functional honesty over status signaling.",
  core_insight: "The strongest strategic tension is quiet distinction: the work must feel recognizable without leaning on loud branding.",
  opportunity: "Use product-led storytelling to prove utility, durability, and considered design instead of aspirational lifestyle cues.",
  risks: [
    "The eight-week timeline is aggressive for the asset volume implied.",
    "Lifestyle imagery underperformed in past launches and could repeat the conversion issue.",
  ],
  missing_information: ["Confirmed paid amplification budget", "Final channel priorities", "Production asset count"],
  recommended_next_step: "Confirm channel and budget assumptions, then generate creative territories.",
};

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

export function BriefStage({ projectSlug, jump, ping }: BriefStageProps) {
  const [rawBrief, setRawBrief] = useState(SAMPLE_BRIEF);
  const [intelligence, setIntelligence] = useState<BriefIntelligence>(SAMPLE_INTELLIGENCE);
  const [source, setSource] = useState<"sample" | "persisted" | "generated">("sample");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBrief() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectSlug)}/brief`, { cache: "no-store" });
        const data = await response.json() as BriefWorkspaceResponse;
        if (!active) return;

        if (!response.ok) {
          setError(data.error ?? "Backend not connected yet; showing sample brief intelligence.");
          return;
        }

        if (data.input?.content) setRawBrief(data.input.content);
        const persisted = asBriefIntelligence(data.output?.content);
        if (persisted) {
          setIntelligence(persisted);
          setSource("persisted");
          setError(null);
        }
      } catch {
        if (active) setError("Could not load persisted brief intelligence; showing sample data.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadBrief();
    return () => { active = false; };
  }, [projectSlug]);

  const findings = useMemo(() => [
    { kind: "insight" as const, tag: "Audience", body: intelligence.audience },
    { kind: "insight" as const, tag: "Insight", body: intelligence.core_insight },
    { kind: "insight" as const, tag: "Opportunity", body: intelligence.opportunity },
    ...intelligence.risks.map((risk) => ({ kind: "risk" as const, tag: "Risk", body: risk })),
    ...intelligence.missing_information.map((missing) => ({ kind: "missing" as const, tag: "Missing", body: missing })),
  ], [intelligence]);

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
          <button className="btn primary" onClick={() => jump("direction")}>
            Continue to Direction <Icons.arrowR width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="brief-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Raw Brief</h3>
            <span className="status-pill" data-tone={source === "sample" ? "warn" : "ok"}>{isLoading ? "Loading" : source}</span>
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
            <span className="status-pill" data-tone={source === "sample" ? "warn" : "ok"}>{source === "sample" ? "sample" : "saved"}</span>
          </div>
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
                <button className="btn sm" style={{ marginTop: 6 }} onClick={() => ping("Drafting clarification request…")}>
                  Request clarification
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <PipelineStepper currentStage="brief" onJump={jump} statuses={{ brief: source === "sample" ? "active" : "done", direction: "pending", production: "pending", review: "pending", export: "pending" }} />
      </div>
    </div>
  );
}
