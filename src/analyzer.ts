import fs from "node:fs";
import path from "node:path";
import ignore from "ignore";
import type { HealthSignals, HotFile, LanguageStat, RepoAnalysis } from "./types.js";
import { git, tryGit } from "./git.js";
import { createPersona } from "./persona.js";

const ALWAYS_IGNORE = [".git", "node_modules", "dist", "build", ".next", "coverage"];

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".c": "C",
  ".cc": "C++",
  ".cpp": "C++",
  ".cs": "C#",
  ".css": "CSS",
  ".go": "Go",
  ".html": "HTML",
  ".java": "Java",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".json": "JSON",
  ".kt": "Kotlin",
  ".lua": "Lua",
  ".md": "Markdown",
  ".php": "PHP",
  ".py": "Python",
  ".rb": "Ruby",
  ".rs": "Rust",
  ".sh": "Shell",
  ".swift": "Swift",
  ".toml": "TOML",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".vue": "Vue",
  ".yaml": "YAML",
  ".yml": "YAML"
};

type WalkResult = {
  files: string[];
  dirs: string[];
};

export function analyzeRepo(inputPath: string): RepoAnalysis {
  const repoPath = path.resolve(inputPath);
  if (!fs.existsSync(repoPath)) {
    throw new Error(`Path does not exist: ${repoPath}`);
  }
  if (!fs.statSync(repoPath).isDirectory()) {
    throw new Error(`Path is not a directory: ${repoPath}`);
  }
  const walk = walkRepo(repoPath);
  const health = detectHealth(walk.files);
  const languages = detectLanguages(repoPath, walk.files);
  const isCommittedGitRepo =
    tryGit(["rev-parse", "--is-inside-work-tree"], repoPath) === "true" &&
    tryGit(["rev-parse", "--verify", "HEAD"], repoPath) !== null;
  const timeline = isCommittedGitRepo ? gitTimeline(repoPath) : folderTimeline(repoPath, walk.files);
  const largestDir = detectLargestDir(walk.files);
  const hotFiles = isCommittedGitRepo ? detectHotFiles(repoPath) : detectNotableFiles(repoPath, walk.files);
  const projectAgeDays = Math.max(0, Math.floor((Date.now() - new Date(timeline.firstAt).getTime()) / 86_400_000));

  const withoutPersona: Omit<RepoAnalysis, "persona"> = {
    sourceKind: isCommittedGitRepo ? "git" : "folder",
    repoName: path.basename(repoPath),
    repoPath,
    fileCount: walk.files.length,
    dirCount: walk.dirs.length,
    languages,
    health,
    firstCommitAt: timeline.firstAt,
    lastCommitAt: timeline.lastAt,
    projectAgeDays,
    commitsLast30Days: timeline.recentCount,
    recentActivity: timeline.recentCount >= 20 ? "active" : timeline.recentCount >= 3 ? "warming" : "quiet",
    largestDir,
    hotFiles
  };

  return {
    ...withoutPersona,
    persona: createPersona(withoutPersona)
  };
}

function walkRepo(root: string): WalkResult {
  const ig = ignore().add(ALWAYS_IGNORE).add(readRootGitignore(root));
  const files: string[] = [];
  const dirs: string[] = [];

  function visit(absDir: string): void {
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const abs = path.join(absDir, entry.name);
      const rel = toPosix(path.relative(root, abs));
      if (!rel) continue;

      if (entry.isDirectory()) {
        if (ig.ignores(`${rel}/`) || ig.ignores(rel)) continue;
        dirs.push(rel);
        visit(abs);
        continue;
      }

      if (entry.isFile() && !ig.ignores(rel)) {
        files.push(rel);
      }
    }
  }

  visit(root);
  return { files: files.sort(), dirs: dirs.sort() };
}

