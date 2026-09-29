export type RepoRef = {
  owner: string;
  repo: string;
};

export type GitHubRepo = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  size: number;
  language: string | null;
  license: { spdx_id: string; name: string } | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  archived: boolean;
  topics?: string[];
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
};

export type TreeEntry = {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
};

export type GitTree = {
  sha: string;
  truncated: boolean;
  tree: TreeEntry[];
};

export type Commit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
};

export type RepoData = {
  ref: RepoRef;
  repo: GitHubRepo;
  languages: Record<string, number>;
  tree: GitTree;
  commits: Commit[];
  manifests: Record<string, string>;
};

export type Signal = {
  label: string;
  found: boolean;
  detail: string;
};

export type StackItem = {
  name: string;
  category: "Frontend" | "Backend" | "Data" | "Testing" | "Tooling" | "Language";
  evidence: string;
};

export type RepoAnalysis = {
  stack: StackItem[];
  signals: Signal[];
  entryPoints: string[];
  runCommands: string[];
  topDirectories: Array<{ name: string; files: number }>;
  fileTypes: Array<{ extension: string; files: number }>;
  architecture: string[];
  testFileCount: number;
  workflowCount: number;
  docsCount: number;
};
