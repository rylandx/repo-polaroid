import type { RepoAnalysis } from "./types.js";
import { escapeXml, truncate } from "./svg.js";

export function renderSvg(repo: RepoAnalysis): string {
  const languages = repo.languages.length > 0 ? repo.languages : [{ name: "Unknown", files: 0, bytes: 0, percent: 100 }];
  const healthTags = [
    { label: "README", active: repo.health.readme },
    { label: "LICENSE", active: repo.health.license },
    { label: "TESTS", active: repo.health.tests },
    { label: "CONFIG", active: repo.health.config }
  ];
  const bars = renderLanguageBars(languages);
  const hotLabel = repo.sourceKind === "git" ? "hot" : "notable";
  const recentLabel = repo.sourceKind === "git" ? "30 DAYS" : "RECENT";
  const lastTouchedLabel = repo.sourceKind === "git" ? "last commit" : "last touched";
  const hotFiles =
    repo.hotFiles.length > 0 ? repo.hotFiles.map((file) => truncate(file.path, 26)).join(" · ") : `no ${hotLabel} files yet`;
  const largestDir = repo.largestDir ?? "root";
  const primaryLanguage = languages[0]?.name ?? "Unknown";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="1120" viewBox="0 0 920 1120" role="img" aria-label="${escapeXml(repo.repoName)} repository polaroid">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="20" flood-color="#2b2520" flood-opacity="0.26"/>
    </filter>
    <filter id="paperNoise">
      <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" seed="11"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.055"/>
      </feComponentTransfer>
    </filter>
    <linearGradient id="photo" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#16211f"/>
      <stop offset="45%" stop-color="#314b43"/>
      <stop offset="100%" stop-color="#d8a866"/>
    </linearGradient>
    <linearGradient id="glare" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#fff6df" stop-opacity="0.72"/>
      <stop offset="35%" stop-color="#fff6df" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#fff6df" stop-opacity="0"/>
    </linearGradient>
    <style>
      .title { font: 800 56px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: #fff8e9; letter-spacing: 0; }
      .overline { font: 800 15px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: #e9c38a; letter-spacing: 3px; }
      .label { font: 800 20px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: #513f32; letter-spacing: 0; }
      .text { font: 700 24px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: #302720; }
      .small { font: 600 18px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: #6d5949; }
      .photoSmall { font: 700 18px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: #f7e6c8; }
      .caption { font: 500 37px "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive; fill: #2e251f; }
    </style>
  </defs>

  <rect width="920" height="1120" fill="#b99f7d"/>
  <rect width="920" height="1120" fill="#000" filter="url(#paperNoise)" opacity="0.6"/>
  <circle cx="132" cy="174" r="150" fill="#e3c48d" opacity="0.28"/>
  <circle cx="782" cy="918" r="190" fill="#6f3f34" opacity="0.16"/>
  <path d="M0 806 C190 760 300 832 470 786 C650 738 760 770 920 724 L920 1120 L0 1120 Z" fill="#7f6a51" opacity="0.2"/>

  <g transform="translate(278 26) rotate(-4)">
    <rect x="0" y="0" width="362" height="58" rx="8" fill="#ead7b6" opacity="0.72"/>
    <path d="M18 0 L42 58 M78 0 L102 58 M138 0 L162 58 M198 0 L222 58 M258 0 L282 58 M318 0 L342 58" stroke="#d0ae78" stroke-width="2" opacity="0.38"/>
  </g>

  <g transform="translate(80 54) rotate(-1.4 380 500)" filter="url(#shadow)">
    <rect width="760" height="990" rx="12" fill="#fff8ea"/>
    <rect width="760" height="990" rx="12" fill="#000" filter="url(#paperNoise)" opacity="0.45"/>
    <rect x="34" y="34" width="692" height="646" rx="10" fill="#e7d6bd"/>
    <rect x="48" y="48" width="664" height="618" rx="8" fill="url(#photo)"/>
    <rect x="48" y="48" width="664" height="618" rx="8" fill="#000" filter="url(#paperNoise)" opacity="0.24"/>
    <path d="M48 48 H712 V254 C576 218 458 304 330 268 C210 234 118 152 48 180 Z" fill="url(#glare)"/>
    <rect x="74" y="74" width="612" height="566" rx="3" fill="none" stroke="#fff2d8" stroke-width="2" opacity="0.32"/>
    <circle cx="646" cy="118" r="42" fill="#e75d42" opacity="0.94"/>
    <circle cx="646" cy="118" r="23" fill="#ffd4ab" opacity="0.84"/>
    <circle cx="646" cy="118" r="7" fill="#fff6dc" opacity="0.88"/>

    <text x="86" y="126" class="overline">REPO POLAROID</text>
    <text x="84" y="186" class="title">${escapeXml(truncate(repo.repoName, 17))}</text>
    <text x="86" y="224" class="photoSmall">${escapeXml(primaryLanguage)} · ${escapeXml(repo.sourceKind)} · ${escapeXml(repo.fileCount.toLocaleString())} files · ${escapeXml(repo.recentActivity)}</text>

    <g transform="translate(86 292)">
      <text class="photoSmall" x="0" y="0">language exposure</text>
      ${bars}
    </g>

    <g transform="translate(86 500)">
      ${renderMetricCard(0, "AGE", `${repo.projectAgeDays}d`)}
      ${renderMetricCard(164, recentLabel, `${repo.commitsLast30Days}`)}
      ${renderMetricCard(328, "DIRS", repo.dirCount.toLocaleString())}
    </g>

    <g transform="translate(86 610)">
      <rect x="0" y="-32" width="530" height="42" rx="21" fill="#221c19" opacity="0.34"/>
      <text class="photoSmall" x="22" y="-5">${hotLabel}: ${escapeXml(hotFiles)}</text>
    </g>

    <g transform="translate(82 724)">
      <text class="label" x="0" y="0">field notes</text>
      <text class="text" x="0" y="48">largest room: ${escapeXml(truncate(largestDir, 24))}</text>
      <text class="small" x="0" y="84">${lastTouchedLabel}: ${escapeXml(new Date(repo.lastCommitAt).toISOString().slice(0, 10))}</text>
    </g>

    <g transform="translate(82 856)">
      ${healthTags.map((tag, index) => renderHealthStamp(index * 154, tag.label, tag.active)).join("\n      ")}
    </g>

    <path d="M70 832 C230 820 420 842 694 820" fill="none" stroke="#d7c5aa" stroke-width="2"/>
    <text x="82" y="956" class="caption">${escapeXml(truncate(repo.persona, 44))}</text>
  </g>
</svg>
`;
}

function renderLanguageBars(languages: RepoAnalysis["languages"]): string {
  const palette = ["#f0be6b", "#83b6a7", "#e46d52", "#b59bd6", "#8fb3d9"];
  return languages
    .map((language, index) => {
      const y = 34 + index * 34;
      const width = Math.max(10, Math.round(language.percent * 4.8));
      return `<rect x="0" y="${y}" width="512" height="20" rx="10" fill="#131b1a" opacity="0.38"/>
      <rect x="0" y="${y}" width="${width}" height="20" rx="10" fill="${palette[index % palette.length]}"/>
      <text class="photoSmall" x="${Math.min(530, width + 18)}" y="${y + 17}">${escapeXml(language.name)} ${escapeXml(String(language.percent))}%</text>`;
    })
    .join("\n      ");
}

function renderMetricCard(x: number, label: string, value: string): string {
  return `<g transform="translate(${x} 0)">
      <rect width="138" height="82" rx="12" fill="#fff1ce" opacity="0.2" stroke="#fff3d4" stroke-opacity="0.42"/>
      <text class="overline" x="18" y="28">${escapeXml(label)}</text>
      <text class="title" x="18" y="68" style="font-size:34px">${escapeXml(value)}</text>
    </g>`;
}

function renderHealthStamp(x: number, label: string, active: boolean): string {
  const fill = active ? "#3f7f70" : "#d9c2a1";
  const stroke = active ? "#246052" : "#b69470";
  const text = active ? label : `NO ${label}`;
  return `<g transform="translate(${x} 0)">
      <rect width="136" height="44" rx="4" fill="${fill}" fill-opacity="${active ? "0.95" : "0.55"}" stroke="${stroke}" stroke-width="2"/>
      <text class="small" x="68" y="29" text-anchor="middle" style="fill:${active ? "#fff8e8" : "#6b4f39"}">${escapeXml(text)}</text>
    </g>`;
}
