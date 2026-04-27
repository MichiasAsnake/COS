import { describe, expect, it, vi } from "vitest";
import { handleApplyFeedbackRequest, handleGenerateProductionRequest, handleGetProductionRequest } from "@/lib/http/production";

function request(body: unknown, method = "PATCH") {
  return new Request("http://cos.local/api", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("phase-four production API handlers", () => {
  it("loads persisted production workspace", async () => {
    const getProductionWorkspace = vi.fn(async () => ({
      project: { id: "project-1", slug: "atlas" },
      outputs: [{ id: "output-1", type: "copy_system", title: "Copy System" }],
    }));

    const response = await handleGetProductionRequest({ projectSlug: "atlas", getProductionWorkspace });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      outputs: [expect.objectContaining({ id: "output-1" })],
    }));
  });

  it("runs the production workflow", async () => {
    const runProductionSystemWorkflow = vi.fn(async () => ({ outputs: [{ id: "copy-output", type: "copy_system" }] }));

    const response = await handleGenerateProductionRequest({
      projectSlug: "atlas",
      model: "gpt-test",
      runProductionSystemWorkflow,
    });

    expect(response.status).toBe(200);
    expect(runProductionSystemWorkflow).toHaveBeenCalledWith(expect.objectContaining({ projectSlug: "atlas", model: "gpt-test" }));
  });

  it("validates feedback requests before creating revisions", async () => {
    const applyFeedbackWorkflow = vi.fn();

    const response = await handleApplyFeedbackRequest(request({ outputId: "", feedbackType: "less_generic" }), {
      projectSlug: "atlas",
      applyFeedbackWorkflow,
    });

    expect(response.status).toBe(400);
    expect(applyFeedbackWorkflow).not.toHaveBeenCalled();
  });

  it("applies feedback and returns the revised output", async () => {
    const applyFeedbackWorkflow = vi.fn(async () => ({ revisedOutput: { id: "output-2", version: 2 } }));

    const response = await handleApplyFeedbackRequest(request({
      outputId: "output-1",
      feedbackType: "less_generic",
      instruction: "Make it more concrete.",
    }), {
      projectSlug: "atlas",
      model: "gpt-test",
      applyFeedbackWorkflow,
    });

    expect(response.status).toBe(200);
    expect(applyFeedbackWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      projectSlug: "atlas",
      outputId: "output-1",
      feedbackType: "less_generic",
      instruction: "Make it more concrete.",
      model: "gpt-test",
    }));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ revisedOutput: expect.objectContaining({ version: 2 }) }));
  });
});
