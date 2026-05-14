#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { analyzeRepo } from "./analyzer.js";
import { renderAlbumHtml, renderCompareHtml, renderStandaloneHtml } from "./html.js";
import { createAiPersona } from "./persona.js";
import { writePreviewHtml } from "./preview.js";
import { writeReadmeEmbed } from "./readme.js";
import { renderSvg } from "./renderer.js";
import type { RepoAnalysis, ThemeName } from "./types.js";

type CliOptions = {
  repoPath: string;
  out: string | null;
  json: boolean;
  captionAi: boolean;
  open: boolean;
  theme: ThemeName;
  themeInput: ThemeName | "auto";
  maxFiles: number;
  writeReadme: boolean;
  readme: string | null;
  preview: boolean;
  format: "svg" | "png" | "html";
  profile: boolean;
  inPlace: boolean;
  share: boolean;
  at: string | null;
};

const THEMES: ThemeName[] = ["classic", "darkroom", "sunset", "blueprint", "terminal", "kodak"];
const THEME_INPUTS = [...THEMES, "auto"] as const;
const DEFAULT_MAX_FILES = 20_000;

export async function main(argv = process.argv.slice(2)): Promise<void> {
  if (argv[0] === "album") {
    await albumMain(argv.slice(1));
    return;
  }
  if (argv[0] === "compare") {
    await compareMain(argv.slice(1));
    return;
  }
  if (argv[0] === "init") {
    await initMain(argv.slice(1));
    return;
  }

  const options = parseArgs(argv);
  if (options.json && options.preview && !options.out) {
    throw new Error("--preview requires --out when --json is used");
  }
  if (options.json && options.writeReadme && !options.out) {
    throw new Error("--write-readme requires --out when --json is used");
  }

  const prepared = prepareAnalysisPath(options.repoPath, options.at);
  try {
    const analysis = analyzeRepo(prepared.path, { maxFiles: options.maxFiles });
    const theme = options.themeInput === "auto" ? autoTheme(analysis) : options.theme;

    await maybeApplyAiCaption(analysis, options.captionAi);

    if (options.json) {
      process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
    }

    if (!options.json || options.out) {
      const outPath = resolveOutPath(options, analysis.repoPath);
      const svg = renderSvg(analysis, { theme, variant: options.profile ? "profile" : "polaroid" });
      if (options.format === "html") {
        fs.writeFileSync(outPath, renderStandaloneHtml(analysis, svg, theme, markdownPath(outPath), shareText(analysis)), "utf8");
      } else if (options.format === "png") {
        await sharp(Buffer.from(svg)).png().toFile(outPath);
      } else {
        fs.writeFileSync(outPath, svg, "utf8");
      }
      const message = `Repo polaroid written to ${outPath}\nEmbed in README:\n![Repo Polaroid](${markdownPath(outPath)})\n`;
      if (options.json) {
        process.stderr.write(message);
      } else {
        process.stdout.write(message);
      }

      if (options.writeReadme) {
        const readmePath = writeReadmeEmbed({
          repoPath: path.resolve(options.repoPath),
          outPath,
          readmePath: options.readme
        });
        writeMessage(`README updated at ${readmePath}\n`, options.json);
      }

      if (options.open) {
        openFile(outPath);
        writeMessage(`Opened ${outPath}\n`, options.json);
      }

      if (options.preview) {
        const previewPath = writePreviewHtml(analysis, { outPath, theme });
        openFile(previewPath);
        writeMessage(`Preview opened at ${previewPath}\n`, options.json);
      }

      if (options.share) {
        writeMessage(`${shareText(analysis)}\n`, options.json);
      }
    }
  } finally {
    prepared.cleanup();
  }
}

