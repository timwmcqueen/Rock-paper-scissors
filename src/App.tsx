import { FormEvent, useMemo, useState } from "react";
import { analyzeRepository } from "./analyzer";
import { loadRepository } from "./github";
import type { RepoAnalysis, RepoData } from "./types";

const examples = [
  { label: "FieldOps", value: "timwmcqueen/FieldOps" },
  { label: "React", value: "facebook/react" },
  { label: "FastAPI", value: "fastapi/fastapi" },
  { label: "Spring Petclinic", value: "spring-projects/spring-petclinic" },
];

type Result = {
  data: RepoData;
  analysis: RepoAnalysis;
};

export default function App() {
  const [input, setInput] = useState("timwmcqueen/FieldOps");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileFilter, setFileFilter] = useState("");

  async function analyze(event?: FormEvent) {
    event?.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    setFileFilter("");

    try {
      const data = await loadRepository(input);
      setResult({ data, analysis: analyzeRepository(data) });
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Unable to read that repository.");
    } finally {
      setLoading(false);
    }
  }

  function useExample(value: string) {
    setInput(value);
    queueMicrotask(() => {
      const form = document.getElementById("repo-form") as HTMLFormElement | null;
      form?.requestSubmit();
    });
  }

  return (
    <main>
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <div className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="eyebrow">GitHub codebase x-ray</p>
            <h1>RepoLens</h1>
            <p className="lede">
              Paste a public GitHub repository. RepoLens reads the repo structure and gives you a
              quick map of the stack, tests, CI, containers, entry points, recent activity, and
              the files that matter first.
            </p>
          </div>

          <form id="repo-form" className="analyze-box" onSubmit={analyze}>
            <label htmlFor="repo-url">GitHub repository</label>
            <div className="input-row">
              <input
                id="repo-url"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="github.com/owner/repository"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button className="analyze-button" type="submit" disabled={loading}>
                {loading ? "Reading…" : "Analyze"}
              </button>
            </div>

            <div className="examples" aria-label="Example repositories">
              <span>Try:</span>
              {examples.map((example) => (
                <button
                  key={example.value}
                  type="button"
                  onClick={() => useExample(example.value)}
                  disabled={loading}
                >
                  {example.label}
                </button>
              ))}
            </div>

            <p className="api-note">
              Public repositories only. RepoLens uses GitHub's public API directly from your
              browser and does not ask for a GitHub token.
            </p>
          </form>
        </div>
      </section>

      <div className="shell content">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && !result && <EmptyState />}
        {!loading && result && (
          <Report
            result={result}
            fileFilter={fileFilter}
            setFileFilter={setFileFilter}
          />
        )}
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <section className="loading-state" aria-live="polite">
      <div className="radar">
        <div className="radar-ring ring-one" />
        <div className="radar-ring ring-two" />
        <div className="radar-sweep" />
        <div className="radar-dot" />
      </div>
      <div>
        <strong>Reading the repository</strong>
        <p>Fetching metadata, languages, file tree, manifests, workflows, and recent commits.</p>
      </div>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="message-card error-card" role="alert">
      <span className="message-icon">!</span>
      <div>
        <h2>Couldn&apos;t analyze that repository</h2>
        <p>{message}</p>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="empty-grid">
      <article>
        <span className="empty-number">01</span>
        <h2>Paste a repo</h2>
        <p>Use a GitHub URL or just owner/repository.</p>
      </article>
      <article>
        <span className="empty-number">02</span>
        <h2>RepoLens reads it</h2>
        <p>Only public metadata and files are requested.</p>
      </article>
      <article>
        <span className="empty-number">03</span>
        <h2>Get the map</h2>
        <p>See the stack, structure, activity, and useful starting points.</p>
      </article>
    </section>
  );
}

