import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { makeTempDir, initRepo } from "./helpers.js";

const cli = path.resolve("src/cli.ts");

describe("CLI", () => {
  it("writes an SVG with --out", () => {
    const repo = initRepo({
      "README.md": "# Demo\n",
      "src/index.ts": "export const demo = true;\n"
    });
    const out = path.join(makeTempDir(), "out.svg");

    execFileSync("npx", ["tsx", cli, repo, "--out", out], { encoding: "utf8" });

    expect(fs.readFileSync(out, "utf8")).toContain("<svg");
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