export function parseArgs(argv: string[]): CliOptions {
  let repoPath = ".";
  let out: string | null = null;
  let json = false;
  let captionAi = false;
  let open = false;
  let theme: ThemeName = "classic";
  let themeInput: ThemeName | "auto" = "classic";
  let maxFiles = DEFAULT_MAX_FILES;
  let writeReadme = false;
  let readme: string | null = null;
  let preview = false;
  let format: "svg" | "png" | "html" = "svg";
  let profile = false;
  let inPlace = false;
  let share = false;
  let at: string | null = null;
  let sawPath = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--caption-ai") {
      captionAi = true;
      continue;
    }

    if (arg === "--open") {
      open = true;
      continue;
    }

    if (arg === "--write-readme") {
      writeReadme = true;
      continue;
    }

    if (arg === "--preview") {
      preview = true;
      continue;
    }

    if (arg === "--profile") {
      profile = true;
      continue;
    }

    if (arg === "--in-place") {
      inPlace = true;
      continue;
    }

    if (arg === "--share") {
      share = true;
      continue;
    }

    if (arg === "--readme") {
      const value = argv[index + 1];
      if (!value) throw new Error("--readme requires a file path");
      readme = value;
      writeReadme = true;
      index += 1;
      continue;
    }

    if (arg.startsWith("--readme=")) {
      readme = arg.slice("--readme=".length);
      if (!readme) throw new Error("--readme requires a file path");
      writeReadme = true;
      continue;
    }

    if (arg === "--theme") {
      const value = argv[index + 1];
      if (!value) throw new Error(`--theme requires ${THEME_INPUTS.join(", ")}`);
      themeInput = parseThemeInput(value);
      theme = themeInput === "auto" ? "classic" : themeInput;
      index += 1;
      continue;
    }

    if (arg.startsWith("--theme=")) {
      themeInput = parseThemeInput(arg.slice("--theme=".length));
      theme = themeInput === "auto" ? "classic" : themeInput;
      continue;
    }

    if (arg === "--format") {
      const value = argv[index + 1];
      if (!value) throw new Error("--format requires svg, png, or html");
      format = parseFormat(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--format=")) {
      format = parseFormat(arg.slice("--format=".length));
      continue;
    }

    if (arg === "--at") {
      const value = argv[index + 1];
      if (!value) throw new Error("--at requires a Git ref");
      at = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--at=")) {
      at = arg.slice("--at=".length);
      if (!at) throw new Error("--at requires a Git ref");
      continue;
    }

    if (arg === "--max-files") {
      const value = argv[index + 1];
      if (!value) throw new Error("--max-files requires a positive integer");
      maxFiles = parseMaxFiles(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--max-files=")) {
      maxFiles = parseMaxFiles(arg.slice("--max-files=".length));
      continue;
    }

    if (arg === "--out") {
      const value = argv[index + 1];
      if (!value) throw new Error("--out requires a file path");
      out = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--out=")) {
      out = arg.slice("--out=".length);
      if (!out) throw new Error("--out requires a file path");
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (sawPath) {
      throw new Error(`Unexpected extra path: ${arg}`);
    }
    repoPath = arg;
    sawPath = true;
  }

  return { repoPath, out, json, captionAi, open, theme, themeInput, maxFiles, writeReadme, readme, preview, format, profile, inPlace, share, at };
}

function parseThemeInput(value: string): ThemeName | "auto" {
  if ((THEME_INPUTS as readonly string[]).includes(value)) return value as ThemeName | "auto";
  throw new Error(`Invalid theme: ${value}. Expected ${THEME_INPUTS.join(", ")}.`);
}

function parseFormat(value: string): "svg" | "png" | "html" {
  if (value === "svg" || value === "png" || value === "html") return value;
  throw new Error(`Invalid format: ${value}. Expected svg, png, or html.`);
}

function parseMaxFiles(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("--max-files requires a positive integer");
  }
  return parsed;
}

function markdownPath(outPath: string): string {
  const relative = path.relative(process.cwd(), outPath).split(path.sep).join("/");
  if (!relative || relative.startsWith(".")) return relative || "./repo-polaroid.svg";
  return relative.startsWith("/") ? relative : `./${relative}`;
}

