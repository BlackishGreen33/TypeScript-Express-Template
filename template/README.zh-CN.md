# TypeScript Express App

<p>
  <a href="./README.md">English</a>
  ·
  <a href="./README.zh-TW.md">繁體中文</a>
  ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>

由 `create-typescript-express` 生成的轻量 Express 5 应用。

## 功能

- Express 5 与 TypeScript strict mode。
- Node 24 LTS 基线与 npm lockfile。
- 内部 TypeScript modules 使用 `@/*` import alias。
- 使用 `tsx` watch mode 进行本地开发。
- ESLint、Prettier、`node:test` 与 Supertest。
- Pug views、静态资源、`.env.example`、Dockerfile 与 GitHub Actions CI。

## 开始使用

请使用 Node 24。这个项目包含 `.nvmrc` 与 `.node-version`，可供版本管理工具读取。

```bash
npm install
npm run dev
```

打开 `http://localhost:8000`。

## Scripts

```bash
npm run dev          # 启动 TypeScript dev server
npm run typecheck    # 只检查 TypeScript 类型，不输出文件
npm run lint         # 执行 ESLint
npm run format:check # 检查 Prettier 格式
npm test             # build 后执行 HTTP 测试
npm run build        # 编译 TypeScript、改写 aliases 并复制静态资源
npm run check        # 执行完整本地质量检查
```

## Routes

- `GET /` 返回 starter greeting。
- `GET /health` 返回 JSON 健康状态。
- 未匹配路由会用 Pug error view 返回 404。

## Docker

```bash
docker build -t typescript-express-app .
docker run --rm -p 8000:8000 typescript-express-app
```

## 项目结构

```text
.
├── .node-version
├── .nvmrc
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

只加入你的应用真正需要的部分：validation、persistence、authentication、OpenAPI、queue 或 background worker。保持基底轻量，第一次 clone 才容易理解与维护。

## License

MIT License。详见 [LICENSE](./LICENSE)。
