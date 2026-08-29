# GitHub Repository Capabilities Review

日期：2026-08-29

## 實作狀態

本次調研後已加入 Dependabot、Issue Forms、PR template、`SECURITY.md` 與 `CONTRIBUTING.md`；GitHub 上也已啟用 Dependabot security updates、private vulnerability reporting、`main`／release tag rulesets，並更新 repository metadata、關閉未使用的 Wiki 與 Projects。

## 調研前的倉庫狀態

- 根目錄是 npm initializer 套件：`package.json` 的 package name 是 `create-typescript-express`，`bin` 指向 `dist-cli/create-typescript-express.mjs`。
- 真正生成給使用者的 Express app 位於 `template/`，README 也明確寫著 “This repository is the npm initializer package. The application that users receive lives in `template/`.”
- live GitHub repo 狀態：`isTemplate=false`、Issues 開啟、Discussions 關閉、Wiki 開啟、沒有 repository rulesets。
- `.github/` 目前只有 `workflows/ci.yml` 與 `workflows/release.yml`，沒有 Dependabot、Issue template、PR template、CODEOWNERS 或 SECURITY.md。

## 建議排序

### 1. 不建議直接把這個 repo 當 app template

GitHub template repository 會讓使用者用相同的目錄結構、branches 與 files 建立新 repo；官方文件也說 admin 可以把既有 repo 設為 template。這對「複製 initializer 專案本身」有效，但不會執行本 repo 的 CLI，也不會只抽出 `template/`。

因此，直接開啟 `--template` 會讓使用者得到 `create-typescript-express` 這個 npm initializer 的原始碼，不是 `npm create typescript-express` 生成後的 app。對這個專案的主要使用者路徑來說，這是錯入口。

更合適的做法是維持 npm initializer 作為主要入口：

```bash
npm create typescript-express@latest my-api -- --yes
```

如果確實想支援 GitHub UI 的 “Use this template”，應該另建一個「生成後的 app」倉庫，例如 `typescript-express-app-template`，內容由此 repo 的 CLI 產生後同步。該 repo 才適合設為 GitHub template。

官方依據：

- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository
- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template

若只是要把本 repo 設成 initializer 開發模板，可用：

```bash
gh repo edit BlackishGreen33/TypeScript-Express-Template --template
```

但這不等於一鍵產生 Express app。

### 2. 優先補 Dependabot

這個 repo 同時有 root `package.json`、`template/package.json` 與 GitHub Actions。GitHub 官方說 Dependabot version updates 透過提交 `.github/dependabot.yml` 啟用，並可監控 npm 與 GitHub Actions。

建議最小配置：

- npm `/`
- npm `/template`
- github-actions `/`
- weekly schedule
- 先不要開 auto-merge

官方依據：

- https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates
- https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions

### 3. 建 main branch ruleset

目前 live repo rulesets 為空。建議建立 `main` branch ruleset，要求 PR 進 main 前通過 CI。這比只靠習慣可靠，且 GitHub 官方說 repository rulesets 可控制使用者如何與指定 branches/tags 互動。

建議從保守規則開始：

- target：`main`
- require status checks：`quality`、`docker-smoke`
- block force pushes
- block deletions
- require pull request before merging：若仍需要 owner 直接 push release commit，可先不開或給 admin bypass

官方依據：

- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository
- https://docs.github.com/en/rest/repos/rules

### 4. 補 Issue / PR templates

這是公開 starter/initializer 類 repo 的低成本改進。Issue forms 可以要求使用者提供 Node/npm 版本、CLI 指令、選用 features、錯誤輸出；PR template 可以要求列出驗證命令。

官方文件說 issue templates 可在 repository settings 中建立，也可透過預設分支中的 template config 自訂 chooser；PR template 可由 repo 檔案提供。

官方依據：

- https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository
- https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository

### 5. 補 SECURITY.md

這個 initializer 會生成 web app，且有 optional auth/security feature。即使目前不做完整安全流程，也應至少告訴使用者如何回報安全問題、哪些問題算 security，以及不要公開貼 secrets。

建議只放一頁簡短政策，不需要導入外部安全平台。

### 6. CODEOWNERS 視協作者數量再加

GitHub 官方說 CODEOWNERS 可定義檔案責任人，並可配合 required reviews。若目前主要是個人維護，CODEOWNERS 的收益有限；等有固定協作者或想保護 release workflow 時再加。

官方依據：

- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

### 7. 調整 repo metadata

live repo description 是 “An initial template for an Express project based on TypeScript”，但 README 與 package 實際定位是 npm initializer。建議改成：

```text
Create a lightweight Express 5 app with TypeScript, linting, tests, Docker, CI, and optional API features.
```

也建議補 topics：

- `express`
- `typescript`
- `create`
- `starter`
- `cli`
- `nodejs`
- `expressjs`

這是 repository settings/API 層面的調整，不需要改程式碼。

### 8. 關閉 Wiki，暫不開 Discussions

README 與 `template/README*` 已經承擔文檔入口，Wiki 會製造第二份文檔來源，容易漂移。建議關閉 Wiki。

Discussions 對大型社群有價值，但這個 repo 現階段 Issues 足夠。等出現重複問答、展示用例或 roadmap 討論後再開。

## 不建議現在做

- 不建議在本 repo root 增加 GitHub template button，因為會導向 initializer 原始碼而不是生成 app。
- 不建議加自動創 repo 的 workflow，會牽涉 token 權限與 repo creation scope，維護成本高於收益。
- 不建議立刻加 CodeQL/Scorecard 等重型供應鏈檢查；目前最短路徑是 Dependabot、ruleset、現有 CI 與發布 provenance。
- 不建議把 optional features 變成 GitHub template 分支矩陣；GitHub template 無法提供 CLI prompt 等互動選項，會跟目前 initializer 的深模組入口重疊。
