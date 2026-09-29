import { describe, expect, it } from "vitest";
import { analyzeRepository } from "./analyzer";
import type { RepoData } from "./types";

const data: RepoData = {
  ref: { owner: "demo", repo: "app" },
  repo: {
    name: "app",
    full_name: "demo/app",
    html_url: "https://github.com/demo/app",
    description: "demo",
    default_branch: "main",
    stargazers_count: 1,
    forks_count: 0,
    open_issues_count: 0,
    watchers_count: 1,
    size: 100,
    language: "TypeScript",
    license: { spdx_id: "MIT", name: "MIT License" },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    pushed_at: "2026-01-01T00:00:00Z",
    archived: false,
    owner: { login: "demo", avatar_url: "", html_url: "" },
  },
  languages: { TypeScript: 9000, CSS: 1000 },
  tree: {
    sha: "abc",
    truncated: false,
    tree: [
      { path: "package.json", mode: "100644", type: "blob", sha: "1", url: "" },
      { path: "src/main.tsx", mode: "100644", type: "blob", sha: "2", url: "" },
      { path: "src/App.test.tsx", mode: "100644", type: "blob", sha: "3", url: "" },
      { path: "Dockerfile", mode: "100644", type: "blob", sha: "4", url: "" },
      { path: ".github/workflows/ci.yml", mode: "100644", type: "blob", sha: "5", url: "" },
      { path: "README.md", mode: "100644", type: "blob", sha: "6", url: "" },
    ],
  },
  commits: [],
  manifests: {
    "package.json": JSON.stringify({
      scripts: { dev: "vite", test: "vitest run", build: "vite build" },
      dependencies: { react: "^19.0.0" },
      devDependencies: { vite: "^6.0.0", vitest: "^3.0.0", typescript: "^5.0.0" },
    }),
  },
};

describe("analyzeRepository", () => {
  it("detects stack and engineering signals", () => {
    const result = analyzeRepository(data);

    expect(result.stack.map((item) => item.name)).toEqual(
      expect.arrayContaining(["TypeScript", "React", "Vite", "Vitest", "Docker", "GitHub Actions"]),
    );
    expect(result.testFileCount).toBe(1);
    expect(result.workflowCount).toBe(1);
    expect(result.runCommands).toEqual(
      expect.arrayContaining(["npm install", "npm run test", "npm run build"]),
    );
  });
});
