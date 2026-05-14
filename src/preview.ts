import fs from "node:fs";
import path from "node:path";
import type { RepoAnalysis, ThemeName } from "./types.js";
import { escapeXml } from "./svg.js";

export type PreviewOptions = {
  outPath: string;
  theme: ThemeName;
};

export function writePreviewHtml(repo: RepoAnalysis, options: PreviewOptions): string {
  const previewPath = path.join(path.dirname(options.outPath), "repo-polaroid-preview.html");
  const svgPath = path.basename(options.outPath);
  fs.writeFileSync(previewPath, renderPreviewHtml(repo, svgPath, options.theme), "utf8");
  return previewPath;
}

export function renderPreviewHtml(repo: RepoAnalysis, svgPath: string, theme: ThemeName): string {
  const markdown = `![Repo Polaroid](./${svgPath})`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeXml(repo.repoName)} Repo Polaroid Preview</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background: #171717; color: #f8f1e7; }
    main { width: min(1120px, calc(100vw - 40px)); margin: 0 auto; padding: 40px 0 56px; display: grid; grid-template-columns: minmax(280px, 520px) 1fr; gap: 40px; align-items: start; }
    img { width: 100%; height: auto; border-radius: 10px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.38); }
    h1 { margin: 0 0 10px; font-size: clamp(34px, 7vw, 72px); line-height: 0.95; letter-spacing: 0; }
    p { color: #d8c7b4; font-size: 18px; line-height: 1.55; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 12px 18px; margin: 28px 0; }
    dt { color: #bda58f; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 0.12em; }
    dd { margin: 0; color: #fff6ea; font-weight: 700; }
    code { display: block; padding: 16px; border-radius: 8px; background: #26211d; color: #ffe0aa; overflow-wrap: anywhere; }
    @media (max-width: 820px) { main { grid-template-columns: 1fr; padding-top: 24px; } }
  </style>
</head>
<body>
  <main>
    <img src="./${escapeXml(svgPath)}" alt="${escapeXml(repo.repoName)} repo polaroid">
    <section>
      <h1>${escapeXml(repo.repoName)}</h1>
      <p>${escapeXml(repo.persona)}</p>
      <dl>
        <dt>Theme</dt><dd>${escapeXml(theme)}</dd>
        <dt>Caption</dt><dd>${escapeXml(repo.captionSource)}</dd>
        <dt>Persona</dt><dd>${escapeXml(repo.personaType)}</dd>
        <dt>Rarity</dt><dd>${escapeXml(repo.rarity)} (${escapeXml(String(repo.rarityScore))})</dd>
        <dt>Source</dt><dd>${escapeXml(repo.sourceKind)}</dd>
      </dl>
      <code>${escapeXml(markdown)}</code>
    </section>
  </main>
</body>
</html>
`;
}
