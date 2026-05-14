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
      themeInput: "darkroom",
      maxFiles: 10,
      writeReadme: false,
      readme: null,
      preview: false,
      format: "svg",
      profile: false,
      inPlace: false,
      share: false,
      at: null
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
      themeInput: "classic",
      maxFiles: 20000,
      writeReadme: true,
      readme: "README.custom.md",
      preview: true,
      format: "svg",
      profile: false,
      inPlace: false,
      share: false,
      at: null
    });
  });

  it("parses play options", () => {
    expect(parseArgs([".", "--theme", "auto", "--format", "html", "--profile", "--in-place", "--share", "--at", "HEAD~1"])).toMatchObject({
      themeInput: "auto",
      format: "html",
      profile: true,
      inPlace: true,
      share: true,
      at: "HEAD~1"
    });
  });

  it("rejects invalid theme and max-files options", () => {
    expect(() => parseArgs(["--theme", "neon"])).toThrow(/Invalid theme/);
    expect(() => parseArgs(["--max-files", "0"])).toThrow(/positive integer/);
    expect(() => parseArgs(["--format", "pdf"])).toThrow(/Invalid format/);
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

  it("writes standalone HTML output", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });
    const out = path.join(makeTempDir(), "card.html");

    execFileSync("npx", ["tsx", cli, repo, "--format", "html", "--theme", "terminal", "--out", out], { encoding: "utf8" });

    const html = fs.readFileSync(out, "utf8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<svg");
    expect(html).toContain("Repo Polaroid");
  });

  it("writes PNG output", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });
    const out = path.join(makeTempDir(), "card.png");

    execFileSync("npx", ["tsx", cli, repo, "--format", "png", "--out", out], { encoding: "utf8" });

    expect(fs.readFileSync(out).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("writes profile SVG output", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });
    const out = path.join(makeTempDir(), "profile.svg");

    execFileSync("npx", ["tsx", cli, repo, "--profile", "--out", out], { encoding: "utf8" });

    expect(fs.readFileSync(out, "utf8")).toContain('width="1280"');
  });

  it("writes the default file into the input directory with --in-place", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });

    execFileSync("npx", ["tsx", cli, repo, "--in-place"], { encoding: "utf8" });

    expect(fs.existsSync(path.join(repo, "repo-polaroid.svg"))).toBe(true);
  });

  it("renders a Git ref with --at", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "index.ts": "export const demo = true;\n"
    });
    fs.writeFileSync(path.join(repo, "later.js"), "console.log('later');\n", "utf8");
    execFileSync("git", ["add", "."], { cwd: repo, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "later"], { cwd: repo, stdio: "ignore" });

    const stdout = execFileSync("npx", ["tsx", cli, repo, "--at", "HEAD~1", "--json"], { encoding: "utf8" });
    const data = JSON.parse(stdout);

    expect(data.languages.map((language: { name: string }) => language.name)).toContain("TypeScript");
    expect(data.languages.map((language: { name: string }) => language.name)).not.toContain("JavaScript");
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

  it("writes an album page for child folders", () => {
    const root = makeTempDir();
    fs.mkdirSync(path.join(root, "one"), { recursive: true });
    fs.mkdirSync(path.join(root, "two"), { recursive: true });
    fs.writeFileSync(path.join(root, "one", "index.ts"), "export const one = 1;\n", "utf8");
    fs.writeFileSync(path.join(root, "two", "index.js"), "export const two = 2;\n", "utf8");
    const out = path.join(makeTempDir(), "album.html");

    execFileSync("npx", ["tsx", cli, "album", root, "--out", out, "--theme", "auto"], { encoding: "utf8" });

    const html = fs.readFileSync(out, "utf8");
    expect(html).toContain("Repo Polaroid Album");
    expect(html).toContain("one");
    expect(html).toContain("two");
  });

  it("skips unreadable album children and keeps going", () => {
    const root = makeTempDir();
    fs.mkdirSync(path.join(root, "small"), { recursive: true });
    fs.mkdirSync(path.join(root, "large"), { recursive: true });
    fs.writeFileSync(path.join(root, "small", "index.ts"), "export const one = 1;\n", "utf8");
    fs.writeFileSync(path.join(root, "large", "a.ts"), "a", "utf8");
    fs.writeFileSync(path.join(root, "large", "b.ts"), "b", "utf8");
    const out = path.join(makeTempDir(), "album.html");

    execFileSync("npx", ["tsx", cli, "album", root, "--out", out, "--max-files", "1"], { encoding: "utf8" });

    const html = fs.readFileSync(out, "utf8");
    expect(html).toContain("small");
    expect(html).not.toContain("<h2>large</h2>");
  });

  it("writes a compare page for two paths", () => {
    const before = makeTempDir();
    const after = makeTempDir();
    fs.writeFileSync(path.join(before, "index.ts"), "export const before = 1;\n", "utf8");
    fs.writeFileSync(path.join(after, "index.ts"), "export const after = 2;\n", "utf8");
    const out = path.join(makeTempDir(), "compare.html");

    execFileSync("npx", ["tsx", cli, "compare", before, after, "--out", out], { encoding: "utf8" });

    expect(fs.readFileSync(out, "utf8")).toContain("Repo Polaroid Compare");
  });
});
