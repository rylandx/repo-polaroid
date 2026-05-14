import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { analyzeRepo } from "../src/analyzer.js";
import { makeTempDir, initRepo } from "./helpers.js";

describe("analyzeRepo", () => {
  it("rejects non-Git directories", () => {
    const dir = makeTempDir();
    expect(() => analyzeRepo(dir)).toThrow(/Not a Git repository/);
  });

  it("analyzes a committed local Git repository", () => {
    const repo = initRepo({
      "README.md": "# Sample\n",
      "LICENSE": "MIT\n",
      "package.json": "{\"type\":\"module\"}\n",
      "src/index.ts": "export const answer: number = 42;\n",
      "tests/index.test.ts": "import { expect, it } from 'vitest';\n"
    });

    const analysis = analyzeRepo(repo);

    expect(analysis.repoName).toBe(path.basename(repo));
    expect(analysis.fileCount).toBe(5);
    expect(analysis.dirCount).toBe(2);
    expect(analysis.health).toEqual({
      readme: true,
      license: true,
      tests: true,
      config: true
    });
    expect(analysis.languages[0]?.name).toBe("TypeScript");
    expect(analysis.persona).toMatch(/TypeScript/);
  });

  it("respects root .gitignore and common ignored directories", () => {
    const repo = initRepo({
      ".gitignore": "ignored.txt\nsecret/\n",
      "src/index.ts": "export const visible = true;\n",
      "ignored.txt": "hidden\n",
      "secret/key.ts": "hidden\n",
      "node_modules/pkg/index.js": "hidden\n",
      "dist/bundle.js": "hidden\n"
    });

    const analysis = analyzeRepo(repo);

    expect(analysis.fileCount).toBe(2);
    expect(analysis.languages.map((language) => language.name)).toContain("TypeScript");
    expect(analysis.languages.map((language) => language.name)).not.toContain("JavaScript");
  });

  it("detects language percentages stably", () => {
    const repo = initRepo({
      "a.ts": "x".repeat(75),
      "b.js": "x".repeat(25)
    });

    const analysis = analyzeRepo(repo);

    expect(analysis.languages).toEqual([
      { name: "TypeScript", files: 1, bytes: 75, percent: 75 },
      { name: "JavaScript", files: 1, bytes: 25, percent: 25 }
    ]);
  });

  it("rejects Git repositories with no commits", () => {
    const repo = makeTempDir();
    execFileSync("git", ["init"], { cwd: repo, stdio: "ignore" });
    expect(() => analyzeRepo(repo)).toThrow(/no commits/);
  });
});
