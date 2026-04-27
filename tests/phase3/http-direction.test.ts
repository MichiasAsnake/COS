import { describe, expect, it, vi } from "vitest";
import { handleGenerateTerritoriesRequest, handleGetTerritoriesRequest, handleSelectTerritoryRequest } from "@/lib/http/direction";

function request(body: unknown, method = "POST") {
  return new Request("http://cos.local/api", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("phase-three territory API handlers", () => {
  it("loads persisted territories for a project", async () => {
    const getDirectionWorkspace = vi.fn(async () => ({
      project: { id: "project-1", slug: "atlas", name: "Project Atlas", selected_territory_id: "territory-1" },
      territories: [{ id: "territory-1", title: "Quiet Utility", status: "selected" }],
    }));

    const response = await handleGetTerritoriesRequest({ projectSlug: "atlas", getDirectionWorkspace });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      territories: [expect.objectContaining({ id: "territory-1" })],
    }));
  });

  it("runs the Creative Director workflow when generating territories", async () => {
    const runCreativeTerritoriesWorkflow = vi.fn(async () => ({ outputs: [{ id: "territory-1", title: "Quiet Utility" }] }));

    const response = await handleGenerateTerritoriesRequest({
      projectSlug: "atlas",
      model: "gpt-test",
      runCreativeTerritoriesWorkflow,
    });

    expect(response.status).toBe(200);
    expect(runCreativeTerritoriesWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      projectSlug: "atlas",
      model: "gpt-test",
    }));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      outputs: [expect.objectContaining({ id: "territory-1" })],
    }));
  });

  it("validates selection requests before updating the project", async () => {
    const selectTerritoryWorkflow = vi.fn();

    const response = await handleSelectTerritoryRequest(request({ territoryId: "" }, "PATCH"), {
      projectSlug: "atlas",
      selectTerritoryWorkflow,
    });

    expect(response.status).toBe(400);
    expect(selectTerritoryWorkflow).not.toHaveBeenCalled();
  });

  it("selects a territory and returns the updated workflow state", async () => {
    const selectTerritoryWorkflow = vi.fn(async () => ({
      project: { id: "project-1", selected_territory_id: "territory-1" },
      selectedTerritory: { id: "territory-1", title: "Quiet Utility" },
    }));

    const response = await handleSelectTerritoryRequest(request({ territoryId: "territory-1" }, "PATCH"), {
      projectSlug: "atlas",
      selectTerritoryWorkflow,
    });

    expect(response.status).toBe(200);
    expect(selectTerritoryWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      projectSlug: "atlas",
      territoryId: "territory-1",
    }));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      selectedTerritory: expect.objectContaining({ id: "territory-1" }),
    }));
  });
});
