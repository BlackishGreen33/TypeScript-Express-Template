# TypeScript Express App

<p>
  <a href="./README.md">English</a>
  ·
  <a href="./README.zh-TW.md">繁體中文</a>
  ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>

由 `create-typescript-express` 生成的輕量 Express 5 應用。

## 功能

- Express 5 與 TypeScript strict mode。
- Node 24 LTS 基線與 npm lockfile。
- 使用 `tsx` watch mode 進行本地開發。
- ESLint、Prettier、`node:test` 與 Supertest。
- Pug views、靜態資源、`.env.example`、Dockerfile 與 GitHub Actions CI。

## 開始使用

```bash
npm install
npm run dev
```

開啟 `http://localhost:8000`。

## Scripts

```bash
npm run dev          # 啟動 TypeScript dev server
npm run typecheck    # 只檢查 TypeScript 類型，不輸出檔案
npm run lint         # 執行 ESLint
npm run format:check # 檢查 Prettier 格式
npm test             # build 後執行 HTTP 測試
npm run build        # 編譯 TypeScript 並複製靜態資源
npm run check        # 執行完整本地品質檢查
```

## Routes

- `GET /` 回傳 starter greeting。
- `GET /health` 回傳 JSON 健康狀態。
- 未匹配路由會用 Pug error view 回傳 404。

## Docker

```bash
docker build -t typescript-express-app .
docker run --rm -p 8000:8000 typescript-express-app
```

## 專案結構

```text
.
├── app.ts
├── bin/server.ts
├── routes/
├── test/
├── views/
├── public/
├── Dockerfile
└── .github/workflows/ci.yml
```

## 下一步

只加入你的應用真正需要的部分：validation、persistence、authentication、OpenAPI、queue 或 background worker。保持基底輕量，第一次 clone 才容易理解與維護。

## License

MIT License。詳見 [LICENSE](./LICENSE)。
