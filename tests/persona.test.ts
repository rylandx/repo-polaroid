import { describe, expect, it } from "vitest";
import { createPersona } from "../src/persona.js";
import type { RepoAnalysis } from "../src/types.js";

const baseRepo: Omit<RepoAnalysis, "persona"> = {
  repoName: "demo",
  repoPath: "/tmp/demo",
  fileCount: 8,
  dirCount: 2,
  languages: [{ name: "TypeScript", files: 2, bytes: 100, percent: 100 }],
  health: { readme: true, license: true, tests: true, config: true },
  firstCommitAt: "2026-01-01T00:00:00.000Z",
  lastCommitAt: "2026-01-02T00:00:00.000Z",
  projectAgeDays: 1,
  commitsLast30Days: 6,
  recentActivity: "warming",
  largestDir: "src",
  hotFiles: []
};

describe("createPersona", () => {
  it("returns stable captions for fixed metrics", () => {
    expect(createPersona(baseRepo)).toBe("Tiny TypeScript lab with fresh fingerprints.");
  });

  it("has a fallback for unknown languages", () => {
    expect(createPersona({ ...baseRepo, languages: [], commitsLast30Days: 0, fileCount: 40 })).toBe(
      "Practical mystery code toolkit with its shoes tied."
    );
  });
});
