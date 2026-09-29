# RepoLens

RepoLens turns a public GitHub repository URL into a quick codebase overview.

Paste a repo such as `github.com/timwmcqueen/FieldOps` and it reads the public repository metadata and file tree to show the detected stack, tests, CI setup, containers, likely entry points, language mix, recent commits, and repository structure.

![CI](https://github.com/timwmcqueen/RepoLens/actions/workflows/ci.yml/badge.svg)

## Try it

The app is a Vite/React project and runs entirely in the browser.

[Open in StackBlitz](https://stackblitz.com/github/timwmcqueen/RepoLens?startScript=dev)

Or clone it:

```bash
git clone https://github.com/timwmcqueen/RepoLens.git
cd RepoLens
npm install
npm run dev
```

## What it reads

RepoLens makes read-only requests to GitHub's public API for:

- repository metadata
- language totals
- the repository file tree
- recent commits

It also reads a small set of public manifest/configuration files when they exist, including `package.json`, `pyproject.toml`, `pom.xml`, Docker files, Prisma schema files, and GitHub Actions workflows.

No GitHub token is requested or stored.

## What it shows

- detected languages, frameworks, databases, and tools
- test-file and CI-workflow detection
- Docker, security, documentation, and license signals
- likely application entry points
- inferred local run commands
- language percentages
- largest areas of the repository
- searchable file tree
- recent commit activity
- direct links back to source files on GitHub

## Local commands

```bash
npm install
npm test
npm run build
npm run dev
```

## Downloadable build

GitHub Actions uploads the contents of `dist/` as the `repolens-static-build` artifact after a successful build. The artifact can be downloaded from a workflow run and served by any static web server.

Because Vite uses a relative asset base, the built files can be hosted from a subdirectory without rebuilding.

## GitHub API limits

RepoLens uses GitHub's unauthenticated public API, which has a rate limit. If GitHub reports that the anonymous limit has been reached, wait for the limit to reset before running another analysis.

## Stack

- React 19
- TypeScript
- Vite
- Vitest
- GitHub REST API
- GitHub Actions
