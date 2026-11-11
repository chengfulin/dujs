<!--
Sync Impact Report
Version change: [none] → 1.0.0 (initial ratification)
Source baseline: chengfulin/sdd-baseline@4a4b2be (v5.6.0, 導入階段 1)
Loaded docs: constitution.md（工具服務；dujs 為不以服務形式部署的函式庫＋CLI，
  依載入文件表不載入 DEP；SH／API 不適用）
Modified principles: n/a（首次制定）
Added sections: 核心原則 §CP-1～6、最小審查（§GV）、【參考】分級適用之延伸要求（§TR、風險分級）、治理
Removed sections: none
Templates: plan/spec/tasks templates 於執行時讀取本憲章，未修改
Follow-up TODOs: none
-->
# dujs 憲章

> 上游基線：團隊 SDD 憲章 v5.6.0（導入階段 1：對齊基礎）
> 應用類型：工具服務（Node.js 函式庫＋`dujs` CLI，不以服務形式部署）；服務風險分級：階段一暫不分級
>
> 本文件為本專案最高層級規範。所有 spec、plan、task 與實作皆須遵循本憲章；下層文件與本憲章
> 衝突時，以本憲章為準。第一階段僅 **§CP-1～§CP-6 + 最小審查（§GV）** 為合併條件，
> 標示【參考】的章節本階段暫不作為合併條件。

## Core Principles

本節六項為不可妥協的共同底線（MUST），不適用「低分級豁免」。

規範用語依 RFC 2119：**MUST／必須** 為絕對要求，違反即不得合併；**MUST NOT／禁止** 為絕對禁止；
**SHOULD／應** 為強烈建議，不遵循時必須在 spec 或 PR 說明理由；**MAY／可** 為選擇性。

### §CP-1 Spec 與實作可追溯

- 任何功能、修改或修復 **MUST** 可追溯至 spec 或需求來源（issue／需求單／`docs/known-issues.md`
  等）。**MUST NOT** 出現無來源的變更。
- Spec **MAY** 採輕量形式（如 issue 或 PR 描述），但 **MUST** 至少說明目的與驗收條件。
- 程式碼行為 **MUST** 與 spec 一致。實作過程發現 spec 有誤或不足，**MUST** 先更新 spec 再改程式碼，
  不得讓 spec 過時。

### §CP-2 機密不得提交

- 任何機密（token、API key、帳號、密碼、連線字串、憑證、金鑰等）**MUST NOT** 寫死於程式碼、設定檔或
  script，亦 **MUST NOT** 進入版本控制。
- 機密 **MUST** 透過環境變數讀取，由執行環境注入；`.env` 等含機密檔案 **MUST** 列入 `.gitignore`。
- 機密 **MUST NOT** 出現在 log、錯誤訊息或測試輸出中；輸出前 **MUST** 遮罩。
- **SHOULD** 提供 `.env.example` 列出所需環境變數名稱與用途（不含真實值）；不需任何機密時免。

### §CP-3 設定不得硬編碼

- 所有會因環境而異的設定（路徑、URL、port、逾時、功能旗標等）**MUST** 透過環境變數或設定參數
  （含 CLI 參數）提供，**MUST NOT** 寫死。
- **MUST** 明確定義環境別（如 `NODE_ENV`），至少含 `development` 與 `production`。
- 預設值僅可用於非機密、非環境敏感項目。

### §CP-4 核心邏輯需有測試

- 核心邏輯（dujs 的 CFG 建構、def-use 分析、各層資料流模型）**MUST** 有自動化測試，涵蓋正常路徑與
  主要錯誤情境。
- 測試 **MUST** 可獨立、可重複執行（`npm test`），不依賴外部服務狀態；外部依賴 **SHOULD** 以
  mock／stub 隔離。

### §CP-5 變更需經審查

- 所有變更 **MUST** 透過版本控制管理，並經 Pull Request 審查後合併。
- PR 審查 **MAY** 由 AI agent 執行，但最終合併 **MUST** 由人為核准，**MUST NOT** 由 AI agent 自動合併。
- PR **MUST** 連結對應的 spec 或需求來源。
- Commit 訊息 **SHOULD** 說明「為什麼」而非僅「做了什麼」。

### §CP-6 例外需可追蹤

