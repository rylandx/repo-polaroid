import type { RepoAnalysis } from "./types.js";

type PersonaInput = Omit<RepoAnalysis, "persona">;

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

export async function createAiPersona(repo: RepoAnalysis): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.REPO_POLAROID_OPENAI_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Write one witty, kind, specific caption under 90 characters for this repository polaroid. No emoji. Repo: ${JSON.stringify({
                  name: repo.repoName,
                  files: repo.fileCount,
                  languages: repo.languages.slice(0, 3),
                  health: repo.health,
                  activity: repo.recentActivity
                })}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { output_text?: string };
    const caption = data.output_text?.trim();
    return caption && caption.length <= 120 ? caption : null;
  } catch {
    return null;
  }
}
