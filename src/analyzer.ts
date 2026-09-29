import type { RepoAnalysis, RepoData, Signal, StackItem, TreeEntry } from "./types";

const stackRules: Array<{
  name: string;
  category: StackItem["category"];
  files?: RegExp;
  content?: RegExp;
}> = [
  { name: "TypeScript", category: "Language", files: /\.tsx?$|tsconfig\.json$/i },
  { name: "JavaScript", category: "Language", files: /\.jsx?$|package\.json$/i },
  { name: "Python", category: "Language", files: /\.py$|pyproject\.toml$|requirements\.txt$/i },
  { name: "Java", category: "Language", files: /\.java$|pom\.xml$|build\.gradle/i },
  { name: "Go", category: "Language", files: /\.go$|go\.mod$/i },
  { name: "Rust", category: "Language", files: /\.rs$|Cargo\.toml$/i },
  { name: "React", category: "Frontend", content: /["']react["']|@types\/react|react-dom/i },
  { name: "Next.js", category: "Frontend", content: /["']next["']|next\.config/i },
  { name: "Vite", category: "Frontend", content: /["']vite["']|@vitejs/i },
  { name: "Vue", category: "Frontend", content: /["']vue["']|@vue\//i },
  { name: "Spring Boot", category: "Backend", content: /spring-boot|org\.springframework\.boot/i },
  { name: "FastAPI", category: "Backend", content: /fastapi/i },
  { name: "Fastify", category: "Backend", content: /["']fastify["']|fastify@/i },
  { name: "Express", category: "Backend", content: /["']express["']|express@/i },
  { name: "Prisma", category: "Data", files: /prisma\/schema\.prisma$/i, content: /@prisma\/client|prisma/i },
  { name: "PostgreSQL", category: "Data", content: /postgres(?:ql)?|provider\s*=\s*["']postgresql["']/i },
  { name: "SQLite", category: "Data", content: /sqlite/i },
  { name: "MongoDB", category: "Data", content: /mongodb|mongoose/i },
  { name: "SQLAlchemy", category: "Data", content: /sqlalchemy/i },
  { name: "JPA", category: "Data", content: /spring-boot-starter-data-jpa|jakarta\.persistence/i },
  { name: "Vitest", category: "Testing", content: /vitest/i },
  { name: "Jest", category: "Testing", content: /["']jest["']|@jest\//i },
  { name: "Playwright", category: "Testing", content: /playwright/i },
  { name: "Cypress", category: "Testing", content: /cypress/i },
  { name: "JUnit", category: "Testing", content: /junit|spring-boot-starter-test/i },
  { name: "Pytest", category: "Testing", content: /pytest/i },
  { name: "Docker", category: "Tooling", files: /(^|\/)Dockerfile$|compose\.ya?ml$/i },
  { name: "GitHub Actions", category: "Tooling", files: /^\.github\/workflows\//i },
];

export function analyzeRepository(data: RepoData): RepoAnalysis {
  const files = data.tree.tree.filter((item) => item.type === "blob");
  const paths = files.map((item) => item.path);
  const allContent = Object.entries(data.manifests)
    .map(([path, value]) => `# ${path}\n${value}`)
    .join("\n");

  const stack: StackItem[] = [];
  const seen = new Set<string>();

  for (const rule of stackRules) {
    const fileMatch = rule.files ? paths.some((path) => rule.files!.test(path)) : false;
    const contentMatch = rule.content ? rule.content.test(allContent) : false;
    if ((fileMatch || contentMatch) && !seen.has(rule.name)) {
      seen.add(rule.name);
      stack.push({
        name: rule.name,
        category: rule.category,
        evidence: fileMatch ? "file structure" : "project configuration",
      });
    }
  }

  for (const language of Object.keys(data.languages)) {
    if (!seen.has(language)) {
      stack.push({ name: language, category: "Language", evidence: "GitHub language data" });
      seen.add(language);
    }
  }

  const testFiles = files.filter((item) =>
    /(^|\/)(__tests__|tests?|specs?)(\/|\.)|\.(test|spec)\.[^.]+$/i.test(item.path),
  );

  const workflows = files.filter((item) => item.path.startsWith(".github/workflows/"));
  const docs = files.filter((item) =>
    /(^|\/)(README|SECURITY|CONTRIBUTING|CHANGELOG|ARCHITECTURE)(\.|$)|^docs\//i.test(item.path),
  );

  const has = (pattern: RegExp) => paths.some((path) => pattern.test(path));

  const signals: Signal[] = [
    {
      label: "Automated tests",
      found: testFiles.length > 0,
      detail: testFiles.length ? `${testFiles.length} test file${testFiles.length === 1 ? "" : "s"} detected` : "No obvious test files detected",
    },
    {
      label: "CI workflow",
      found: workflows.length > 0,
      detail: workflows.length ? `${workflows.length} workflow${workflows.length === 1 ? "" : "s"} in .github/workflows` : "No GitHub Actions workflow detected",
    },
    {
      label: "Container setup",
      found: has(/(^|\/)Dockerfile$|(^|\/)(docker-)?compose\.ya?ml$/i),
      detail: has(/(^|\/)Dockerfile$/i) ? "Dockerfile detected" : "No Dockerfile detected",
    },
    {
      label: "Project documentation",
      found: has(/(^|\/)README(\.|$)/i),
      detail: docs.length ? `${docs.length} documentation file${docs.length === 1 ? "" : "s"} detected` : "No README detected",
    },
    {
      label: "Security notes",
      found: has(/(^|\/)SECURITY\.md$/i),
      detail: has(/(^|\/)SECURITY\.md$/i) ? "SECURITY.md detected" : "No SECURITY.md detected",
    },
    {
      label: "License",
      found: Boolean(data.repo.license) || has(/(^|\/)LICEN[CS]E(\.|$)/i),
      detail: data.repo.license?.spdx_id ?? (has(/(^|\/)LICEN[CS]E/i) ? "License file detected" : "No license detected"),
    },
  ];

  const entryPoints = findEntryPoints(files);
  const runCommands = inferCommands(data.manifests, paths);
  const topDirectories = summarizeDirectories(files);
  const fileTypes = summarizeFileTypes(files);

  const architecture: string[] = [];
  if (stack.some((item) => item.category === "Frontend")) architecture.push("Browser / UI");
  if (stack.some((item) => item.category === "Backend")) architecture.push("API / Server");
  if (stack.some((item) => item.category === "Data")) architecture.push("Data layer");
  if (workflows.length) architecture.push("CI");
  if (has(/Dockerfile/i)) architecture.push("Container");

  return {
    stack,
    signals,
    entryPoints,
    runCommands,
    topDirectories,
    fileTypes,
    architecture,
    testFileCount: testFiles.length,
    workflowCount: workflows.length,
    docsCount: docs.length,
  };
}

function findEntryPoints(files: TreeEntry[]): string[] {
  const preferred = [
    /^src\/app\/page\.tsx$/,
    /^src\/main\.(tsx?|jsx?)$/,
    /^src\/server\.ts$/,
    /^src\/app\.ts$/,
    /^app\/main\.py$/,
    /^main\.py$/,
    /Application\.java$/,
    /^cmd\/.*\/main\.go$/,
    /^src\/main\.rs$/,
    /^index\.(tsx?|jsx?|html)$/,
  ];

  const results: string[] = [];
  for (const pattern of preferred) {
    for (const file of files) {
      if (pattern.test(file.path) && !results.includes(file.path)) results.push(file.path);
    }
  }
  return results.slice(0, 8);
}

function inferCommands(manifests: Record<string, string>, paths: string[]): string[] {
  const commands: string[] = [];
  const packageJson = manifests["package.json"];
  if (packageJson) {
    try {
      const parsed = JSON.parse(packageJson) as { scripts?: Record<string, string> };
      commands.push("npm install");
      for (const key of ["dev", "test", "build", "start"]) {
        if (parsed.scripts?.[key]) commands.push(`npm run ${key}`);
      }
    } catch {
      commands.push("npm install");
    }
  }
  if (paths.includes("pom.xml")) commands.push("mvn test", "mvn spring-boot:run");
  if (paths.includes("pyproject.toml")) commands.push('pip install -e ".[dev]"', "pytest");
  else if (paths.includes("requirements.txt")) commands.push("pip install -r requirements.txt");
  if (paths.includes("go.mod")) commands.push("go test ./...", "go run .");
  if (paths.includes("Cargo.toml")) commands.push("cargo test", "cargo run");
  if (paths.some((path) => /compose\.ya?ml$/.test(path))) commands.push("docker compose up");
  return [...new Set(commands)].slice(0, 8);
}

function summarizeDirectories(files: TreeEntry[]) {
  const counts = new Map<string, number>();
  for (const file of files) {
    const first = file.path.includes("/") ? file.path.split("/")[0] : "(root)";
    counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, fileCount]) => ({ name, files: fileCount }))
    .sort((a, b) => b.files - a.files)
    .slice(0, 10);
}

function summarizeFileTypes(files: TreeEntry[]) {
  const counts = new Map<string, number>();
  for (const file of files) {
    const name = file.path.split("/").pop() ?? "";
    const ext = name.includes(".") ? "." + name.split(".").pop()!.toLowerCase() : "(none)";
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([extension, fileCount]) => ({ extension, files: fileCount }))
    .sort((a, b) => b.files - a.files)
    .slice(0, 10);
}
