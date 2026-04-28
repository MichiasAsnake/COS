import { describe, expect, it, vi } from "vitest";
import { handleCreateProjectRequest, handleListProjectsRequest, handleParseBriefRequest, handleUpdateProjectRequest } from "@/lib/http/projects";

function jsonRequest(body: unknown) {
  return new Request("http://cos.local/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("phase-two project API handlers", () => {
  it("lists persisted projects", async () => {
    const projects = [
      { id: "project-1", slug: "atlas", name: "Project Atlas", description: null, client_name: "Atlas", status: "active", selected_territory_id: null, created_at: "2026-01-01", updated_at: "2026-01-02" },
    ];

    const response = await handleListProjectsRequest({ listProjects: vi.fn(async () => projects) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ projects });
  });

  it("validates and creates a project with a URL-safe slug", async () => {
    const createProject = vi.fn(async (input) => ({
      id: "project-1",
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      client_name: input.client_name ?? null,
    }));

    const response = await handleCreateProjectRequest(jsonRequest({
      name: "Q3 Launch Sprint",
      clientName: "Atlas Co",
      description: "Campaign development",
      initialBrief: "This is a sufficiently detailed initial client brief for the launch sprint intake flow.",
    }), { createProject });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      project: expect.objectContaining({ slug: "q3-launch-sprint" }),
    }));
    expect(createProject).toHaveBeenCalledWith(expect.objectContaining({
      name: "Q3 Launch Sprint",
      slug: "q3-launch-sprint",
      client_name: "Atlas Co",
      initialBrief: expect.stringContaining("initial client brief"),
    }));
  });

  it("requires an initial brief when creating a project", async () => {
    const createProject = vi.fn();

    const response = await handleCreateProjectRequest(jsonRequest({
      name: "Q3 Launch Sprint",
      clientName: "Atlas Co",
      description: "Campaign development",
      initialBrief: "short",
    }), { createProject });

    expect(response.status).toBe(400);
    expect(createProject).not.toHaveBeenCalled();
  });

  it("returns validation errors before creating incomplete projects", async () => {
    const createProject = vi.fn();

    const response = await handleCreateProjectRequest(jsonRequest({
      name: "Q3 Launch Sprint",
      description: "Campaign development",
      initialBrief: "This is a sufficiently detailed initial client brief for the launch sprint intake flow.",
    }), { createProject });

    expect(response.status).toBe(400);
    expect(createProject).not.toHaveBeenCalled();
  });

  it("updates a project and returns the persisted slug", async () => {
    const updateProject = vi.fn(async () => ({
      id: "project-1",
      slug: "new-launch-name",
      name: "New Launch Name",
      description: "Campaign development",
      client_name: "Atlas Co",
    }));

    const response = await handleUpdateProjectRequest(jsonRequest({ name: "New Launch Name" }), {
      projectSlug: "atlas",
      updateProject,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      project: expect.objectContaining({ slug: "new-launch-name", name: "New Launch Name" }),
    }));
    expect(updateProject).toHaveBeenCalledWith("atlas", { name: "New Launch Name" });
  });

  it("validates parse-brief requests before running the agent", async () => {
    const runBriefIntelligenceWorkflow = vi.fn();

    const response = await handleParseBriefRequest(jsonRequest({ rawBrief: "short" }), {
      projectSlug: "atlas",
      model: "gpt-test",
      runBriefIntelligenceWorkflow,
    });

    expect(response.status).toBe(400);
    expect(runBriefIntelligenceWorkflow).not.toHaveBeenCalled();
  });

  it("returns persisted brief intelligence from the workflow", async () => {
    const runBriefIntelligenceWorkflow = vi.fn(async () => ({
      project: { id: "project-1", slug: "atlas", name: "Project Atlas" },
      input: { id: "input-1" },
      agentRun: { id: "run-1" },
      output: {
        id: "output-1",
        content: {
          audience: "Creative leads",
          core_insight: "Clarity before assets.",
          opportunity: "Structure the work.",
          risks: [],
          missing_information: [],
          recommended_next_step: "Generate territories",
        },
      },
    }));

    const response = await handleParseBriefRequest(jsonRequest({
      rawBrief: "This is a sufficiently detailed messy project brief for testing the parser.",
    }), { projectSlug: "atlas", model: "gpt-test", runBriefIntelligenceWorkflow });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      output: expect.objectContaining({ id: "output-1" }),
    }));
    expect(runBriefIntelligenceWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      projectSlug: "atlas",
      rawBrief: expect.stringContaining("sufficiently detailed"),
      model: "gpt-test",
    }));
  });
});
