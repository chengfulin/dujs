# 團隊技術標準建議（Tech Standards）

> 版本：1.3.2｜性質：**建議參考**，非強制憲章。
>
> 本文件提供團隊預設的技術選型建議，協助新專案快速取得一致、可維護的技術基礎。
> 與 [`constitution.md`](constitution.md) 等憲章不同，本文件條目為 **SHOULD（建議）**——
> 採用其他成熟、社群活躍的替代方案是允許的，但 **SHOULD** 於 spec / PR 說明選型理由，
> 以利知識傳承與後續維護。

## 建議選型總覽

| 應用類型 | 建議框架 / 技術 | 說明 |
|---------|----------------|------|
| Node.js API 服務 | **NestJS** | 內建分層架構（module / controller / provider）、DI、guard，契合憲章責任分離要求 |
| Python API 服務 | **FastAPI** | 原生 OpenAPI 3.1、型別驗證（Pydantic）、非同步支援 |
| 工具服務（worker / 批次 / CLI）| 依語言採該語言成熟框架 | Python（FastAPI / Typer）、Shell（見 §SH）；容器化與部署見 §DEP |
| 前端網頁應用 | **Vue 3 + Nuxt 3** | Composition API、`<script setup>`、Vite、Pinia 生態成熟；Nuxt 3 另補上檔案式路由與 `runtimeConfig`。微服務前端的靜態產物與執行期設定注入見〈前端執行期設定注入〉|
| 容器化 / 部署 | **Docker + Docker Compose** | 所有自建服務以容器為優先、Compose 為主要部署實現；K8s 為低優先客戶選項（見 §DEP）。同一顆映像跨環境提升（build once, deploy many）見〈後端服務映像與部署〉〈前端執行期設定注入〉|

## 建議的責任分離實作（API 服務）

憲章 §API-4 只要求**責任分離**（transport / application / domain / infrastructure），不綁定形狀。團隊建議的一種具體實作為四層：

| 層 | 對應責任 |
|----|---------|
| Middleware / Guard | transport 橫切：authn / authz / rate limit / request logging |
| Controller | transport 接入：路由、請求解析、回應組裝、輸入驗證 |
| Service | application + domain：用例編排與商務邏輯 |
| Repository | infrastructure：資料存取封裝 |

採用 DDD、Hexagonal、CQRS 等其他達成同等分離的架構亦合規。

## 後端服務映像與部署（微服務後端）

微服務後端的映像 **SHOULD** 一次建置、多環境部署（build once, deploy many）：同一顆映像以 tag
提升（promote）方式跨 dev / staging / prod，環境差異**只**由容器啟動時的環境變數表達
（§CP-3、§DEP-2）。後端天生於執行期讀環境變數，落實成本遠低於前端；常見破口不在讀取方式，
而在**建置期把環境資訊帶進映像**。

要點：

- 映像不得含 `.env` 或各環境設定檔（§DEP-2）。`.dockerignore` **SHOULD** 明確排除 `.env*`、
  本機憑證、`node_modules` 與建置產物——`COPY . .` 會把它們送進 builder 階段，機密可能經
  **build cache 匯出／推送 builder 階段供 CI 重用**、**建置期被 bundler 內嵌進產物**
  （如 `define` 類的編譯期取代）、或**建置 log 印出檔案內容**而外流；只靠「最終階段沒複製」
  並不足以隔離。
- 建置參數（`ARG`）**SHOULD** 僅用於與環境無關的建置設定（語言版本、bundler target），
  **SHOULD NOT** 用來帶入 API base URL、連線字串、租戶識別等環境相依值——那會讓映像綁定單一環境。
- 映像 tag **SHOULD** 指向不可變的建置產物（commit SHA / 版本號），**SHOULD NOT** 讓可變 tag
  （`latest`、`develop`）在環境間流動；否則無法保證 production 跑的與測過的是同一顆，
  §DEP-2 的映像安全掃描也失去「掃一次涵蓋所有環境」的效力。（§DEP-4 的版本鎖定規範對象是
  **第三方映像**；此處是把同一精神延伸建議到**自建映像**，屬本文件的 SHOULD，非憲章 MUST。）
- 啟動時 **SHOULD** 驗證必要環境變數存在且非空、缺漏時以非 0 結束（§DEP-2），
  **SHOULD NOT** 帶著空設定進入 ready 狀態。
- DB migration **SHOULD** 隨映像一起發布、於部署時對目標環境執行（§DEP-5），而非各環境各自建置。

### 建議的映像結構（多階段建置）

以 Node.js / NestJS 微服務為例，團隊建議的一種具體實作：

