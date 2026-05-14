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
      maxFiles: 10,
      writeReadme: false,
      readme: null,
      preview: false
    });
  });

  it("parses readme and preview options", () => {
    expect(parseArgs([".", "--out", "out.svg", "--write-readme", "--readme", "README.custom.md", "--preview"])).toEqual({
      repoPath: ".",
      out: "out.svg",
      json: false,
      captionAi: false,
      open: false,
      theme: "classic",
      maxFiles: 20000,
      writeReadme: true,
      readme: "README.custom.md",
      preview: true
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

  it("writes README embed when requested", () => {
    const repo = initRepo({
      "README.md": "# Demo\n\nExisting docs.\n",
      "index.ts": "export const demo = true;\n"
    });
    const out = path.join(repo, "repo-polaroid.svg");

    execFileSync("npx", ["tsx", cli, repo, "--out", out, "--write-readme"], { encoding: "utf8" });

    const readme = fs.readFileSync(path.join(repo, "README.md"), "utf8");
    expect(readme).toContain("<!-- repo-polaroid:start -->");
    expect(readme).toContain("![Repo Polaroid](./repo-polaroid.svg)");
  });

  it("keeps JSON stdout parseable when writing SVG and README", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.js": "console.log('demo');\n"
    });
    const out = path.join(repo, "repo-polaroid.svg");

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--json", "--out", out, "--write-readme"], { encoding: "utf8" });
    const data = JSON.parse(stdout);

    expect(data.captionSource).toBe("local");
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.readFileSync(path.join(repo, "README.md"), "utf8")).toContain("repo-polaroid.svg");
  });

  it("writes and opens a preview page when requested", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });
    const outDir = makeTempDir();
    const out = path.join(outDir, "preview.svg");

    execFileSync("npx", ["tsx", cli, repo, "--preview", "--out", out], {
      encoding: "utf8",
      env: { ...process.env, REPO_POLAROID_OPEN_COMMAND: "true" }
    });

    const preview = path.join(outDir, "repo-polaroid-preview.html");
    expect(fs.readFileSync(preview, "utf8")).toContain("Repo Polaroid Preview");
  });

  it("rejects preview in JSON-only mode", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });

    expect(() => execFileSync("npx", ["tsx", cli, repo, "--json", "--preview"], { encoding: "utf8" })).toThrow(/--preview requires --out/);
  });

  it("falls back when --caption-ai has no API key", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });
    const out = path.join(makeTempDir(), "ai.svg");

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--caption-ai", "--out", out], {
      encoding: "utf8",
      env: { ...process.env, OPENAI_API_KEY: "", REPO_POLAROID_API_KEY: "", REPO_POLAROID_API_BASE: "" }
    });

    expect(stdout).toContain("Repo polaroid written");
    expect(fs.existsSync(out)).toBe(true);
  });

  it("marks JSON caption source as fallback when caption AI has no key", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--caption-ai", "--json"], {
      encoding: "utf8",
      env: { ...process.env, OPENAI_API_KEY: "", REPO_POLAROID_API_KEY: "", REPO_POLAROID_API_BASE: "" }
    });
    const data = JSON.parse(stdout);

    expect(data.captionSource).toBe("fallback");
  });
});
