import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { analyzeRepo } from "../src/analyzer.js";
import { makeTempDir, initRepo } from "./helpers.js";

describe("analyzeRepo", () => {
  it("analyzes non-Git directories in folder mode", () => {
    const dir = makeTempDir();
    writeFiles(dir, {
      "README.md": "# Plain folder\n",
      "package.json": "{\"type\":\"module\"}\n",
      "src/index.ts": "export const value = 1;\n",
      "tests/index.test.ts": "expect(value).toBe(1);\n"
    });

    const analysis = analyzeRepo(dir);

    expect(analysis.sourceKind).toBe("folder");
    expect(analysis.repoName).toBe(path.basename(dir));
    expect(analysis.fileCount).toBe(4);
    expect(analysis.dirCount).toBe(2);
    expect(analysis.health).toEqual({
      readme: true,
      license: false,
      tests: true,
      config: true
    });
    expect(analysis.languages[0]?.name).toBe("TypeScript");
    expect(analysis.commitsLast30Days).toBe(4);
    expect(analysis.hotFiles.length).toBeGreaterThan(0);
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

    expect(analysis.sourceKind).toBe("git");
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

  it("respects ignores in folder mode", () => {
    const dir = makeTempDir();
    writeFiles(dir, {
      ".gitignore": "ignored.txt\nsecret/\n",
      "src/index.ts": "export const visible = true;\n",
      "ignored.txt": "hidden\n",
      "secret/key.ts": "hidden\n",
      "node_modules/pkg/index.js": "hidden\n",
      "dist/bundle.js": "hidden\n"
    });

    const analysis = analyzeRepo(dir);

    expect(analysis.sourceKind).toBe("folder");
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

  it("falls back to folder mode for Git repositories with no commits", () => {
    const repo = makeTempDir();
    execFileSync("git", ["init"], { cwd: repo, stdio: "ignore" });
    writeFiles(repo, {
      "README.md": "# Uncommitted\n",
      "index.ts": "export const value = 1;\n"
    });

    const analysis = analyzeRepo(repo);

    expect(analysis.sourceKind).toBe("folder");
    expect(analysis.fileCount).toBe(2);
  });
});

function writeFiles(root: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }
}
