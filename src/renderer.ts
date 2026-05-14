import type { RepoAnalysis } from "./types.js";
import { escapeXml, truncate } from "./svg.js";

type RenderOptions = {
  theme?: "classic" | "darkroom" | "sunset";
};

type Theme = {
  background: string;
  paper: string;
  photoStart: string;
  photoMid: string;
  photoEnd: string;
  title: string;
  overline: string;
  label: string;
  text: string;
  small: string;
  photoText: string;
  accent: string;
  accentSoft: string;
};

const THEMES: Record<Required<RenderOptions>["theme"], Theme> = {
  classic: {
    background: "#b99f7d",
    paper: "#fff8ea",
    photoStart: "#16211f",
    photoMid: "#314b43",
    photoEnd: "#d8a866",
    title: "#fff8e9",
    overline: "#e9c38a",
    label: "#513f32",
    text: "#302720",
    small: "#6d5949",
    photoText: "#f7e6c8",
    accent: "#e75d42",
    accentSoft: "#ffd4ab"
  },
  darkroom: {
    background: "#171717",
    paper: "#f3eadb",
    photoStart: "#111313",
    photoMid: "#273238",
    photoEnd: "#7b2331",
    title: "#fff2d2",
    overline: "#e36f58",
    label: "#4b332b",
    text: "#271f1c",
    small: "#6a5549",
    photoText: "#ffe8c0",
    accent: "#b91c3a",
    accentSoft: "#ffb37c"
  },
  sunset: {
    background: "#8f3f2b",
    paper: "#fff3df",
    photoStart: "#233a42",
    photoMid: "#d07345",
    photoEnd: "#f4c36b",
    title: "#fff8e9",
    overline: "#ffe09c",
    label: "#563428",
    text: "#2d201b",
    small: "#765646",
    photoText: "#fff0cf",
    accent: "#ff7043",
    accentSoft: "#ffd08a"
  }
};

export function renderSvg(repo: RepoAnalysis, options: RenderOptions = {}): string {
  const theme = THEMES[options.theme ?? "classic"];
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
  const displayFiles = repo.sourceKind === "git" ? repo.hotFiles : repo.notableFiles;
  const hotFiles = displayFiles.length > 0 ? displayFiles.map((file) => truncate(file.path, 24)).join(" · ") : `no ${hotLabel} files yet`;
  const hotFileLines = wrapText(`${hotLabel}: ${hotFiles}`, 54, 2);
  const captionLines = wrapText(repo.persona, 38, 2);
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
      <stop offset="0%" stop-color="${theme.photoStart}"/>
      <stop offset="45%" stop-color="${theme.photoMid}"/>
      <stop offset="100%" stop-color="${theme.photoEnd}"/>
    </linearGradient>
    <linearGradient id="glare" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#fff6df" stop-opacity="0.72"/>
      <stop offset="35%" stop-color="#fff6df" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#fff6df" stop-opacity="0"/>
    </linearGradient>
    <style>
      .title { font: 800 56px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: ${theme.title}; letter-spacing: 0; }
      .overline { font: 800 15px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: ${theme.overline}; letter-spacing: 3px; }
      .label { font: 800 20px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: ${theme.label}; letter-spacing: 0; }
      .text { font: 700 24px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: ${theme.text}; }
      .small { font: 600 18px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: ${theme.small}; }
      .photoSmall { font: 700 18px "Avenir Next", "Trebuchet MS", ui-sans-serif, sans-serif; fill: ${theme.photoText}; }
      .caption { font: 500 34px "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive; fill: ${theme.text}; }
    </style>
  </defs>

  <rect width="920" height="1120" fill="${theme.background}"/>
  <rect width="920" height="1120" fill="#000" filter="url(#paperNoise)" opacity="0.6"/>
  <circle cx="132" cy="174" r="150" fill="#e3c48d" opacity="0.28"/>
  <circle cx="782" cy="918" r="190" fill="#6f3f34" opacity="0.16"/>
  <path d="M0 806 C190 760 300 832 470 786 C650 738 760 770 920 724 L920 1120 L0 1120 Z" fill="#7f6a51" opacity="0.2"/>

  <g transform="translate(278 26) rotate(-4)">
    <rect x="0" y="0" width="362" height="58" rx="8" fill="#ead7b6" opacity="0.72"/>
    <path d="M18 0 L42 58 M78 0 L102 58 M138 0 L162 58 M198 0 L222 58 M258 0 L282 58 M318 0 L342 58" stroke="#d0ae78" stroke-width="2" opacity="0.38"/>
  </g>

  <g transform="translate(80 54) rotate(-1.4 380 500)" filter="url(#shadow)">
    <rect width="760" height="990" rx="12" fill="${theme.paper}"/>
    <rect width="760" height="990" rx="12" fill="#000" filter="url(#paperNoise)" opacity="0.45"/>
    <rect x="34" y="34" width="692" height="646" rx="10" fill="#e7d6bd"/>
    <rect x="48" y="48" width="664" height="618" rx="8" fill="url(#photo)"/>
    <rect x="48" y="48" width="664" height="618" rx="8" fill="#000" filter="url(#paperNoise)" opacity="0.24"/>
    <path d="M48 48 H712 V254 C576 218 458 304 330 268 C210 234 118 152 48 180 Z" fill="url(#glare)"/>
    <rect x="74" y="74" width="612" height="566" rx="3" fill="none" stroke="#fff2d8" stroke-width="2" opacity="0.32"/>
    <circle cx="646" cy="118" r="42" fill="${theme.accent}" opacity="0.94"/>
    <circle cx="646" cy="118" r="23" fill="${theme.accentSoft}" opacity="0.84"/>
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
      <rect x="0" y="-38" width="560" height="${hotFileLines.length > 1 ? "68" : "46"}" rx="21" fill="#221c19" opacity="0.34"/>
      <text class="photoSmall" x="22" y="-10">${renderTspans(hotFileLines, 22)}</text>
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
    <text x="82" y="940" class="caption">${renderTspans(captionLines, 42)}</text>
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

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const current = lines[lines.length - 1];
    if (!current) {
      lines.push(truncate(word, maxChars));
      continue;
    }

    if (`${current} ${word}`.length <= maxChars) {
      lines[lines.length - 1] = `${current} ${word}`;
    } else if (lines.length < maxLines) {
      lines.push(truncate(word, maxChars));
    } else {
      lines[lines.length - 1] = truncate(`${current} ${word}`, maxChars);
    }
  }

  return lines.length > 0 ? lines.slice(0, maxLines) : [""];
}

function renderTspans(lines: string[], x: number): string {
  return lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : 1.2}em">${escapeXml(line)}</tspan>`)
    .join("");
}