function Report({
  result,
  fileFilter,
  setFileFilter,
}: {
  result: Result;
  fileFilter: string;
  setFileFilter: (value: string) => void;
}) {
  const { data, analysis } = result;

  const visibleFiles = useMemo(() => {
    const files = data.tree.tree.filter((item) => item.type === "blob");
    if (!fileFilter.trim()) return files.slice(0, 80);
    const needle = fileFilter.toLowerCase();
    return files
      .filter((item) => item.path.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [data.tree.tree, fileFilter]);

  const languageRows = languagePercentages(data.languages);
  const pushed = relativeDate(data.repo.pushed_at);

  return (
    <div className="report">
      <section className="repo-heading">
        <div className="repo-identity">
          <img src={data.repo.owner.avatar_url} alt="" />
          <div>
            <p className="repo-owner">{data.repo.owner.login}</p>
            <h2>{data.repo.name}</h2>
            <p className="repo-description">
              {data.repo.description || "No repository description provided."}
            </p>
          </div>
        </div>

        <div className="repo-actions">
          <a href={data.repo.html_url} target="_blank" rel="noreferrer">
            Open on GitHub ↗
          </a>
          <span>pushed {pushed}</span>
        </div>
      </section>

      <section className="metric-strip">
        <Metric label="Stars" value={formatNumber(data.repo.stargazers_count)} />
        <Metric label="Forks" value={formatNumber(data.repo.forks_count)} />
        <Metric
          label="Files scanned"
          value={formatNumber(data.tree.tree.filter((item) => item.type === "blob").length)}
        />
        <Metric label="Tests found" value={formatNumber(analysis.testFileCount)} />
        <Metric label="CI workflows" value={formatNumber(analysis.workflowCount)} />
      </section>

      <div className="report-grid">
        <section className="panel stack-panel">
          <PanelHeader kicker="Detected" title="Stack" />
          {analysis.stack.length ? (
            <div className="stack-groups">
              {(["Frontend", "Backend", "Data", "Testing", "Tooling", "Language"] as const).map(
                (category) => {
                  const items = analysis.stack.filter((item) => item.category === category);
                  if (!items.length) return null;
                  return (
                    <div className="stack-group" key={category}>
                      <span>{category}</span>
                      <div className="chip-row">
                        {items.map((item) => (
                          <span className="stack-chip" key={item.name} title={item.evidence}>
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <p className="muted">No familiar stack markers were found.</p>
          )}
        </section>

        <section className="panel signal-panel">
          <PanelHeader kicker="Repository signals" title="What is set up" />
          <div className="signal-list">
            {analysis.signals.map((signal) => (
              <div className="signal-row" key={signal.label}>
                <span className={signal.found ? "signal-status yes" : "signal-status no"}>
                  {signal.found ? "✓" : "–"}
                </span>
                <div>
                  <strong>{signal.label}</strong>
                  <span>{signal.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel architecture-panel">
          <PanelHeader kicker="Shape" title="Architecture clues" />
          {analysis.architecture.length ? (
            <div className="architecture-flow">
              {analysis.architecture.map((item, index) => (
                <div className="architecture-part" key={item}>
                  <span>{item}</span>
                  {index < analysis.architecture.length - 1 && <b aria-hidden="true">→</b>}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No common application layers were detected from repository files.</p>
          )}

          <div className="entry-points">
            <h3>Start here</h3>
            {analysis.entryPoints.length ? (
              analysis.entryPoints.map((path) => (
                <RepoFileLink
                  key={path}
                  path={path}
                  fullName={data.repo.full_name}
                  branch={data.repo.default_branch}
                />
              ))
            ) : (
              <p className="muted">No common entry-point filenames were found.</p>
            )}
          </div>
        </section>

        <section className="panel commands-panel">
          <PanelHeader kicker="Inferred" title="Run commands" />
          {analysis.runCommands.length ? (
            <div className="command-list">
              {analysis.runCommands.map((command) => (
                <code key={command}>$ {command}</code>
              ))}
            </div>
          ) : (
            <p className="muted">No common package or build manifest was detected.</p>
          )}
          <p className="small-note">
            These commands are inferred from manifest files. Check the repository README before
            running them.
          </p>
        </section>
      </div>

      <div className="wide-grid">
        <section className="panel language-panel">
          <PanelHeader kicker="GitHub language data" title="Language mix" />
          {languageRows.length ? (
            <div className="language-list">
              {languageRows.map((item) => (
                <div className="language-row" key={item.name}>
                  <div>
                    <span>{item.name}</span>
                    <strong>{item.percent.toFixed(1)}%</strong>
                  </div>
                  <div className="bar-track">
                    <span style={{ width: `${Math.max(item.percent, 1)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">GitHub did not return language data.</p>
          )}
        </section>

        <section className="panel directory-panel">
          <PanelHeader kicker="File tree" title="Largest areas" />
          <div className="directory-list">
            {analysis.topDirectories.map((item) => (
              <div key={item.name}>
                <span>{item.name}</span>
                <strong>{item.files} files</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel explorer-panel">
        <div className="explorer-heading">
          <PanelHeader
            kicker={data.tree.truncated ? "GitHub returned a partial tree" : "Repository tree"}
            title="File explorer"
          />
          <input
            aria-label="Filter repository files"
            placeholder="Filter files…"
            value={fileFilter}
            onChange={(event) => setFileFilter(event.target.value)}
          />
        </div>

        <div className="file-table">
          {visibleFiles.map((file) => (
            <RepoFileLink
              key={file.path}
              path={file.path}
              fullName={data.repo.full_name}
              branch={data.repo.default_branch}
              showIcon
            />
          ))}
        </div>
        {!visibleFiles.length && <p className="muted">No files match that filter.</p>}
      </section>

      <section className="panel activity-panel">
        <PanelHeader kicker="Latest" title="Recent commits" />
        <div className="commit-list">
          {data.commits.map((commit) => (
            <a key={commit.sha} href={commit.html_url} target="_blank" rel="noreferrer">
              <span className="commit-dot" />
              <div className="commit-copy">
                <strong>{firstLine(commit.commit.message)}</strong>
                <span>
                  {commit.author?.login || commit.commit.author.name} ·{" "}
                  {relativeDate(commit.commit.author.date)}
                </span>
              </div>
              <code>{commit.sha.slice(0, 7)}</code>
            </a>
          ))}
        </div>
      </section>

      <footer>
        <strong>RepoLens</strong>
        <span>
          No repository contents are uploaded anywhere by this app. Requests go from your browser
          to GitHub.
        </span>
      </footer>
    </div>
  );
}

function PanelHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="panel-heading">
      <p>{kicker}</p>
      <h2>{title}</h2>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RepoFileLink({
  path,
  fullName,
  branch,
  showIcon = false,
}: {
  path: string;
  fullName: string;
  branch: string;
  showIcon?: boolean;
}) {
  const href = `https://github.com/${fullName}/blob/${encodeURIComponent(branch)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  return (
    <a className={showIcon ? "file-link table-file" : "file-link"} href={href} target="_blank" rel="noreferrer">
      {showIcon && <span className="file-icon">{fileGlyph(path)}</span>}
      <code>{path}</code>
      <span>↗</span>
    </a>
  );
}

function languagePercentages(languages: Record<string, number>) {
  const total = Object.values(languages).reduce((sum, value) => sum + value, 0);
  if (!total) return [];
  return Object.entries(languages)
    .map(([name, bytes]) => ({ name, percent: (bytes / total) * 100 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 8);
}

function relativeDate(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value >= 1000 ? "compact" : "standard" }).format(value);
}

function firstLine(message: string) {
  return message.split("\n")[0];
}

function fileGlyph(path: string) {
  if (/README|\.md$/i.test(path)) return "D";
  if (/\.tsx?$/.test(path)) return "T";
  if (/\.jsx?$/.test(path)) return "J";
  if (/\.py$/.test(path)) return "P";
  if (/\.java$/.test(path)) return "J";
  if (/\.ya?ml$/.test(path)) return "Y";
  if (/Dockerfile|compose/i.test(path)) return "C";
  return "F";
}