| 環節 | 做法 | 目的 |
|------|------|------|
| builder 階段 | 釘住版本的基底映像（如 `node:22.13-alpine`）、`npm ci` 後 build | 建置環境與執行環境分離；基底版本鎖定確保建置可重現 |
| 產物精簡 | 以 bundler（如 esbuild）打包成單一入口檔，原生相依維持 external | 減少最終映像檔案數與啟動 I/O |
| 相依精簡 | `npm prune --omit=dev`；移除只在建置期需要的 CLI 套件 | 縮小攻擊面與映像體積（§DEP-2 最小基底） |
| runtime 階段 | 全新的同版基底，只 `COPY --from=builder` 必要產物 | 原始碼、建置工具鏈、dev 相依不進最終映像 |
| 執行身分 | 需寫入的目錄先建好並 `chown`，最後 `USER node` | 滿足 §DEP-2 的 non-root 要求 |
| 基底修補 | `apk upgrade` / 釘住已修補版本的系統套件 | 通過容器映像安全掃描（§DEP-2） |
| 多入口 | 同一顆映像含多個 bundle（如 API server 與其 CLI / worker），由 `CMD` 或 Compose `command` 選擇 | 同一份程式碼只維護一顆映像，仍可跑不同角色 |

> 多入口僅適用於**同一服務自身的輔助進入點**（該服務的 migration CLI、批次 worker、admin script）。
> 把兩個原本各自獨立部署的微服務打包進同一顆映像違反 §SVC-7（可獨立部署）。

下列為對應上表的 Dockerfile 參考骨架：

```dockerfile
# ---- builder：完整 toolchain，產物在此打包 ----
FROM node:22.13-alpine AS builder
WORKDIR /app
COPY . .                              # 依賴 .dockerignore 排除 .env*、憑證、node_modules
RUN npm ci \
 && npm run build \
 && node_modules/.bin/esbuild dist/main.js \
      --platform=node --target=node22.13 \
      --bundle --packages=external --outfile=app.js \
 && npm prune --omit=dev

# ---- runtime：全新同版基底，只帶產物 ----
FROM node:22.13-alpine
RUN apk update && apk upgrade --available   # 修基底 CVE；必要時釘住已修補版本
WORKDIR /app
RUN mkdir logs && chown node:node logs      # 需寫入的目錄先備妥權限
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/app.js ./
USER node
CMD ["node", "app.js"]                      # 其他入口由 Compose command 覆寫
```

為修 CVE 而手動抽換基底映像內建套件（如覆蓋 npm 捆綁的相依）屬**臨時緩解**：**SHOULD** 於
Dockerfile 註記 CVE 編號與移除條件，並在上游基底修好後回退，避免臨時修補長期沉積成技術債。

常見反模式：

- 為每個環境各建一顆映像，或用 build arg / 建置期設定檔把環境差異打進映像。
- 讓可變 tag 在環境間流動，使「測過的映像」與「上線的映像」不保證相同。
- 最終映像保留原始碼、建置工具鏈或 dev 相依。
- 以 root 執行容器（違反 §DEP-2）。

## 前端執行期設定注入（微服務前端）

微服務架構下，同一份前端產物 **SHOULD** 一次建置、多環境部署（build once, deploy many）：
API base URL、WebSocket 位址、登入／登出導向、功能旗標等環境相依設定 **SHOULD** 在
**容器啟動時**由環境變數注入，**SHOULD NOT** 於建置期固化進 bundle——否則每換一個環境
就得重建映像，與「設定不得寫死」（§CP-3）與「設定不得烘焙進映像」（§DEP-2）的要求相違。

團隊建議的一種具體實作——Nuxt 3 以 `nuxt generate`（`ssr: false`）產靜態產物，交由 Nginx 供應，
設定於容器啟動時展開：

| 環節 | 檔案（參考命名）| 職責 |
|------|----------------|------|
| 設定樣板 | `public/json/config.json.template` | 以 `${VAR}` 佔位列出所有執行期設定，隨產物一起進映像 |
| 啟動注入 | `.deployment/parse-env.sh` | 容器啟動時 `envsubst` 展開樣板 → 產生 `json/config.json` 於 web root |
| 啟動流程 | `.deployment/start-nginx.sh` | 先跑 `parse-env.sh`，再 `nginx -g 'daemon off;'` |
| 應用讀取 | `plugins/0X.config.ts` | production 下 `$fetch` 取 `${app.baseURL}json/config.json`，回填 `runtimeConfig.public` |
| 開發預設 | `nuxt.config.ts` 的 `runtimeConfig.public` | 僅供 development 由 `process.env` 取值；production 一律留空由 plugin 覆寫 |

