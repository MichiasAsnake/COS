import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { envKeys } from "@/lib/env";

describe("environment example", () => {
  it("documents every server env key used by phase one", () => {
    const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");

    for (const key of envKeys) {
      expect(envExample).toContain(`${key}=`);
    }
  });
});
