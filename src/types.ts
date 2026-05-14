export type LanguageStat = {
  name: string;
  files: number;
  bytes: number;
  percent: number;
};

export type HealthSignals = {
  readme: boolean;
  license: boolean;
  tests: boolean;
  config: boolean;
};

export type HotFile = {
  path: string;
  commits: number;
};

export type RepoAnalysis = {
  repoName: string;
  repoPath: string;
  fileCount: number;
  dirCount: number;
  languages: LanguageStat[];
  health: HealthSignals;
  firstCommitAt: string;
  lastCommitAt: string;
  projectAgeDays: number;
  commitsLast30Days: number;
  recentActivity: "quiet" | "warming" | "active";
  largestDir: string | null;
  hotFiles: HotFile[];
  persona: string;
};
