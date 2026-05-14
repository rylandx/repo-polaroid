#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyzeRepo } from "./analyzer.js";
import { createAiPersona } from "./persona.js";
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
};

const THEMES: ThemeName[] = ["classic", "darkroom", "sunset"];
const DEFAULT_MAX_FILES = 20_000;

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const analysis = analyzeRepo(options.repoPath, { maxFiles: options.maxFiles });

  if (options.captionAi) {
    const aiPersona = await createAiPersona(analysis);
    if (aiPersona) analysis.persona = aiPersona;
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

    if (options.open) {
      openFile(outPath);
      const openMessage = `Opened ${outPath}\n`;
      if (options.json) {
        process.stderr.write(openMessage);
      } else {
        process.stdout.write(openMessage);
      }
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

  return { repoPath, out, json, captionAi, open, theme, maxFiles };
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

function printHelp(): void {
  process.stdout.write(`repo-polaroid

Generate a vintage polaroid-style SVG portrait for a local Git repository or folder.

Usage:
  repo-polaroid [path]
  repo-polaroid . --out repo-polaroid.svg
  repo-polaroid . --json
  repo-polaroid . --theme sunset --open
  repo-polaroid . --caption-ai

Options:
  --out <file>    Write SVG to a specific path
  --json          Print analysis JSON instead of writing SVG
  --open          Open the generated SVG after writing it
  --theme <name>  Use classic, darkroom, or sunset
  --max-files <n> Stop scanning after this many files (default: 20000)
  --caption-ai    Try to replace the local caption with an AI caption
  -h, --help      Show help
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
