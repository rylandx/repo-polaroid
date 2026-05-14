import { describe, expect, it } from "vitest";
import { renderSvg } from "../src/renderer.js";
import { escapeXml } from "../src/svg.js";
import type { RepoAnalysis } from "../src/types.js";

describe("SVG rendering", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml("<tag attr=\"x\">&'</tag>")).toBe("&lt;tag attr=&quot;x&quot;&gt;&amp;&apos;&lt;/tag&gt;");
  });

  it("renders a standalone SVG", () => {
    const analysis: RepoAnalysis = {
      sourceKind: "git",
      repoName: "demo <repo>",
      repoPath: "/tmp/demo",
      fileCount: 2,
      dirCount: 1,
      languages: [{ name: "TypeScript", files: 1, bytes: 10, percent: 100 }],
      health: { readme: true, license: false, tests: true, config: true },
      firstCommitAt: "2026-01-01T00:00:00.000Z",
      lastCommitAt: "2026-01-02T00:00:00.000Z",
      projectAgeDays: 1,
      commitsLast30Days: 1,
      recentActivity: "quiet",
      largestDir: "src",
      hotFiles: [{ path: "src/index.ts", commits: 1 }],
      persona: "A <sharp> & useful repo"
    };

    const svg = renderSvg(analysis);

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("demo &lt;repo&gt;");
    expect(svg).toContain("A &lt;sharp&gt; &amp; useful repo");
  });
});
