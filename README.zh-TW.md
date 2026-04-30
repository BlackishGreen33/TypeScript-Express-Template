<h1 align="center">create-typescript-express</h1>

<p align="center">
  一個更完整的 npm initializer，用來建立 Express 5、TypeScript、lint、測試、Docker、CI 與可選 API 功能都已配置好的專案。
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

## 為什麼選這個模板

`create-typescript-express` 提供一個偏向實務、但不臃腫的 Express 起點。它不會預設塞入資料庫、ORM、身份驗證或 API 文件框架，避免每個新專案一開始就背上不需要的複雜度。

它適合想要「建立後立刻能跑、能測、能檢查」的專案：

- Express 5 與 TypeScript strict mode。
- 受 `create-next-app` 啟發的互動式 CLI prompts。
- Node 24 LTS 基線與 npm lockfile。
- 已配置 `@/*` TypeScript import alias，development 與 production build 都可用。
- `tsx` 開發伺服器、可編譯的 production output、靜態資源複製。
- ESLint、Prettier、`node:test`、Supertest 與 GitHub Actions。
- Dockerfile、健康檢查端點、`.env.example` 與多語 README。

> [!TIP]
> Prisma、OpenAPI、JWT auth、queue、背景工作等重型 API 配置刻意不預設加入。真正需要時再加，模板會更乾淨。

## 快速開始

```bash
npm create typescript-express@latest my-api
cd my-api
npm run dev
```

開啟 `http://localhost:8000`。

如果要非互動式建立專案，請加上 `--yes`：

```bash
npm create typescript-express@latest my-api -- --yes
```

生成後的專案包含：

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run check
```

## CLI 選項

預設流程會詢問 project name、是否使用 recommended defaults、package manager、是否安裝依賴，以及在自訂模式下選擇 optional feature groups。

```bash
npm create typescript-express@latest [project-name] -- [options]
```

常用選項：

- `--yes`：不進入 prompts，直接使用 recommended defaults。
- `--import-alias <alias>` / `--no-import-alias`：配置或停用 TypeScript path alias。
- `--features <list>`：加入可選功能群組：`security`、`validation`、`openapi`、`prisma`、`auth`。
- `--no-views`、`--no-logging`、`--no-cookies`、`--no-dotenv`、`--no-docker`、`--no-ci`：裁剪內建模板能力。
- `--use-npm`、`--use-pnpm`、`--use-yarn`、`--use-bun`：指定 package manager。
- `--skip-install`：只產生檔案，不安裝依賴。

可選功能群組：

| Feature      | 加入內容                                                             |
| ------------ | -------------------------------------------------------------------- |
| `security`   | `helmet`、`cors`、`compression` 與 `express-rate-limit` middleware。 |
| `validation` | `zod`、request validation helper 與最小 validated route。            |
| `openapi`    | `/openapi.json` 與 `/docs` Swagger UI。                              |
| `prisma`     | Prisma schema、client helper 與 Prisma scripts。                     |
| `auth`       | `jose` bearer JWT middleware helper。                                |

## 生成後的專案

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

生成後的應用提供：

- `GET /`：最小 starter route。
- `GET /health`：給 smoke test 和容器健康檢查使用的 JSON 回應。
- 使用 Pug error view 的 404 處理。

## Package 開發

這個 repository 是 npm initializer package。使用者真正會收到的應用模板放在 `template/`。

本地開發請使用 Node 24。根目錄 package 和生成後的模板都包含 `.nvmrc` 與 `.node-version`，並指向同一個 runtime 基線。

```bash
npm ci
npm run check
```

根目錄檢查會驗證：

- initializer CLI。
- 內建模板。
- 生成後的 smoke projects，包含 production `npm run start`、`/health` 與 optional feature checks。
- `npm pack --dry-run`。
- production dependency audit。

Docker 另外檢查，避免每次本地 `npm run check` 都要求 Docker：

```bash
npm run test:docker
```

CI 和 release workflow 會同時執行 `npm run check` 與 `npm run test:docker`。

## 發佈

套件名稱是 `create-typescript-express`，所以 npm 會把：

```bash
npm create typescript-express@latest my-api
```

映射到：

```bash
npm exec create-typescript-express@latest my-api
```

Release 預期透過 GitHub Actions 在 `v*` tag 上發佈，並使用 npm Trusted Publishing 與 provenance。推 tag 前先執行：

```bash
npm version patch
git push origin main --follow-tags
```

> [!IMPORTANT]
> 請先在 npm 後台把這個 package 設為 trusted publisher。沒有 npm 端的 OIDC 設定時，workflow 可以跑檢查，但不能完成發佈。

## License

MIT License。詳見 [LICENSE](./LICENSE)。
