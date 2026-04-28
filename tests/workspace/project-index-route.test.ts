import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("project index route", () => {
  it("keeps root from auto-opening the first project and exposes a project index page", () => {
    expect(existsSync("app/projects/page.tsx")).toBe(true);

    const rootPage = source("app/page.tsx");
    const projectPage = source("app/projects/page.tsx");
    const projectIndex = source("components/project-index-page.tsx");

    expect(rootPage).toContain('redirect("/projects")');
    expect(rootPage).not.toContain("redirect(`/projects/${projects[0].slug}`)");
    expect(projectPage).toContain("listProjects()");
    expect(projectPage).toContain("<ProjectIndexPage projects={projects} />");
    expect(projectIndex).toContain("Choose a real COS workspace");
    expect(projectIndex).toContain("router.push(`/projects/${project.slug}`)");
  });

  it("routes the Workspace > Projects navigation item to the persisted project index", () => {
    const workspace = source("components/workspace.tsx");
    const sidebar = source("components/layout/sidebar.tsx");

    expect(workspace).toContain("const handleNav = useCallback");
    expect(workspace).toContain('if (id === "projects") router.push("/projects")');
    expect(workspace).toContain("onNav={handleNav}");
    expect(sidebar).toContain('title={it.id === "projects" ? "Open project index"');
  });

  it("adds route segment boundaries and project index styling", () => {
    expect(existsSync("app/projects/loading.tsx")).toBe(true);
    expect(existsSync("app/projects/error.tsx")).toBe(true);

    const css = source("app/globals.css");
    for (const selector of [".project-index", ".project-index-hero", ".project-grid", ".project-card", ".status-pill"]) {
      expect(css).toContain(selector);
    }
  });
});
