<h1 align="center">create-typescript-express</h1>

<p align="center">
  A polished npm initializer for Express 5, TypeScript, linting, tests, Docker, CI, and optional API features.
</p>

<p align="center">
  <a href="./README.md">English</a>
  ·
  <a href="./README.zh-TW.md">繁體中文</a>
  ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/express-5.x-000000?logo=express&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-6.x-3178C6?logo=typescript&logoColor=white">
  <img alt="License" src="https://img.shields.io/github/license/BlackishGreen33/TypeScript-Express-Template">
</p>

## Why This Template

`create-typescript-express` gives you a small production-minded Express starter without forcing a database, ORM, authentication layer, or API documentation stack on every new project.

It is designed for teams that want a clean base that runs immediately after creation:

- Express 5 with TypeScript strict mode.
- Interactive CLI prompts inspired by `create-next-app`.
- Node 24 LTS baseline and npm lockfile support.
- `@/*` TypeScript import alias configured for both development and production builds.
- `tsx` development server, compiled production output, and static asset copying.
- ESLint, Prettier, `node:test`, Supertest, and GitHub Actions.
- Dockerfile, health check endpoint, `.env.example`, and multilingual docs.

> [!TIP]
> Heavy API features such as Prisma, OpenAPI, JWT auth, queues, or background workers are intentionally left out. Add them when the project actually needs them.

## Quick Start

```bash
npm create typescript-express@latest my-api
cd my-api
npm run dev
```

Open `http://localhost:8000`.

For non-interactive usage, pass `--yes`:

```bash
npm create typescript-express@latest my-api -- --yes
```

Generated projects include:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run check
```

## CLI Options

The default flow asks for a project name, whether to use recommended defaults, package manager, install behavior, and optional feature groups when customizing.

```bash
npm create typescript-express@latest [project-name] -- [options]
```

Common options:

- `--yes` - use recommended defaults without prompts.
- `--import-alias <alias>` / `--no-import-alias` - configure or disable TypeScript path aliasing.
- `--features <list>` - add optional feature groups: `security`, `validation`, `openapi`, `prisma`, `auth`.
- `--no-views`, `--no-logging`, `--no-cookies`, `--no-dotenv`, `--no-docker`, `--no-ci` - trim built-in template pieces.
- `--use-npm`, `--use-pnpm`, `--use-yarn`, `--use-bun` - choose the package manager.
- `--skip-install` - create files without installing dependencies.

Optional feature groups:

| Feature      | Adds                                                                  |
| ------------ | --------------------------------------------------------------------- |
| `security`   | `helmet`, `cors`, `compression`, and `express-rate-limit` middleware. |
| `validation` | `zod`, a request validation helper, and a minimal validated route.    |
| `openapi`    | `/openapi.json` and Swagger UI at `/docs`.                            |
| `prisma`     | Prisma schema, client helper, and Prisma scripts.                     |
| `auth`       | `jose` bearer JWT middleware helper.                                  |

## Generated Project

```text
my-api
├── .node-version
├── .nvmrc
├── app.ts
├── bin/server.ts
├── routes/
├── test/
├── views/
├── public/
├── Dockerfile
├── package-lock.json
└── .github/workflows/ci.yml
```

The generated application exposes:

- `GET /` - a minimal starter route.
- `GET /health` - JSON health response for smoke checks and containers.
- 404 handling with a Pug error view.

## Package Development

This repository is the npm initializer package. The application that users receive lives in `template/`.

Use Node 24 for local development. The root package and generated template both include `.nvmrc` and `.node-version` files that point to the same runtime baseline. Switch to Node 24 before installing dependencies or running checks.

```bash
fnm use || nvm use
npm ci
npm run check
```

The root check validates:

- The initializer CLI.
- The bundled template.
- Generated smoke projects, including production `npm run start`, `/health`, and optional feature checks.
- `npm pack --dry-run`.
- Production dependency audit.

Docker is checked separately so local development does not require Docker for every `npm run check`:

```bash
npm run test:docker
```

CI and release workflows run both `npm run check` and `npm run test:docker`.

## Publishing

The package name is `create-typescript-express`, so npm maps:

```bash
npm create typescript-express@latest my-api
```

to:

```bash
npm exec create-typescript-express@latest my-api
```

Releases are intended to be published from GitHub Actions on `v*` tags with npm Trusted Publishing and provenance enabled. Before pushing a tag, run:

```bash
npm version patch
git push origin main --follow-tags
```

> [!IMPORTANT]
> Configure this package as a trusted publisher in npm before relying on the release workflow. Without that npm-side setup, the workflow can run checks but cannot publish via OIDC.

## License

MIT License. See [LICENSE](./LICENSE).
