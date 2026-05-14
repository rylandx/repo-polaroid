import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "repo-polaroid-"));
}

export function initRepo(files: Record<string, string>): string {
  const repo = makeTempDir();
  execFileSync("git", ["init"], { cwd: repo, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repo });
  execFileSync("git", ["config", "user.name", "Repo Polaroid Test"], { cwd: repo });

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(repo, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }

  execFileSync("git", ["add", "."], { cwd: repo, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "initial commit"], {
    cwd: repo,
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
      GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z"
    },
    stdio: "ignore"
  });

  return repo;
}
