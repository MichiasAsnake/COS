"use client";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { PipelineStepper } from "@/components/pipeline/pipeline-stepper";
import type { Stage } from "@/components/workspace";
import type { ExportDoc, QAReview } from "@/lib/agents/schemas";

type ProductionOutput = {
  id: string;
  type: string;
  title: string;
  version: number;
  status?: string;
};

type ExportDocOutput = {
  id: string;
  title: string;
  content: ExportDoc;
  version: number;
};

type QAReviewOutput = {
  id: string;
  title: string;
  content: QAReview;
};

const SAMPLE_MARKDOWN = `# Project Atlas

Client: Atlas Co
Project slug: atlas

## Brief Intelligence

Audience: Busy commuters
Core insight: Organization creates calm.
Opportunity: Make utility feel desirable.

## Selected Territory

### Quiet Utility
A restrained direction grounded in usefulness.

## Hooks & Scripts

- Your bag should not need a search party.

## Visual Direction

Warm product close-ups with restrained human presence.

## Shot List

- Bag dump cold open: Show the pain

## QA Notes

Verdict: revise
Brand fit: 86/100
Clarity: 91/100
`;

interface ExportStageProps {
  projectSlug?: string;
  jump: (stage: Stage) => void;
  ping: (msg: string) => void;
}

export function ExportStage({ projectSlug = "atlas", jump, ping }: ExportStageProps) {
  const [exportDoc, setExportDoc] = useState<ExportDocOutput | null>({
    id: "sample-export",
    title: "Sample Markdown Handoff",
    version: 1,
    content: { format: "markdown", markdown: SAMPLE_MARKDOWN },
  });
  const [qaReview, setQaReview] = useState<QAReviewOutput | null>(null);
  const [outputs, setOutputs] = useState<ProductionOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [source, setSource] = useState<"backend" | "sample">("sample");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadExport() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectSlug}/export`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Export workspace unavailable (${response.status})`);
        const data = await response.json();
        if (!active) return;
        setOutputs(Array.isArray(data.productionOutputs) ? data.productionOutputs : []);
        setQaReview(data.qaReview ?? null);
        setExportDoc(data.exportDoc ?? null);
        setSource("backend");
      } catch (err) {
        if (!active) return;
        setOutputs([]);
        setExportDoc({ id: "sample-export", title: "Sample Markdown Handoff", version: 1, content: { format: "markdown", markdown: SAMPLE_MARKDOWN } });
        setSource("sample");
        setError(err instanceof Error ? err.message : "Export workspace unavailable");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadExport();
    return () => { active = false; };
  }, [projectSlug]);

  async function generateExport() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/export`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? `Markdown export failed (${response.status})`);
      setExportDoc(data.exportDoc);
      setQaReview(data.qaReview ?? qaReview);
      setOutputs(Array.isArray(data.productionOutputs) ? data.productionOutputs : outputs);
      setSource("backend");
      ping("Markdown export created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Markdown export failed");
      setExportDoc({ id: "sample-export", title: "Sample Markdown Handoff", version: 1, content: { format: "markdown", markdown: SAMPLE_MARKDOWN } });
      setSource("sample");
      ping("Export unavailable · showing sample");
    } finally {
      setGenerating(false);
    }
  }

  async function copyMarkdown() {
    const markdown = exportDoc?.content.markdown;
    if (!markdown) {
      ping("Generate export first");
      return;
    }
    try {
      await navigator.clipboard?.writeText(markdown);
      ping("Markdown copied");
    } catch {
      ping("Markdown ready to copy manually");
    }
  }

  const markdown = exportDoc?.content.markdown ?? "";

  return (
    <div className="page stage-fade">
      <div className="stage-hero">
        <div>
          <div className="stage-eyebrow">Stage 05 · Export · {source === "backend" ? "Persisted" : "Sample fallback"}</div>
          <div className="stage-title">Move work out of the system.</div>
          <div className="stage-desc">Generate a Markdown handoff with brief intelligence, selected territory, production assets, and QA notes.</div>
        </div>
        <div className="next-action">
          <span className="next-label">Recommended next</span>
          <button className="btn primary" onClick={generateExport} disabled={generating || loading}>
            <Icons.download width={14} height={14} /> {generating ? "Generating…" : "Generate Markdown"}
          </button>
        </div>
      </div>

      <div className="export-grid">
        <div className="export-card">
          <div>
            <div className="export-kind">Markdown · Handoff</div>
            <div className="export-name">{exportDoc?.title ?? "Production handoff"}</div>
          </div>
          <div className="export-desc">Demo-ready creative handoff for internal execution or client review. Stored as export_doc when backend credentials are available.</div>
          <div className="export-list">
            {[
              ["Brief intelligence", true],
              ["Selected territory", true],
              ["Production outputs", outputs.length > 0 || source === "sample"],
              ["QA notes", Boolean(qaReview || source === "sample")],
            ].map(([label, enabled]) => (
              <div key={label as string} className="export-list-item">
                <span className="ck" data-on={enabled ? "true" : "false"}>{enabled ? <Icons.check width={10} height={10} /> : null}</span>
                {label}
              </div>
            ))}
          </div>
          {error && <div className="error-note" style={{ marginTop: 12 }}>{error}</div>}
          <div className="export-foot">
            <span className="export-meta">{exportDoc ? `v${exportDoc.version} · ${markdown.length.toLocaleString()} chars` : "Not generated"}</span>
            <button className="btn sm primary" onClick={copyMarkdown} disabled={!exportDoc}>Copy Markdown</button>
          </div>
        </div>

        <div className="export-card export-preview-card">
          <div>
            <div className="export-kind">Preview</div>
            <div className="export-name">Markdown handoff</div>
          </div>
          {markdown ? (
            <pre className="markdown-preview">{markdown}</pre>
          ) : (
            <div className="empty">No export yet. Generate Markdown after QA review.</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <PipelineStepper currentStage="export" onJump={jump} statuses={{ brief: "done", direction: "done", production: "done", review: "done", export: "active" }} />
      </div>
    </div>
  );
}
