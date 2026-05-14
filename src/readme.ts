import fs from "node:fs";
import path from "node:path";

const START_MARKER = "<!-- repo-polaroid:start -->";
const END_MARKER = "<!-- repo-polaroid:end -->";

export type WriteReadmeOptions = {
  repoPath: string;
  outPath: string;
  readmePath?: string | null;
};

export function writeReadmeEmbed(options: WriteReadmeOptions): string {
  const targetPath = path.resolve(options.readmePath ?? path.join(options.repoPath, "README.md"));
  if (!options.readmePath && !isInside(options.repoPath, targetPath)) {
    throw new Error(`README path must be inside the input directory: ${targetPath}`);
  }

  const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
  const embed = renderEmbed(path.relative(path.dirname(targetPath), options.outPath).split(path.sep).join("/"));
  const next = upsertEmbed(current, embed);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, next, "utf8");
  return targetPath;
}

export function upsertEmbed(readme: string, embed: string): string {
  const blockPattern = new RegExp(`${escapeRegExp(START_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}`);
  const block = `${START_MARKER}\n${embed}\n${END_MARKER}`;

  if (blockPattern.test(readme)) {
    return readme.replace(blockPattern, block);
  }

  if (!readme.trim()) return `${block}\n`;

  const lines = readme.split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => /^#\s+/.test(line));
  if (titleIndex >= 0) {
    lines.splice(titleIndex + 1, 0, "", block);
    return normalizeTrailingNewline(lines.join("\n"));
  }

  return normalizeTrailingNewline(`${block}\n\n${readme}`);
}

function renderEmbed(relativeOutPath: string): string {
  const normalized = relativeOutPath.startsWith(".") ? relativeOutPath : `./${relativeOutPath}`;
  return `![Repo Polaroid](${normalized})`;
}

function normalizeTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