- 任何對 **MUST／MUST NOT** 的例外 **MUST** 可追蹤、有記錄（低風險例外可用一行輕量模板：
  「例外項目 + 理由 + 預計補齊時機」）。
- 未經記錄之例外一律視為違規，不得合併。

## 最小審查（§GV，第一階段必要）

- 審查者（人為或 AI agent）**MUST** 逐項確認下列第一階段 PR 檢查清單後方可批准；最終合併 **MUST**
  由人為核准：
  - 有可追溯的 spec／需求來源（§CP-1），且 spec 與實作一致；
  - 無機密進版控（§CP-2）、設定未硬編碼（§CP-3）；
  - 核心邏輯有測試且通過（§CP-4）；
  - 經人為審查合併（§CP-5）；例外已記錄（§CP-6）。
- 【參考】下列人工審查項本階段 **SHOULD** 檢視，不作為合併條件：變更範圍是否收斂、無夾帶無關修改
  （scope creep）；架構責任分離與分層是否合理；測試案例設計是否附分割表、預期結果是否以 spec 為據。

## 【參考】分級適用之延伸要求（§TR 與服務風險分級）

> 本節整節為【參考】，**本階段暫不作為合併條件**；晉級第二階段時升為 MUST（依當時分級）。

- **服務風險分級**：Critical／Standard／Internal／Experimental，依「資料敏感度 × 故障影響範圍 ×
  對外承諾」評估。第一階段標示為 SHOULD；未標示預設以 Standard 處理。
- **§TR-1 完整 Spec 與驗收測試**：完整 spec 描述目的、輸入、輸出、行為、邊界條件、錯誤情境、
  驗收條件；Critical／Standard 每個驗收條件對應至少一個自動化測試。
- **§TR-2 測試廣度與覆蓋率**：風險導向測試組合（Standard：unit + contract + 關鍵 integration；
  Internal：核心 unit + smoke）；覆蓋率僅為輔助指標，**MUST NOT** 作為唯一品質門檻。
- **§TR-3 相依套件安全**：lock file 固定版本納入版控；依分級執行 `npm audit` 等掃描；
  **MUST NOT** 將 devDependencies 打包進 production 產物。
- **§TR-4 日誌與可觀測性**：依分級採結構化日誌；日誌 **MUST NOT** 記錄機密（屬 §CP-2，一律適用）。
- **§TR-5 審計日誌**：限涉及敏感資料的後端服務，dujs 不適用。
- **§TR-6 CI 合併閘門**：自動閘門（測試、lint、機密掃描、相依掃描）依分級套用；
  可追溯、無機密、經審查為所有分級最低必要閘門。
- **§TR-7 測試案例設計（ISP）**：以輸入空間分割設計案例——識別特徵、分割互斥區塊（有效／無效／邊界）、
  完整範圍以 Each Choice 為下限；預期結果以 spec 為據而非現有實作；僅鎖定現狀行為的斷言
  **SHOULD** 標註為 characterization test。
- **§TR-8 變更影響範圍宣告**：規劃時先宣告受影響模組、主要檔案區域與明確不受影響的範圍；
  超出宣告範圍的修改先更新宣告／spec，或依 §CP-6 記為例外。

## Governance

- **§GV-1 修訂**：本憲章之修訂 **MUST** 透過 PR 進行，並記錄變更理由與版本；版本採 SemVer
  （MAJOR：移除／重新定義原則或重編識別碼；MINOR：新增或實質擴充；PATCH：文字釐清）。
- **§GV-2 例外處理**：對 MUST／MUST NOT 的例外 **MUST** 記錄理由、影響範圍與後續處理；低風險例外
  **MAY** 採輕量模板，仍須可追蹤（§CP-6）。
- **§GV-3 合規檢查**：合併前執行自動閘門中可機器驗證者（本專案：`npm test`、`npm run lint`），
  並依「最小審查」清單人工確認；核心原則相關之最低必要閘門（可追溯、無機密、經審查）一律強制。
- 上游基線本地副本位於 `.specify/memory/baseline/`（含 `manifest.json` 版本資訊與 `tech-standards.md`
  技術建議，後者非強制）；晉級導入階段時依該副本重新組裝本憲章並升版。

**Version**: 1.0.0 | **Ratified**: 2026-11-11 | **Last Amended**: 2026-11-11
