#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepo } from "./analyzer.js";
import { createAiPersona } from "./persona.js";
import { renderSvg } from "./renderer.js";

type CliOptions = {
  repoPath: string;
  out: string | null;
  json: boolean;
  captionAi: boolean;
};

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const analysis = analyzeRepo(options.repoPath);

  if (options.captionAi) {
    const aiPersona = await createAiPersona(analysis);
    if (aiPersona) analysis.persona = aiPersona;
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
  }

  if (!options.json || options.out) {
    const outPath = path.resolve(options.out ?? "repo-polaroid.svg");
    fs.writeFileSync(outPath, renderSvg(analysis), "utf8");
    const message = `Repo polaroid written to ${outPath}\n`;
    if (options.json) {
      process.stderr.write(message);
    } else {
      process.stdout.write(message);
    }
  }
}

export function parseArgs(argv: string[]): CliOptions {
  let repoPath = ".";
  let out: string | null = null;
  let json = false;
  let captionAi = false;
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

  return { repoPath, out, json, captionAi };
}

function printHelp(): void {
  process.stdout.write(`repo-polaroid

Generate a vintage polaroid-style SVG portrait for a local Git repository.

Usage:
  repo-polaroid [path]
  repo-polaroid . --out repo-polaroid.svg
  repo-polaroid . --json
  repo-polaroid . --caption-ai

Options:
  --out <file>    Write SVG to a specific path
  --json          Print analysis JSON instead of writing SVG
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