function resolveOutPath(options: CliOptions, repoPath: string): string {
  if (options.out) return path.resolve(options.out);
  const basename = options.format === "html" ? "repo-polaroid.html" : options.format === "png" ? "repo-polaroid.png" : "repo-polaroid.svg";
  return path.resolve(options.inPlace ? path.join(repoPath, basename) : basename);
}

async function maybeApplyAiCaption(analysis: RepoAnalysis, captionAi: boolean): Promise<void> {
  if (!captionAi) return;
  const aiPersona = await createAiPersona(analysis);
  if (aiPersona) {
    analysis.persona = aiPersona;
    analysis.captionSource = "ai";
  } else {
    analysis.captionSource = "fallback";
  }
}

function autoTheme(analysis: RepoAnalysis): ThemeName {
  const primary = analysis.languages[0]?.name;
  if (primary === "Python") return "blueprint";
  if (["Shell", "Go", "Rust"].includes(primary ?? "")) return "terminal";
  if (analysis.repoWeather === "Sunny") return "kodak";
  if (analysis.repoWeather === "Night Shift") return "darkroom";
  return "sunset";
}

function shareText(analysis: RepoAnalysis): string {
  return `I gave ${analysis.repoName} a repo polaroid: ${analysis.personaType}, ${analysis.rarity} (${analysis.rarityScore}), ${analysis.repoWeather}.`;
}

function prepareAnalysisPath(repoPath: string, ref: string | null): { path: string; cleanup: () => void } {
  if (!ref) return { path: repoPath, cleanup: () => undefined };
  const sourcePath = path.resolve(repoPath);
  const tempPath = fs.mkdtempSync(path.join(os.tmpdir(), "repo-polaroid-at-"));
  const result = spawnSync("git", ["worktree", "add", "--detach", "--quiet", tempPath, ref], { cwd: sourcePath, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    fs.rmSync(tempPath, { recursive: true, force: true });
    throw new Error(`Could not analyze Git ref ${ref}: ${result.stderr || result.error?.message || `exit ${result.status}`}`);
  }
  return {
    path: tempPath,
    cleanup: () => {
      spawnSync("git", ["worktree", "remove", "--force", tempPath], { cwd: sourcePath, stdio: "ignore" });
    }
  };
}

async function initMain(argv: string[]): Promise<void> {
  const defaults = parseArgs(argv);
  if (!process.stdin.isTTY) {
    await main([defaults.repoPath, "--out", defaults.out ?? "repo-polaroid.svg", "--write-readme", "--preview"]);
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const repoPath = (await rl.question(`Project path (${defaults.repoPath}): `)).trim() || defaults.repoPath;
    const theme = (await rl.question("Theme classic/darkroom/sunset/blueprint/terminal/kodak/auto (auto): ")).trim() || "auto";
    const out = (await rl.question("Output file (repo-polaroid.svg): ")).trim() || "repo-polaroid.svg";
    const writeReadme = ((await rl.question("Update README? y/N: ")).trim().toLowerCase() || "n").startsWith("y");
    const preview = ((await rl.question("Open preview? y/N: ")).trim().toLowerCase() || "n").startsWith("y");
    const args = [repoPath, "--theme", theme, "--out", out];
    if (writeReadme) args.push("--write-readme");
    if (preview) args.push("--preview");
    await main(args);
  } finally {
    rl.close();
  }
}

async function compareMain(argv: string[]): Promise<void> {
  const paths: string[] = [];
  const rest: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("-") && paths.length < 2) {
      paths.push(arg);
    } else {
      rest.push(arg);
      if (["--out", "--theme", "--max-files"].includes(arg) && argv[index + 1]) {
        rest.push(argv[index + 1]);
        index += 1;
      }
    }
  }
  if (paths.length !== 2) throw new Error("compare requires two paths");
  const options = parseArgs([paths[1], ...rest]);
  const before = analyzeRepo(paths[0], { maxFiles: options.maxFiles });
  const after = analyzeRepo(paths[1], { maxFiles: options.maxFiles });
  const theme = options.themeInput === "auto" ? autoTheme(after) : options.theme;
  const html = renderCompareHtml(before, renderSvg(before, { theme }), after, renderSvg(after, { theme }));
  const outPath = path.resolve(options.out ?? "repo-polaroid-compare.html");
  fs.writeFileSync(outPath, html, "utf8");
  writeMessage(`Repo polaroid comparison written to ${outPath}\n`, options.json);
}

