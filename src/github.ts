import type { Commit, GitHubRepo, GitTree, RepoData, RepoRef } from "./types";

const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

export function parseRepoInput(input: string): RepoRef {
  const value = input.trim().replace(/\.git$/, "");

  if (/^[\w.-]+\/[\w.-]+$/.test(value)) {
    const [owner, repo] = value.split("/");
    return { owner, repo };
  }

  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    throw new Error("Enter a GitHub URL or owner/repository.");
  }

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    throw new Error("RepoLens currently supports public GitHub repositories.");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("Enter a repository URL such as github.com/facebook/react.");
  }

  return { owner: parts[0], repo: parts[1] };
}

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found. Make sure it is public and the URL is correct.");
    }
    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        throw new Error("GitHub's anonymous API limit was reached. Try again later.");
      }
    }
    throw new Error(`GitHub returned ${response.status} while reading the repository.`);
  }

  return response.json() as Promise<T>;
}

async function rawText(ref: RepoRef, branch: string, path: string): Promise<string> {
  const response = await fetch(
    `${RAW}/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/${branch}/${path}`,
  );
  if (!response.ok) return "";
  return response.text();
}

const manifestCandidates = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Cargo.toml",
  "go.mod",
  "composer.json",
  "Gemfile",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml",
  "prisma/schema.prisma",
  ".github/workflows/ci.yml",
  ".github/workflows/ci.yaml",
  ".github/workflows/build.yml",
  ".github/workflows/build.yaml",
];

export async function loadRepository(input: string): Promise<RepoData> {
  const ref = parseRepoInput(input);
  const encoded = `${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`;

  const repo = await githubJson<GitHubRepo>(`/repos/${encoded}`);
  const [languages, tree, commits] = await Promise.all([
    githubJson<Record<string, number>>(`/repos/${encoded}/languages`),
    githubJson<GitTree>(
      `/repos/${encoded}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`,
    ),
    githubJson<Commit[]>(`/repos/${encoded}/commits?per_page=12`),
  ]);

  const paths = new Set(tree.tree.map((item) => item.path));
  const wanted = manifestCandidates.filter((path) => paths.has(path));

  // Also inspect every workflow filename, up to a small cap.
  const workflows = tree.tree
    .filter((item) => item.type === "blob" && item.path.startsWith(".github/workflows/"))
    .map((item) => item.path)
    .slice(0, 8);

  const selected = [...new Set([...wanted, ...workflows])].slice(0, 18);
  const manifestPairs = await Promise.all(
    selected.map(async (path) => [path, await rawText(ref, repo.default_branch, path)] as const),
  );

  return {
    ref,
    repo,
    languages,
    tree,
    commits,
    manifests: Object.fromEntries(manifestPairs),
  };
}
