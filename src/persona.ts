import type { Rarity, RepoAnalysis } from "./types.js";

type PersonaInput = Omit<RepoAnalysis, "persona" | "captionSource" | "personaType" | "personaReasons" | "rarity" | "rarityScore">;
type CaptionProvider = "openai-responses" | "chat-completions";

export type PlayfulProfile = {
  personaType: string;
  personaReasons: string[];
  rarity: Rarity;
  rarityScore: number;
};

export function createPersona(repo: PersonaInput): string {
  const primaryLanguage = repo.languages[0]?.name ?? "mystery code";
  const healthCount = Object.values(repo.health).filter(Boolean).length;

  if (repo.fileCount <= 12 && repo.commitsLast30Days >= 5) {
    return `Tiny ${primaryLanguage} lab with fresh fingerprints.`;
  }

  if (repo.fileCount >= 250 && healthCount <= 1) {
    return `Big old ${primaryLanguage} machine, charming but undocumented.`;
  }

  if (repo.recentActivity === "active" && healthCount >= 3) {
    return `Well-lit ${primaryLanguage} workshop shipping in public.`;
  }

  if (repo.projectAgeDays > 365 && repo.commitsLast30Days <= 1) {
    return `Vintage ${primaryLanguage} artifact, quiet but still standing.`;
  }

  if (repo.health.tests && repo.health.readme) {
    return `Practical ${primaryLanguage} toolkit with its shoes tied.`;
  }

  return `${primaryLanguage} side quest with a readable trail.`;
}

export function createPlayfulProfile(repo: PersonaInput): PlayfulProfile {
  const healthCount = Object.values(repo.health).filter(Boolean).length;
  const languageCount = repo.languages.length;
  const primaryLanguage = repo.languages[0]?.name ?? "mystery code";
  const reasons: string[] = [];

  if (healthCount >= 3) reasons.push("strong project signals");
  if (repo.recentActivity === "active") reasons.push("active recent activity");
  if (repo.projectAgeDays >= 180) reasons.push("has history");
  if (languageCount >= 3) reasons.push("polyglot codebase");
  if (repo.fileCount >= 250) reasons.push("large file tree");
  if (reasons.length === 0) reasons.push(`${repo.sourceKind} snapshot`);

  const personaType = choosePersonaType(repo, healthCount, languageCount, primaryLanguage);
  const rarityScore = scoreRarity(repo, healthCount, languageCount);

  return {
    personaType,
    personaReasons: reasons.slice(0, 3),
    rarity: rarityFromScore(rarityScore),
    rarityScore
  };
}

export async function createAiPersona(repo: RepoAnalysis): Promise<string | null> {
  const apiKey = process.env.REPO_POLAROID_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const provider: CaptionProvider =
      process.env.REPO_POLAROID_API_BASE || process.env.REPO_POLAROID_API_KEY ? "chat-completions" : "openai-responses";
    const caption =
      provider === "chat-completions" ? await createChatCompletionCaption(repo, apiKey) : await createOpenAiResponseCaption(repo, apiKey);
    return cleanCaption(caption);
  } catch {
    return null;
  }
}

async function createOpenAiResponseCaption(repo: RepoAnalysis, apiKey: string): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.REPO_POLAROID_MODEL ?? process.env.REPO_POLAROID_OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: captionPrompt(repo)
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { output_text?: string };
  return data.output_text?.trim() ?? null;
}

async function createChatCompletionCaption(repo: RepoAnalysis, apiKey: string): Promise<string | null> {
  const baseUrl = (process.env.REPO_POLAROID_API_BASE ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const body: Record<string, unknown> = {
    model: process.env.REPO_POLAROID_MODEL ?? process.env.REPO_POLAROID_OPENAI_MODEL ?? "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: captionPrompt(repo)
      }
    ],
    temperature: 0.8,
    max_tokens: 200
  };
  if (baseUrl.includes("deepseek.com")) {
    body.thinking = { type: "disabled" };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

function cleanCaption(caption: string | null): string | null {
  if (!caption) return null;
  const cleaned = caption.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ");
  if (!cleaned) return null;
  return cleaned.length <= 120 ? cleaned : `${cleaned.slice(0, 117)}...`;
}

function captionPrompt(repo: RepoAnalysis): string {
  return `Write one witty, kind, specific caption under 90 characters for this repository polaroid. No emoji. Repo: ${JSON.stringify({
    name: repo.repoName,
    files: repo.fileCount,
    languages: repo.languages.slice(0, 3),
    health: repo.health,
    activity: repo.recentActivity,
    source: repo.sourceKind
  })}`;
}

function choosePersonaType(repo: PersonaInput, healthCount: number, languageCount: number, primaryLanguage: string): string {
  if (repo.fileCount >= 500 || repo.dirCount >= 80) return "Monorepo Machine";
  if (repo.sourceKind === "folder") return "Prototype Lab";
  if (languageCount >= 3) return "Polyglot Studio";
  if (repo.recentActivity === "active" && healthCount >= 3) return "Shipping Workshop";
  if (repo.projectAgeDays > 365 && repo.activityCount <= 1) return "Quiet Library";
  if (repo.health.tests && repo.health.readme) return `${primaryLanguage} Toolkit`;
  return "Weekend Hacker";
}

function scoreRarity(repo: PersonaInput, healthCount: number, languageCount: number): number {
  const healthScore = healthCount * 10;
  const activityScore = Math.min(20, repo.activityCount * (repo.activityKind === "commits" ? 3 : 1));
  const ageScore = Math.min(15, Math.floor(repo.projectAgeDays / 30));
  const fileScore = Math.min(15, Math.floor(repo.fileCount / 25));
  const languageScore = Math.min(10, languageCount * 2);
  const sourceScore = repo.sourceKind === "git" ? 5 : 0;
  return Math.min(100, healthScore + activityScore + ageScore + fileScore + languageScore + sourceScore);
}

function rarityFromScore(score: number): Rarity {
  if (score >= 80) return "Legendary";
  if (score >= 60) return "Epic";
  if (score >= 35) return "Rare";
  return "Common";
}