```sh
# parse-env.sh：容器啟動時展開樣板
envsubst < /usr/share/nginx/html/json/config.json.template > /usr/share/nginx/html/json/config.json
```

要點：

- 依 §FE-3，`config.json` **僅可**含非機密設定（base URL、路徑、功能旗標）——它是公開可讀的靜態資源。
- 環境變數命名 **SHOULD** 語意清楚且全專案一致。附錄 A 的 `VITE_API_BASE_URL` 是**建置期**慣例，
  執行期注入不適用；`NUXT_PUBLIC_*` 同理，避免與 build-time 值混淆。
- 啟動腳本 **SHOULD** 在 `envsubst` 前檢查必要變數存在且非空、缺漏時以非 0 結束（§DEP-2「啟動時
  驗證必要設定存在」）；否則 `envsubst` 會靜默展開成空字串，讓服務帶著空設定進入 ready 狀態，
  錯誤延後到使用者操作時才浮現。
- `config.json` **SHOULD** 以 `Cache-Control: no-store`（或 `no-cache`）供應。它是每次啟動重新產生的
  執行期產物，被瀏覽器或前置 CDN 快取住會使改設定重啟後仍讀到舊值。
- CSP 允許來源（`connect-src` 等）需隨注入的 domain 調整（依 §FE-2 不得寫死）；實務上 **SHOULD**
  一併納入設定樣板。
- 前端讀不到設定時 **SHOULD** 有明確失敗行為（錯誤畫面或明確 log），**SHOULD NOT** 靜默降級成預設值。
- CI/CD 的 tag 提升（promote）作法與前後端一致，見〈後端服務映像與部署〉；前端的差別只在於
  設定注入需自行實作（後端由執行期直接讀環境變數即可）。

常見反模式：

- `COPY .env .` 進映像——把環境設定烘焙進映像，違反 §DEP-2；`.env` 含機密時另違反 §CP-2。
  執行期設定既已走樣板注入，映像內不需要 `.env`。
- 為每個環境各建一份映像、把 API base URL 於建置期打進 bundle。單體／單環境部署仍可依 §FE-3
  採建置期注入；**微服務多環境部署**下此法才視為應避免的反模式。
- 把樣板產出的 `config.json` 提交進版控——它是執行期產物，**SHOULD** 列入 `.gitignore`。

## 測試工具建議

憲章 §TR-7 規範測試案例以 ISP 為優先設計方法、§TR-2 建議以 mutation testing 驗證測試品質；下列為達成上述要求的建議工具（同為 SHOULD 建議，替代方案合規）：

| 目的 | 建議工具 | 說明 |
|------|---------|------|
| Property-Based Testing（PBT）| **fast-check**（Jest / Vitest 生態）| ISP 每個 block 只取一個代表值；PBT 在 block 內隨機採樣並自動縮小反例，兩者**互補而非替代**。適合有明確不變量的邏輯（如「回傳長度 ≤ 上限」）|
| Mutation testing | **Stryker**（依測試框架選 `@stryker-mutator/vitest-runner` / `jest-runner`；Python 可用 `mutmut`）| mutation score 衡量測試「殺得死錯誤」的能力，較覆蓋率更能反映斷言品質（見 §TR-2）|

建議工作流：跑 coverage 找**漏測**的程式區域 → 跑 mutation testing 找**弱斷言** → 將存活的 mutants 作為補強測試的具體目標，迭代至收斂。以 AI agent 產生測試時，存活 mutants 是比「提高測試品質」更有效的具體回饋。

## 選型原則

- 框架 **SHOULD** 為成熟、社群活躍、有長期維護承諾者；**SHOULD NOT** 自製不成熟的核心框架。
- 同一專案 / 服務內 **SHOULD** 維持選型一致，避免混用多種同質框架增加維護成本。
- 偏離本建議時，**SHOULD** 在 spec / PR 說明替代方案及其理由（如既有系統相容性、團隊熟悉度、特定需求）。

## 與憲章的關係

- 憲章規範的是**架構與行為要求**（如分層、OpenAPI、安全標頭、測試），這些為強制項。
- 本文件規範的是**達成上述要求的建議工具**。只要替代方案同樣能滿足憲章的強制要求，即為合規。
- 對應憲章條款：API 責任分離見 [`constitution-api.md`](constitution-api.md) §API-4；前端框架見 [`constitution-frontend.md`](constitution-frontend.md) §FE-1、前端設定與機密見 §FE-3；容器化與部署見 [`constitution-deployment.md`](constitution-deployment.md) §DEP（設定不得烘焙進映像、non-root、映像掃描見 §DEP-2；migration 見 §DEP-5）；服務可獨立部署見 [`constitution-microservice.md`](constitution-microservice.md) §SVC-7。
