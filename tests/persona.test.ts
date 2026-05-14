import { afterEach, describe, expect, it, vi } from "vitest";
import { createAiPersona, createPersona, createPlayfulProfile } from "../src/persona.js";
import type { RepoAnalysis } from "../src/types.js";

const baseRepo: Omit<RepoAnalysis, "persona" | "captionSource" | "personaType" | "personaReasons" | "rarity" | "rarityScore"> = {
  sourceKind: "git",
  repoName: "demo",
  repoPath: "/tmp/demo",
  fileCount: 8,
  dirCount: 2,
  languages: [{ name: "TypeScript", files: 2, bytes: 100, percent: 100 }],
  health: { readme: true, license: true, tests: true, config: true },
  firstCommitAt: "2026-01-01T00:00:00.000Z",
  lastCommitAt: "2026-01-02T00:00:00.000Z",
  activityKind: "commits",
  activityCount: 6,
  firstSeenAt: "2026-01-01T00:00:00.000Z",
  lastTouchedAt: "2026-01-02T00:00:00.000Z",
  projectAgeDays: 1,
  commitsLast30Days: 6,
  recentActivity: "warming",
  largestDir: "src",
  hotFiles: [],
  notableFiles: [],
  repoWeather: "Spring Clean"
};

const fullRepo: RepoAnalysis = {
  ...baseRepo,
  persona: "local caption",
  captionSource: "local",
  personaType: "TypeScript Toolkit",
  personaReasons: ["strong project signals"],
  rarity: "Epic",
  rarityScore: 65
};

describe("createPersona", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.REPO_POLAROID_API_KEY;
    delete process.env.REPO_POLAROID_API_BASE;
    delete process.env.REPO_POLAROID_MODEL;
    delete process.env.OPENAI_API_KEY;
  });

  it("returns stable captions for fixed metrics", () => {
    expect(createPersona(baseRepo)).toBe("Tiny TypeScript lab with fresh fingerprints.");
  });

  it("has a fallback for unknown languages", () => {
    expect(createPersona({ ...baseRepo, languages: [], commitsLast30Days: 0, fileCount: 40 })).toBe(
      "Practical mystery code toolkit with its shoes tied."
    );
  });

  it("creates stable persona badges and rarity", () => {
    expect(createPlayfulProfile(baseRepo)).toEqual({
      personaType: "TypeScript Toolkit",
      personaReasons: ["strong project signals"],
      rarity: "Epic",
      rarityScore: 65
    });
  });

  it("uses OpenAI-compatible chat completions when a custom API base is configured", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "DeepSeek caption" } }]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    process.env.REPO_POLAROID_API_KEY = "test-key";
    process.env.REPO_POLAROID_API_BASE = "https://api.deepseek.com";
    process.env.REPO_POLAROID_MODEL = "deepseek-v4-pro";

    await expect(createAiPersona(fullRepo)).resolves.toBe("DeepSeek caption");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"thinking\":{\"type\":\"disabled\"}")
      })
    );
  });

  it("cleans long AI captions instead of falling back", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: `"${"Specific caption ".repeat(12)}"` } }]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    process.env.REPO_POLAROID_API_KEY = "test-key";
    process.env.REPO_POLAROID_API_BASE = "https://api.deepseek.com";

    const caption = await createAiPersona(fullRepo);

    expect(caption).toHaveLength(120);
    expect(caption?.startsWith("\"")).toBe(false);
    expect(caption?.endsWith("...")).toBe(true);
  });
});
