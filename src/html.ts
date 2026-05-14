import type { RepoAnalysis, ThemeName } from "./types.js";
import { escapeXml } from "./svg.js";

export function renderStandaloneHtml(repo: RepoAnalysis, svg: string, theme: ThemeName, markdown: string, shareText: string): string {
  return htmlShell(`${repo.repoName} Repo Polaroid`, `<main class="single">
    <section class="card">${svg}</section>
    <aside>
      <p class="eyebrow">Repo Polaroid</p>
      <h1>${escapeXml(repo.repoName)}</h1>
      <p>${escapeXml(repo.persona)}</p>
      <dl>
        <dt>Theme</dt><dd>${escapeXml(theme)}</dd>
        <dt>Weather</dt><dd>${escapeXml(repo.repoWeather)}</dd>
        <dt>Persona</dt><dd>${escapeXml(repo.personaType)}</dd>
        <dt>Rarity</dt><dd>${escapeXml(repo.rarity)} (${escapeXml(String(repo.rarityScore))})</dd>
      </dl>
      <h2>Embed</h2>
      <code>${escapeXml(markdown)}</code>
      <h2>Share</h2>
      <code>${escapeXml(shareText)}</code>
    </aside>
  </main>`);
}

export function renderCompareHtml(before: RepoAnalysis, beforeSvg: string, after: RepoAnalysis, afterSvg: string): string {
  return htmlShell(`Compare ${before.repoName} and ${after.repoName}`, `<main>
    <header>
      <p class="eyebrow">Repo Polaroid Compare</p>
      <h1>${escapeXml(before.repoName)} vs ${escapeXml(after.repoName)}</h1>
    </header>
    <section class="grid">
      <article><h2>Before</h2>${beforeSvg}</article>
      <article><h2>After</h2>${afterSvg}</article>
    </section>
  </main>`);
}

export function renderAlbumHtml(repos: Array<{ analysis: RepoAnalysis; svg: string }>): string {
  const cards = repos
    .map(
      ({ analysis, svg }) => `<article>
        ${svg}
        <h2>${escapeXml(analysis.repoName)}</h2>
        <p>${escapeXml(analysis.personaType)} · ${escapeXml(analysis.rarity)} · ${escapeXml(analysis.repoWeather)}</p>
      </article>`
    )
    .join("\n");

  return htmlShell("Repo Polaroid Album", `<main>
    <header>
      <p class="eyebrow">Repo Polaroid Album</p>
      <h1>${repos.length} project snapshots</h1>
    </header>
    <section class="album">${cards}</section>
  </main>`);
}

function htmlShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeXml(title)}</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background: #151312; color: #fff7ec; }
    main { width: min(1180px, calc(100vw - 40px)); margin: 0 auto; padding: 40px 0 64px; }
    .single { display: grid; grid-template-columns: minmax(280px, 520px) 1fr; gap: 44px; align-items: start; }
    .card svg, article svg { width: 100%; height: auto; display: block; }
    h1 { margin: 0 0 16px; font-size: clamp(36px, 7vw, 76px); line-height: 0.95; letter-spacing: 0; }
    h2 { margin: 22px 0 10px; }
    p { color: #d9c9b6; font-size: 18px; line-height: 1.55; }
    .eyebrow { color: #f7bd66; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; font-size: 12px; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 10px 16px; margin: 28px 0; }
    dt { color: #bda58f; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; }
    dd { margin: 0; color: #fff6ea; font-weight: 700; }
    code { display: block; padding: 16px; border-radius: 8px; background: #26211d; color: #ffe0aa; overflow-wrap: anywhere; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; }
    .album { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 28px; }
    article { min-width: 0; }
    @media (max-width: 820px) { .single, .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}
