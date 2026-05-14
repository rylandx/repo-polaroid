import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli.js";
import { makeTempDir, initRepo } from "./helpers.js";

const cli = path.resolve("src/cli.ts");

describe("CLI", () => {
  it("parses polish options", () => {
    expect(parseArgs([".", "--open", "--theme", "darkroom", "--max-files", "10"])).toEqual({
      repoPath: ".",
      out: null,
      json: false,
      captionAi: false,
      open: true,
      theme: "darkroom",
      maxFiles: 10
    });
  });

  it("rejects invalid theme and max-files options", () => {
    expect(() => parseArgs(["--theme", "neon"])).toThrow(/Invalid theme/);
    expect(() => parseArgs(["--max-files", "0"])).toThrow(/positive integer/);
  });

  it("writes an SVG with --out", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "src/index.ts": "export const demo = true;\n"
    });
    const out = path.join(makeTempDir(), "out.svg");

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--out", out], { encoding: "utf8" });

    expect(fs.readFileSync(out, "utf8")).toContain("<svg");
    expect(stdout).toContain("![Repo Polaroid](");
  });

  it("prints parseable JSON with --json", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.js": "console.log('demo');\n"
    });

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--json"], { encoding: "utf8" });
    const data = JSON.parse(stdout);

    expect(data.repoName).toBe(path.basename(repo));
    expect(data.languages[0].name).toBe("JavaScript");
  });

  it("prints folder-mode JSON for plain directories", () => {
    const repo = makeTempDir();
    fs.mkdirSync(path.join(repo, "src"), { recursive: true });
    fs.writeFileSync(path.join(repo, "src/index.ts"), "export const demo = true;\n", "utf8");

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--json"], { encoding: "utf8" });
    const data = JSON.parse(stdout);

    expect(data.sourceKind).toBe("folder");
    expect(data.activityKind).toBe("modified-files");
    expect(data.activityCount).toBe(1);
    expect(data.firstSeenAt).toBeDefined();
    expect(data.lastTouchedAt).toBeDefined();
    expect(data.notableFiles.length).toBeGreaterThan(0);
    expect(data.commitsLast30Days).toBe(1);
    expect(data.repoName).toBe(path.basename(repo));
  });

  it("writes an SVG for plain directories", () => {
    const repo = makeTempDir();
    fs.mkdirSync(path.join(repo, "src"), { recursive: true });
    fs.writeFileSync(path.join(repo, "src/index.ts"), "export const demo = true;\n", "utf8");
    const out = path.join(makeTempDir(), "folder.svg");

    execFileSync("npx", ["tsx", cli, repo, "--out", out], { encoding: "utf8" });

    expect(fs.readFileSync(out, "utf8")).toContain("<svg");
  });

  it("writes a themed SVG", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });
    const out = path.join(makeTempDir(), "darkroom.svg");

    execFileSync("npx", ["tsx", cli, repo, "--theme", "darkroom", "--out", out], { encoding: "utf8" });

    expect(fs.readFileSync(out, "utf8")).toContain("#171717");
  });

  it("opens an SVG when --open is provided", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });
    const out = path.join(makeTempDir(), "open.svg");

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--open", "--out", out], {
      encoding: "utf8",
      env: { ...process.env, REPO_POLAROID_OPEN_COMMAND: "true" }
    });

    expect(stdout).toContain("Opened");
    expect(fs.existsSync(out)).toBe(true);
  });

  it("keeps stdout parseable when --json and --out are combined", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.js": "console.log('demo');\n"
    });
    const out = path.join(makeTempDir(), "out.svg");

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--json", "--out", out], { encoding: "utf8" });
    const data = JSON.parse(stdout);

    expect(data.repoName).toBe(path.basename(repo));
    expect(fs.existsSync(out)).toBe(true);
  });

  it("falls back when --caption-ai has no API key", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });
    const out = path.join(makeTempDir(), "ai.svg");

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--caption-ai", "--out", out], {
      encoding: "utf8",
      env: { ...process.env, OPENAI_API_KEY: "" }
    });

    expect(stdout).toContain("Repo polaroid written");
    expect(fs.existsSync(out)).toBe(true);
  });
});
