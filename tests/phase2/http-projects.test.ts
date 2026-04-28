import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { handleCreateProjectRequest, handleGetProjectWorkspaceRequest, handleListProjectsRequest, handleParseBriefRequest, handleUpdateProjectRequest } from "@/lib/http/projects";
import { allocateProjectSlug, validateCreateProjectForm, validateRenameProjectName } from "@/lib/project-lifecycle";

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

  it("normalizes duplicate project create failures without leaking persistence internals", async () => {
    const createProject = vi.fn(async () => {
      throw new Error("duplicate key value violates unique constraint projects_slug_key");
    });

    const response = await handleCreateProjectRequest(jsonRequest({
      name: "Q3 Launch Sprint",
      clientName: "Atlas Co",
      description: "Campaign development",
      initialBrief: "This is a sufficiently detailed initial client brief for the launch sprint intake flow.",
    }), { createProject });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(Object.keys(body)).toEqual(["error"]);
    expect(body.error).toMatch(/already exists|retry|unique slug/i);
    expect(body.error).not.toMatch(/duplicate key|unique constraint|projects_slug_key/i);
  });

  it("allocates deterministic project slug suffixes", () => {
    expect(allocateProjectSlug("brand-launch", [])).toBe("brand-launch");
    expect(allocateProjectSlug("brand-launch", ["brand-launch"])).toBe("brand-launch-2");
    expect(allocateProjectSlug("brand-launch", ["brand-launch", "brand-launch-2"])).toBe("brand-launch-3");
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

  it("rejects invalid rename slugs before update dependencies run", async () => {
    const updateProject = vi.fn();

    const response = await handleUpdateProjectRequest(jsonRequest({ name: "New Launch Name" }), {
      projectSlug: "Atlas Q3",
      updateProject,
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: expect.stringMatching(/invalid project slug/i) });
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("normalizes duplicate project rename failures without leaking persistence internals", async () => {
    const updateProject = vi.fn(async () => {
      throw new Error("duplicate key value violates unique constraint projects_slug_key");
    });

    const response = await handleUpdateProjectRequest(jsonRequest({ name: "Existing Launch" }), {
      projectSlug: "atlas",
      updateProject,
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(Object.keys(body)).toEqual(["error"]);
    expect(body.error).toMatch(/already exists|retry|unique slug/i);
    expect(body.error).not.toMatch(/duplicate key|unique constraint|projects_slug_key/i);
  });

  it("serves project workspace data from the project lifecycle API", async () => {
    const workspace = {
      project: { id: "project-1", slug: "atlas", name: "Project Atlas" },
      projects: [],
      stages: [],
      outputs: [],
      agentRuns: [],
      activityEvents: [],
      feedbackEvents: [],
    };

    const response = await handleGetProjectWorkspaceRequest({
      projectSlug: "atlas",
      getProjectWorkspaceData: vi.fn(async () => workspace),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(workspace);
  });

  it("validates lifecycle form state before client submission", () => {
    expect(validateCreateProjectForm({
      name: "Q3",
      clientName: "",
      description: "short",
      initialBrief: "too short",
    })).toMatch(/project name/i);

    expect(validateRenameProjectName("", "Project Atlas")).toMatch(/project name/i);
    expect(validateRenameProjectName("Project Atlas", "Project Atlas")).toMatch(/different/i);
    expect(validateRenameProjectName("New Launch Name", "Project Atlas")).toBeNull();
  });

  it("uses in-app lifecycle modals instead of browser prompts", () => {
    const workspaceSource = readFileSync("components/workspace.tsx", "utf8");
    expect(workspaceSource).not.toContain("window.prompt");
    expect(workspaceSource).toContain("RenameProjectModal");
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