function readRootGitignore(root: string): string[] {
  const gitignorePath = path.join(root, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return [];
  return fs.readFileSync(gitignorePath, "utf8").split(/\r?\n/).filter(Boolean);
}

function detectHealth(files: string[]): HealthSignals {
  const lower = files.map((file) => file.toLowerCase());
  return {
    readme: lower.some((file) => path.basename(file).startsWith("readme.")),
    license: lower.some((file) => ["license", "license.md", "license.txt", "copying"].includes(path.basename(file))),
    tests: lower.some((file) => {
      const base = path.basename(file);
      return file.includes("test/") || file.includes("tests/") || file.includes("__tests__/") || /\.(test|spec)\.[cm]?[jt]sx?$/.test(base);
    }),
    config: lower.some((file) =>
      [
        "package.json",
        "pyproject.toml",
        "cargo.toml",
        "go.mod",
        "pom.xml",
        "deno.json",
        "bun.lockb"
      ].includes(path.basename(file))
    )
  };
}

function detectLanguages(root: string, files: string[]): LanguageStat[] {
  const stats = new Map<string, { files: number; bytes: number }>();

  for (const file of files) {
    const language = LANGUAGE_BY_EXTENSION[path.extname(file).toLowerCase()];
    if (!language) continue;

    const current = stats.get(language) ?? { files: 0, bytes: 0 };
    current.files += 1;
    current.bytes += fs.statSync(path.join(root, file)).size;
    stats.set(language, current);
  }

  const totalBytes = [...stats.values()].reduce((sum, stat) => sum + stat.bytes, 0);
  return [...stats.entries()]
    .map(([name, stat]) => ({
      name,
      files: stat.files,
      bytes: stat.bytes,
      percent: totalBytes === 0 ? 0 : Math.round((stat.bytes / totalBytes) * 1000) / 10
    }))
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function countCommitsSince(repoPath: string, days: number): number {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const output = tryGit(["log", `--since=${since}`, "--format=%H"], repoPath);
  if (!output) return 0;
  return output.split(/\r?\n/).filter(Boolean).length;
}

function gitTimeline(repoPath: string): { firstAt: string; lastAt: string; recentCount: number } {
  return {
    firstAt: git(["log", "--reverse", "--format=%cI", "-1"], repoPath),
    lastAt: git(["log", "-1", "--format=%cI"], repoPath),
    recentCount: countCommitsSince(repoPath, 30)
  };
}

function folderTimeline(root: string, files: string[]): { firstAt: string; lastAt: string; recentCount: number } {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86_400_000;
  if (files.length === 0) {
    const iso = new Date(now).toISOString();
    return { firstAt: iso, lastAt: iso, recentCount: 0 };
  }

  let first = Number.POSITIVE_INFINITY;
  let last = 0;
  let recentCount = 0;

  for (const file of files) {
    const mtime = fs.statSync(path.join(root, file)).mtime.getTime();
    first = Math.min(first, mtime);
    last = Math.max(last, mtime);
    if (mtime >= thirtyDaysAgo) recentCount += 1;
  }

  return {
    firstAt: new Date(first).toISOString(),
    lastAt: new Date(last).toISOString(),
    recentCount
  };
}

function detectLargestDir(files: string[]): string | null {
  const counts = new Map<string, number>();
  for (const file of files) {
    const top = file.split("/")[0];
    if (top && top !== file) counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function detectHotFiles(repoPath: string): HotFile[] {
  const output = tryGit(["log", "--name-only", "--format=", "-100"], repoPath);
  if (!output) return [];

  const counts = new Map<string, number>();
  for (const line of output.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([filePath, commits]) => ({ path: filePath, commits }))
    .sort((a, b) => b.commits - a.commits || a.path.localeCompare(b.path))
    .slice(0, 3);
}

function detectNotableFiles(root: string, files: string[]): HotFile[] {
  return files
    .map((filePath) => ({
      path: filePath,
      commits: fs.statSync(path.join(root, filePath)).size
    }))
    .sort((a, b) => b.commits - a.commits || a.path.localeCompare(b.path))
    .slice(0, 3);
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}
