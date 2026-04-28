import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repo = process.cwd();

describe("Supabase phase-one SQL", () => {
  it("defines the decided slug route and output version lineage in the migration", () => {
    const migration = readFileSync(join(repo, "supabase/migrations/0001_initial_schema.sql"), "utf8");

    expect(migration).toContain("slug text not null unique");
    expect(migration).toContain("parent_output_id uuid references outputs(id) on delete set null");
    expect(migration).toContain("create trigger workflow_stages_updated_at");
  });

  it("seeds Project Atlas at the atlas slug as persisted starter data", () => {
    const seed = readFileSync(join(repo, "supabase/seed.sql"), "utf8");

    expect(seed).toContain("'atlas'");
    expect(seed).toContain("Project Atlas — Q3 Launch");
    expect(seed).toContain("brief_intelligence");
    expect(seed).toContain("territory");
  });

  it("keeps the reference schema runnable as plain SQL", () => {
    const schema = readFileSync(join(repo, "SUPABASE_SCHEMA.sql"), "utf8");

    expect(schema.trimStart()).toMatch(/^create extension/i);
    expect(schema).not.toContain("```");
  });
});
