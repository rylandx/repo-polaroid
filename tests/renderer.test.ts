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
      activityKind: "commits",
      activityCount: 1,
      firstSeenAt: "2026-01-01T00:00:00.000Z",
      lastTouchedAt: "2026-01-02T00:00:00.000Z",
      projectAgeDays: 1,
      commitsLast30Days: 1,
      recentActivity: "quiet",
      largestDir: "src",
      hotFiles: [{ path: "src/index.ts", commits: 1 }],
      notableFiles: [{ path: "src/index.ts", weight: 1, reason: "hot" }],
      persona: "A <sharp> & useful repo"
    };

    const svg = renderSvg(analysis, { theme: "sunset" });

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("#8f3f2b");
    expect(svg).toContain("demo &lt;repo&gt;");
    expect(svg).toContain("A &lt;sharp&gt; &amp; useful repo");
  });

  it("escapes long wrapped text", () => {
    const analysis: RepoAnalysis = {
      sourceKind: "folder",
      repoName: "very-long-<folder>-name-that-keeps-going",
      repoPath: "/tmp/demo",
      fileCount: 20,
      dirCount: 3,
      languages: [{ name: "TypeScript", files: 10, bytes: 100, percent: 100 }],
      health: { readme: true, license: false, tests: true, config: true },
      firstCommitAt: "2026-01-01T00:00:00.000Z",
      lastCommitAt: "2026-01-02T00:00:00.000Z",
      activityKind: "modified-files",
      activityCount: 3,
      firstSeenAt: "2026-01-01T00:00:00.000Z",
      lastTouchedAt: "2026-01-02T00:00:00.000Z",
      projectAgeDays: 1,
      commitsLast30Days: 3,
      recentActivity: "warming",
      largestDir: "src",
      hotFiles: [{ path: "src/<unsafe>&file.ts", commits: 1 }],
      notableFiles: [{ path: "src/<unsafe>&file.ts", weight: 1, reason: "entry" }],
      persona: "A <caption> & a folder with a very long handwritten note"
    };

    const svg = renderSvg(analysis);

    expect(svg).toContain("src/&lt;unsafe&gt;&amp;file.ts");
    expect(svg).toContain("A &lt;caption&gt; &amp; a folder");
    expect(svg).not.toContain("src/<unsafe>&file.ts");
  });
});
