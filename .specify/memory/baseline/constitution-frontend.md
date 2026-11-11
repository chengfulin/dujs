# SDD 憲章：前端網頁應用延伸（FE）

> 版本：5.6.0｜本文件為 [`constitution.md`](constitution.md) 之延伸，**須與核心原則（CP）、治理（GV）一併適用**。
> RFC 2119 用語定義見核心文件。條款前綴為 `§FE-`。

> **邊界聲明**：本檔只規範前端的**應用面**（UI、元件、前端安全、測試）。**部署、TLS、反向代理、安全標頭落點**見 [`constitution-deployment.md`](constitution-deployment.md)（DEP）。

> **分級適用**：本章規則以 **Critical / Standard** 為基準描述。Internal、Experimental 分級依核心「服務風險分級」與**附錄 B 矩陣**調整（如安全 header、CSP 於較低分級多為 SHOULD / MAY）。核心原則（CP，含不得打包機密）不因分級豁免。

## 前端網頁應用憲章

本章在核心原則基礎上補充前端網頁應用（SPA / SSR）專屬規範。

### §FE-1 框架與技術選型

- 前端應用 **MUST** 採用成熟、社群活躍的框架與建置工具產生最佳化產物。
- 具體框架選型非本憲章強制項，**SHOULD** 依團隊技術標準建議（見 [`tech-standards.md`](tech-standards.md)，建議採用 **Vue 3 以上版本**）；採用其他框架時 **SHOULD** 在 spec / PR 說明。
- 採用 Vue 時 **SHOULD** 使用 Composition API 與 `<script setup>`；建置工具 **SHOULD** 採用 Vite。
- **SHOULD** 使用 TypeScript 以強化型別安全。
- 共用狀態 **SHOULD** 以統一的狀態管理機制（如 Pinia）管理，**MUST NOT** 以散落的全域變數共享狀態。

### §FE-2 安全標頭與內容安全政策（Security Headers & CSP）

> 安全標頭可能由前端應用或反向代理設定；**責任歸屬之分界見 §DEP-7**（須單一負責，避免重複或遺漏）。

- **production 部署 MUST 具備基本安全 HTTP 標頭策略**（至少涵蓋如 `X-Content-Type-Options: nosniff`、`X-Frame-Options` / `frame-ancestors` 等）。
- 應用 **SHOULD** 導入 CSP（`Content-Security-Policy` 標頭或同等 meta），作為安全成熟度目標；**MAY** 先以 `Content-Security-Policy-Report-Only` 模式於導入期驗證，再切換為強制執行。
- 採用 CSP 時：
  - `default-src` **SHOULD** 以 `'self'` 為基準並明確列舉允許來源；**SHOULD NOT** 使用萬用 `*` 作為 script/style/connect 等敏感指令來源。
  - **SHOULD NOT** 使用 `'unsafe-eval'`；如需 inline script **SHOULD** 改用 nonce 或 hash 而非 `'unsafe-inline'`。
  - 允許來源（如 API domain、CDN）**MUST NOT** 寫死於程式碼，須可隨環境調整（見 §CP-3）。
- **SHOULD** 設定 `report-uri` / `report-to` 蒐集違規回報，並撰寫自動化檢查驗證 production 建置帶有預期的安全標頭。

### §FE-3 前端機密與設定

- 前端產物為**公開可讀**，**MUST NOT** 將任何機密（API key、access token、密碼、私鑰等）打包進前端 bundle 或經由 `VITE_*` 等建置變數注入。
- 需要機密的操作 **MUST** 由後端代理（backend-for-frontend / API proxy）執行，前端僅持有短期、範圍受限的使用者憑證。
- 僅**非機密**的環境設定（如 API base URL）**MAY** 透過建置期環境變數注入，且 **MUST NOT** 寫死（見 §CP-3）。

### §FE-4 元件與分層架構

- **MUST** 採元件化設計，並區分職責，各層不得混雜：
  - **展示元件（Presentational）**：負責 UI 呈現，**MUST NOT** 直接發出 API 請求或處理商務邏輯。
  - **容器 / 頁面元件（Container / View）**：負責組裝與互動編排。
  - **API / Service 層（composable 或 service 模組）**：負責對後端的資料存取，**MUST** 集中管理，**MUST NOT** 散落於各展示元件中。
  - **狀態層（Store）**：負責跨元件共用狀態。
- 路由 **SHOULD** 集中管理（統一的 router 設定，或框架內建之檔案式路由慣例）；需要授權的路由 **MUST** 設有 navigation guard（並理解前端守衛僅為 UX，真正授權 **MUST** 由後端把關）。

### §FE-5 前端安全（XSS 與輸出處理）

- **MUST NOT** 將未經淨化（sanitize）的不可信內容傳入 `v-html`；如必須渲染 HTML，**MUST** 先以白名單淨化（如 DOMPurify）。
- 所有外部輸入在呈現前 **MUST** 適當編碼 / 轉義，避免 XSS。
- 應用 **MUST NOT** 假設自己以非安全來源（非 HTTPS）運行；對外的 TLS / HTTPS 落點見 §DEP-7。
- **SHOULD** 防範 OWASP 前端相關風險（XSS、CSRF、clickjacking 等）。
- 存放於瀏覽器的使用者憑證 **SHOULD** 優先採用 `HttpOnly` cookie；若存於前端可讀儲存，**MUST** 評估並記錄 XSS 竊取風險。

### §FE-6 可用性與品質（Accessibility & Quality）

- **SHOULD** 遵循基本無障礙規範（語意化標籤、鍵盤可操作、適當對比與 ARIA 屬性）。
- **SHOULD** 設定靜態資源快取與程式碼分割（code splitting），控制首屏載入體積。

### §FE-7 測試

- 前端 **不**套用數字覆蓋率門檻。**MUST** 依 §CP-4 撰寫元件 / 單元測試（**SHOULD** 採用 Vitest + Vue Test Utils），以涵蓋主要功能邏輯、邊界與例外情境為驗收基準。
- 測試 **MUST** 涵蓋元件的正常渲染、互動行為、邊界與錯誤狀態；對 API 呼叫 **SHOULD** 以 mock 隔離。
- 核心邏輯之單元測試與 E2E 關鍵流程之案例設計方法依 §TR-7（輸入空間分割，強度與涵蓋範圍依分級適用）。
- 關鍵使用者流程 **SHOULD** 另以端對端（E2E）測試（如 Playwright / Cypress）驗證。
