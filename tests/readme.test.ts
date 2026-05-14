import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { upsertEmbed, writeReadmeEmbed } from "../src/readme.js";
import { makeTempDir } from "./helpers.js";

describe("README embed", () => {
  it("replaces an existing marker block", () => {
    const next = upsertEmbed(
      "# Demo\n\n<!-- repo-polaroid:start -->\nold\n<!-- repo-polaroid:end -->\n\nText.\n",
      "![Repo Polaroid](./repo-polaroid.svg)"
    );

    expect(next).toContain("![Repo Polaroid](./repo-polaroid.svg)");
    expect(next).not.toContain("\nold\n");
  });

  it("inserts after the title when no marker exists", () => {
    const next = upsertEmbed("# Demo\n\nText.\n", "![Repo Polaroid](./repo-polaroid.svg)");

    expect(next).toBe("# Demo\n\n<!-- repo-polaroid:start -->\n![Repo Polaroid](./repo-polaroid.svg)\n<!-- repo-polaroid:end -->\n\nText.\n");
  });

  it("creates an empty README with an embed block", () => {
    const dir = makeTempDir();
    const out = path.join(dir, "repo-polaroid.svg");

    const readme = writeReadmeEmbed({ repoPath: dir, outPath: out });

    expect(readme).toBe(path.join(dir, "README.md"));
    expect(fs.readFileSync(readme, "utf8")).toContain("![Repo Polaroid](./repo-polaroid.svg)");
  });
});
