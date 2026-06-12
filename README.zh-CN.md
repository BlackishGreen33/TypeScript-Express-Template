<h1 align="center">create-typescript-express</h1>

<p align="center">
  一个更完整的 npm initializer，用来创建 Express 5、TypeScript、lint、测试、Docker、CI 与可选 API 功能都已配置好的项目。
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

## 为什么选这个模板

`create-typescript-express` 提供一个偏向实务、但不臃肿的 Express 起点。它不会默认塞入数据库、ORM、身份验证或 API 文档框架，避免每个新项目一开始就背上不需要的复杂度。

它适合想要“创建后立刻能跑、能测、能检查”的项目：

- Express 5 与 TypeScript strict mode。
- 受 `create-next-app` 启发的交互式 CLI prompts。
- Node 24 LTS 基线与 npm lockfile。
- 已配置 `@/*` TypeScript import alias，development 与 production build 都可用。
- `tsx` 开发服务器、可编译的 production output、静态资源复制。
- ESLint、Prettier、`node:test`、Supertest 与 GitHub Actions。
- Dockerfile、健康检查端点、`.env.example` 与多语言 README。

> [!TIP]
> Prisma、OpenAPI、JWT auth、queue、后台任务等重型 API 配置刻意不默认加入。真正需要时再加，模板会更干净。

## 快速开始

```bash
npm create typescript-express@latest my-api
cd my-api
npm run dev
```

打开 `http://localhost:8000`。

如果要非交互式创建项目，请加上 `--yes`：

```bash
npm create typescript-express@latest my-api -- --yes
```

生成后的项目包含：

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run check
```

## CLI 选项

默认流程会询问 project name、是否使用 recommended defaults、package manager、是否安装依赖，以及在自定义模式下选择 optional feature groups。

```bash
npm create typescript-express@latest [project-name] -- [options]
```

常用选项：

- `--yes`：不进入 prompts，直接使用 recommended defaults。
- `--import-alias <alias>` / `--no-import-alias`：配置或停用 TypeScript path alias。
- `--features <list>`：加入可选功能组：`security`、`validation`、`openapi`、`prisma`、`auth`。
- `--no-views`、`--no-logging`、`--no-cookies`、`--no-dotenv`、`--no-docker`、`--no-ci`：裁剪内置模板能力。
- `--use-npm`、`--use-pnpm`、`--use-yarn`、`--use-bun`：指定 package manager。
- `--skip-install`：只生成文件，不安装依赖。

可选功能组：

| Feature      | 加入内容                                                             |
| ------------ | -------------------------------------------------------------------- |
| `security`   | `helmet`、`cors`、`compression` 与 `express-rate-limit` middleware。 |
| `validation` | `zod`、request validation helper 与最小 validated route。            |
| `openapi`    | `/openapi.json` 与 `/docs` Swagger UI。                              |
| `prisma`     | Prisma schema、client helper 与 Prisma scripts。                     |
| `auth`       | `jose` bearer JWT middleware helper。                                |

## 生成后的项目

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

生成后的应用提供：

- `GET /`：最小 starter route。
- `GET /health`：给 smoke test 和容器健康检查使用的 JSON 响应。
- 使用 Pug error view 的 404 处理。

## Package 开发

这个 repository 是 npm initializer package。用户真正会收到的应用模板放在 `template/`。

本地开发请使用 Node 24。根目录 package 和生成后的模板都包含 `.nvmrc` 与 `.node-version`，并指向同一个 runtime 基线。安装 dependencies 或执行检查前，请先切换到 Node 24。

```bash
fnm use || nvm use
npm ci
npm run check
```

根目录检查会验证：

- initializer CLI。
- 内置模板。
- 生成后的 smoke projects，包含 production `npm run start`、`/health` 与 optional feature checks。
- `npm pack --dry-run`。
- production dependency audit。

Docker 另外检查，避免每次本地 `npm run check` 都要求 Docker：

```bash
npm run test:docker
```

CI 和 release workflow 会同时执行 `npm run check` 与 `npm run test:docker`。

## 发布

包名是 `create-typescript-express`，所以 npm 会把：

```bash
npm create typescript-express@latest my-api
```

映射到：

```bash
npm exec create-typescript-express@latest my-api
```

Release 预期通过 GitHub Actions 在 `v*` tag 上发布，并使用 npm Trusted Publishing 与 provenance。推 tag 前先执行：

```bash
npm version patch
git push origin main --follow-tags
```

> [!IMPORTANT]
> 请先在 npm 后台把这个 package 设为 trusted publisher。没有 npm 端的 OIDC 设置时，workflow 可以跑检查，但不能完成发布。

## License

MIT License。详见 [LICENSE](./LICENSE)。