async function albumMain(argv: string[]): Promise<void> {
  const options = parseArgs(argv);
  const root = path.resolve(options.repoPath);
  const children = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.join(root, entry.name))
    .slice(0, 24);
  const repos = children.flatMap((child) => {
    try {
      const analysis = analyzeRepo(child, { maxFiles: options.maxFiles });
      const theme = options.themeInput === "auto" ? autoTheme(analysis) : options.theme;
      return [{ analysis, svg: renderSvg(analysis, { theme, variant: options.profile ? "profile" : "polaroid" }) }];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`repo-polaroid: skipped ${child}: ${message}\n`);
      return [];
    }
  });
  if (repos.length === 0) throw new Error("album did not find any readable project folders");
  const outPath = path.resolve(options.out ?? "repo-polaroid-album.html");
  fs.writeFileSync(outPath, renderAlbumHtml(repos), "utf8");
  writeMessage(`Repo polaroid album written to ${outPath}\n`, options.json);
}

function openFile(filePath: string): void {
  const override = process.env.REPO_POLAROID_OPEN_COMMAND;
  const command = override ?? (process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open");
  const args = override ? [filePath] : process.platform === "win32" ? ["/c", "start", "", filePath] : [filePath];
  const result = spawnSync(command, args, { stdio: "ignore" });
  if (result.error || result.status !== 0) {
    throw new Error(`Could not open SVG: ${result.error?.message ?? `exit ${result.status}`}`);
  }
}

function writeMessage(message: string, stderr: boolean): void {
  if (stderr) {
    process.stderr.write(message);
  } else {
    process.stdout.write(message);
  }
}

function printHelp(): void {
  process.stdout.write(`repo-polaroid

Generate a vintage polaroid-style SVG portrait for a local Git repository or folder.

Usage:
  repo-polaroid [path]
  repo-polaroid . --out repo-polaroid.svg
  repo-polaroid . --json
  repo-polaroid . --theme sunset --open
  repo-polaroid . --caption-ai
  repo-polaroid . --out repo-polaroid.svg --write-readme
  repo-polaroid . --out repo-polaroid.svg --preview
  repo-polaroid init
  repo-polaroid album /path/to/projects --out album.html
  repo-polaroid compare ./before ./after --out compare.html

Options:
  --out <file>      Write SVG to a specific path
  --json            Print analysis JSON instead of writing SVG
  --open            Open the generated SVG after writing it
  --preview         Generate and open a local preview HTML page
  --format <name>   Use svg, png, or html
  --profile         Render a wide GitHub profile card
  --in-place        Write default output into the input directory
  --share           Print a short share caption
  --at <ref>        Render a committed Git repository at a Git ref
  --write-readme    Insert or update the README embed block
  --readme <file>   Use a specific README path and enable --write-readme
  --theme <name>    Use classic, darkroom, sunset, blueprint, terminal, kodak, or auto
  --max-files <n>   Stop scanning after this many files (default: 20000)
  --caption-ai      Try to replace the local caption with an AI caption
  -h, --help        Show help
`);
}

function isDirectCliExecution(): boolean {
  if (!process.argv[1]) return false;
  return fs.realpathSync(path.resolve(process.argv[1])) === fileURLToPath(import.meta.url);
}

if (isDirectCliExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`repo-polaroid: ${message}\n`);
    process.exit(1);
  });
}
