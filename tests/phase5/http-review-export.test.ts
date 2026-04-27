import { describe, expect, it, vi } from "vitest";
import {
  handleExportMarkdownRequest,
  handleGetExportRequest,
  handleGetReviewRequest,
  handleRunQAReviewRequest,
} from "@/lib/http/review-export";

function request(body: unknown, method = "POST") {
  return new Request("http://cos.local/api", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("phase-five review/export API handlers", () => {
  it("loads review workspace", async () => {
    const getReviewWorkspace = vi.fn(async () => ({
      project: { id: "project-1", slug: "atlas" },
      productionOutputs: [{ id: "copy-output", type: "copy_system" }],
      qaReview: null,
    }));

    const response = await handleGetReviewRequest({ projectSlug: "atlas", getReviewWorkspace });

    expect(response.status).toBe(200);
    expect(getReviewWorkspace).toHaveBeenCalledWith("atlas");
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      productionOutputs: [expect.objectContaining({ id: "copy-output" })],
    }));
  });

  it("validates QA review requests before running the critic", async () => {
    const runQAReviewWorkflow = vi.fn();

    const response = await handleRunQAReviewRequest(request({ outputId: "" }), {
      projectSlug: "atlas",
      runQAReviewWorkflow,
    });

    expect(response.status).toBe(400);
    expect(runQAReviewWorkflow).not.toHaveBeenCalled();
  });

  it("runs QA review for a selected output", async () => {
    const runQAReviewWorkflow = vi.fn(async () => ({ qaReview: { id: "qa-output", type: "qa_review" } }));

    const response = await handleRunQAReviewRequest(request({ outputId: "copy-output" }), {
      projectSlug: "atlas",
      model: "gpt-test",
      runQAReviewWorkflow,
    });

    expect(response.status).toBe(200);
    expect(runQAReviewWorkflow).toHaveBeenCalledWith(expect.objectContaining({ projectSlug: "atlas", outputId: "copy-output", model: "gpt-test" }));
  });

  it("loads export workspace and creates markdown exports", async () => {
    const getExportWorkspace = vi.fn(async () => ({ exportDoc: null, productionOutputs: [] }));
    const exportMarkdownWorkflow = vi.fn(async () => ({ exportDoc: { id: "export-output", content: { format: "markdown", markdown: "# Handoff" } } }));

    const getResponse = await handleGetExportRequest({ projectSlug: "atlas", getExportWorkspace });
    const postResponse = await handleExportMarkdownRequest({ projectSlug: "atlas", model: "gpt-test", exportMarkdownWorkflow });

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(exportMarkdownWorkflow).toHaveBeenCalledWith(expect.objectContaining({ projectSlug: "atlas", model: "gpt-test" }));
    await expect(postResponse.json()).resolves.toEqual(expect.objectContaining({ exportDoc: expect.objectContaining({ id: "export-output" }) }));
  });
});
