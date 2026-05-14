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

export type NotableFile = {
  path: string;
  weight: number;
  reason: string;
};

export type ThemeName = "classic" | "darkroom" | "sunset" | "blueprint" | "terminal" | "kodak";
export type CaptionSource = "local" | "ai" | "fallback";
export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";
export type RepoWeather = "Sunny" | "Cloudy" | "Stormy" | "Night Shift" | "Spring Clean";

export type RepoAnalysis = {
  sourceKind: "git" | "folder";
  repoName: string;
  repoPath: string;
  fileCount: number;
  dirCount: number;
  languages: LanguageStat[];
  health: HealthSignals;
  firstCommitAt: string;
  lastCommitAt: string;
  activityKind: "commits" | "modified-files";
  activityCount: number;
  firstSeenAt: string;
  lastTouchedAt: string;
  projectAgeDays: number;
  commitsLast30Days: number;
  recentActivity: "quiet" | "warming" | "active";
  largestDir: string | null;
  hotFiles: HotFile[];
  notableFiles: NotableFile[];
  persona: string;
  captionSource: CaptionSource;
  personaType: string;
  personaReasons: string[];
  rarity: Rarity;
  rarityScore: number;
  repoWeather: RepoWeather;
};
