#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyzeRepo } from "./analyzer.js";
import { createAiPersona } from "./persona.js";
import { writePreviewHtml } from "./preview.js";
import { writeReadmeEmbed } from "./readme.js";
import { renderSvg } from "./renderer.js";
import type { ThemeName } from "./types.js";

type CliOptions = {
  repoPath: string;
  out: string | null;
  json: boolean;
  captionAi: boolean;
  open: boolean;
  theme: ThemeName;
  maxFiles: number;
  writeReadme: boolean;
  readme: string | null;
  preview: boolean;
};

const THEMES: ThemeName[] = ["classic", "darkroom", "sunset"];
const DEFAULT_MAX_FILES = 20_000;

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (options.json && options.preview && !options.out) {
    throw new Error("--preview requires --out when --json is used");
  }
  if (options.json && options.writeReadme && !options.out) {
    throw new Error("--write-readme requires --out when --json is used");
  }

  const analysis = analyzeRepo(options.repoPath, { maxFiles: options.maxFiles });

  if (options.captionAi) {
    const aiPersona = await createAiPersona(analysis);
    if (aiPersona) {
      analysis.persona = aiPersona;
      analysis.captionSource = "ai";
    } else {
      analysis.captionSource = "fallback";
    }
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
  }

  if (!options.json || options.out) {
    const outPath = path.resolve(options.out ?? "repo-polaroid.svg");
    fs.writeFileSync(outPath, renderSvg(analysis, { theme: options.theme }), "utf8");
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
      const previewPath = writePreviewHtml(analysis, { outPath, theme: options.theme });
      openFile(previewPath);
      writeMessage(`Preview opened at ${previewPath}\n`, options.json);
    }
  }
}

export function parseArgs(argv: string[]): CliOptions {
  let repoPath = ".";
  let out: string | null = null;
  let json = false;
  let captionAi = false;
  let open = false;
  let theme: ThemeName = "classic";
  let maxFiles = DEFAULT_MAX_FILES;
  let writeReadme = false;
  let readme: string | null = null;
  let preview = false;
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
      if (!value) throw new Error("--theme requires classic, darkroom, or sunset");
      theme = parseTheme(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--theme=")) {
      theme = parseTheme(arg.slice("--theme=".length));
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

  return { repoPath, out, json, captionAi, open, theme, maxFiles, writeReadme, readme, preview };
}

function parseTheme(value: string): ThemeName {
  if (THEMES.includes(value as ThemeName)) return value as ThemeName;
  throw new Error(`Invalid theme: ${value}. Expected classic, darkroom, or sunset.`);
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

Options:
  --out <file>      Write SVG to a specific path
  --json            Print analysis JSON instead of writing SVG
  --open            Open the generated SVG after writing it
  --preview         Generate and open a local preview HTML page
  --write-readme    Insert or update the README embed block
  --readme <file>   Use a specific README path and enable --write-readme
  --theme <name>    Use classic, darkroom, or sunset
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
