# Spec-Driven Development 憲章基線與導入指南

> 本 repo 為**實驗範例**：提供個人或團隊作為 **Spec-Driven Development（SDD）憲章**的參考基礎，規範「如何寫規格、如何讓實作（含 AI Agent 產出）與需求一致、如何測試、如何治理與部署」。
>
> 內容為參考基線而非標準答案：請依自身的專案型態、風險與成熟度 fork 後增刪調整，並以自己的憲章版本為準。
>
> **不要一次全採用。** 本指南定義**三階段循序導入**：先建立「需求 ↔ 實作對齊」的基礎，再導入測試與分級紀律，最後納入服務治理與部署。每個階段都明確區分「**必要（MUST 採用）**」與「**參考（先讀、暫不強制）**」。

> ## 📍 目前導入階段：**第一階段（對齊基礎）**
>
> 本 baseline repo 預設自**第一階段**起步——**僅核心原則 §CP-1～§CP-6 + 最小審查為必要條件**，其餘（TR、風險分級、API/FE/SH、SVC、DEP）均為參考、暫不作為合併條件。
> 各專案 fork / 採用本憲章時，**MUST** 在自己的專案 README 標示其「目前導入階段」（與「服務風險分級」，自第二階段起）；團隊達成各階段「進入條件」後再共同晉級。

---

## 一、為什麼要 SDD？（先讀這段）

我們的核心目標是：**讓產出（尤其 AI Agent 產生的程式碼）與需求一致、且可被驗證。**

達成此目標的最小條件有三：

1. **先有規格（spec）**：哪怕只是一段 issue / PR 描述，至少寫清楚「目的」與「驗收條件」。沒有規格，AI Agent 只能猜，產出自然會偏離。
2. **可追溯**：每個變更都能對應回某個需求來源；程式碼行為與 spec 一致。
3. **可驗證**：驗收條件能對應到自動化測試——這也是我們銜接 **TDD（Test-Driven Development）** 的接點：把「驗收條件」先寫成測試，再讓實作（或 AI Agent）去通過它。

> 一句話：**SDD 給 AI Agent 明確的「靶」，TDD 給它可量測的「中靶判定」。** 兩者結合，AI 產出才穩定可信。

---

## 二、文件地圖

憲章以**前綴式條款編號**組織（如 `§CP-2`、`§API-4`）。完整內容見 [`constitution.md`](constitution.md)。

| 前綴 | 範圍 | 文件 | 導入階段 |
|------|------|------|:------:|
| **CP** | 核心原則（不可妥協）| [`constitution.md`](constitution.md) | **階段一** |
| **GV** | 治理（審查、例外、合規閘門）| [`constitution.md`](constitution.md) | 階段一→三漸進 |
| **TR** | 分級適用之延伸要求 | [`constitution.md`](constitution.md) | **階段二** |
| 服務風險分級 | Critical / Standard / Internal / Experimental | [`constitution.md`](constitution.md) | **階段二** |
| **API** | API 服務應用面 | [`constitution-api.md`](constitution-api.md) | **階段二** |
| **FE** | 前端應用面 | [`constitution-frontend.md`](constitution-frontend.md) | **階段二** |
| **SH** | Shell Script 應用面 | [`constitution-shell.md`](constitution-shell.md) | **階段二** |
| **SVC** | 跨服務治理（契約 / 事件 / 追蹤 / 韌性 / 資料邊界 / 並行 / 生命週期）| [`constitution-microservice.md`](constitution-microservice.md) | **階段三** |
| **DEP** | 部署與基礎設施（容器 / Compose / 第三方 / DB / 儲存 / 代理）| [`constitution-deployment.md`](constitution-deployment.md) | **階段三** |
| 技術建議 | 框架 / 工具選型（非強制）| [`tech-standards.md`](tech-standards.md) | 全程參考 |

---

## 三、三階段導入總覽

| 階段 | 名稱 | 目標 | 必要（MUST 採用）| 參考（先讀、暫不強制）|
|:---:|------|------|------|------|
| **1** | 對齊基礎 | 學會 SDD；讓 AI 產出與需求一致 | **CP-1～CP-6** + 最小審查（GV）| TR、風險分級、API/FE/SH、SVC、DEP |
| **2** | 分級與應用紀律 | 導入 TDD；依風險與應用類型規範 | + 風險分級標示、**TR**、對應的 **API / FE / SH** | SVC、DEP |
| **3** | 治理與部署 | 完整商業專案準則 | + **SVC** + **DEP** + 完整 **GV** 閘門 | （全部納入）|

> 每個專案 README 應標示「**目前導入階段**」與「**服務風險分級**」（階段二起）。

---

## 第一階段：對齊基礎（Alignment Baseline）

**目標**：團隊理解 SDD 的基本運作，建立「需求 → 規格 → 實作 → 驗證」的最小迴圈，讓 AI Agent 的產出可被對照需求驗收。

### 必要（MUST 採用）— 核心原則 CP-1～CP-6
- **§CP-1 Spec 與實作可追溯**：任何變更先有規格（可輕量），且可追溯需求來源。
- **§CP-2 機密不得提交**：機密一律環境變數注入，不進版控、不入 log。
- **§CP-3 設定不得硬編碼**：URL / port / 旗標等外部化。
- **§CP-4 核心邏輯需有測試**：主要商業邏輯要有自動化測試（TDD 的起點）。
- **§CP-5 變更需經審查**：PR 審查後合併；AI 可協助審查，**最終合併由人核准**。
- **§CP-6 例外需可追蹤**：違反 MUST 的例外要記錄。

### SDD 基本流程（每個任務）
1. **寫 spec**：至少寫「目的 + 驗收條件」（一段 issue / PR 描述即可）。
2. **交付 AI Agent 實作**：把 spec 當作指令；要求產出對應 spec。
3. **驗證**：逐條對照驗收條件；核心邏輯補上測試（§CP-4）。
4. **審查合併**：人為確認 spec 與實作一致後合併（§CP-5）。

### TDD 起步（輕量）
- 先把**最關鍵的驗收條件**寫成測試，再讓實作 / AI 去通過——體驗「紅 → 綠」。
- 此階段不要求覆蓋率數字，只要求**核心邏輯有測試且通過**。

### 參考（暫不強制）
TR、風險分級、API/FE/SH、SVC、DEP 可先瀏覽，但**本階段不作為合併條件**。風險分級的標示在本階段為 **SHOULD**（建議先標，便於晉級），自第二階段起為 MUST。
- 測試案例設計建議即以 ISP（輸入空間分割）為優先；POC 只需涵蓋主要流程 / 展示情境，詳見 §TR-7。

### 進入第二階段的條件
- 團隊已習慣「無 spec 不動工」、PR 連結需求來源。
- 核心邏輯普遍有測試；機密與設定外部化已成預設習慣。

### 第一階段 PR 檢查清單
- [ ] 有可追溯的 spec / 需求來源（§CP-1）
- [ ] 無機密進版控（§CP-2）、設定未硬編碼（§CP-3）
- [ ] 核心邏輯有測試且通過（§CP-4）
- [ ] 經人為審查合併（§CP-5）；例外已記錄（§CP-6）

---

## 第二階段：分級與應用紀律（Tiering & Application Discipline）

**目標**：正式導入 TDD 與「依風險、依應用類型」的差異化規範，避免一體適用造成過重或不足。

### 新增必要（MUST 採用）
- **服務風險分級**：每個服務 / 專案在 README/spec 標示 **Critical / Standard / Internal / Experimental**（對照表見 [`constitution.md`](constitution.md)）。
- **§TR（分級適用要求）**：依分級套用完整 spec 欄位、**風險導向測試矩陣（§TR-2）**、相依安全、日誌、審計等。
- **對應的應用憲章**：
  - API 服務 → [`constitution-api.md`](constitution-api.md)（**API**）
  - 前端 → [`constitution-frontend.md`](constitution-frontend.md)（**FE**）
  - Shell → [`constitution-shell.md`](constitution-shell.md)（**SH**）

### TDD 整合（本階段重點）
- **由驗收條件推導測試**：spec 的每條驗收條件對應測試案例（Critical/Standard 為 MUST，見 §TR-1）。
- **風險導向**（§TR-2）：
  - Critical：unit + contract + integration + 失敗路徑 + 資料遷移測試
  - Standard：unit + contract + 關鍵 integration
  - Internal：核心 unit + smoke
  - Experimental：PR 描述驗收即可；具核心商業邏輯者仍依 §CP-4 補最小單元測試
- **案例設計**（§TR-7）：測試案例以輸入空間分割（ISP）為優先設計方法——核心邏輯單元測試 Critical / Standard MUST、Internal / Experimental SHOULD；由驗收條件推導之測試各級 SHOULD。涵蓋範圍依分級：Critical / Standard / Internal 為**完整範圍**，Experimental 為**主要流程範圍**（如 POC 只涵蓋展示情境）。預期結果以 spec 為據（Critical MUST，Standard / Internal SHOULD）。
- 覆蓋率僅作輔助參考（API 建議 statement ≥ 80% / branch ≥ 60%），**不得作為唯一品質門檻**。

### 參考（暫不強制）
SVC、DEP 可先讀，本階段不作為合併條件（除非該服務已是微服務 / 需容器化部署，則建議提前試行）。

### 進入第三階段的條件
- 各服務已標示風險分級並依 TR 執行；TDD（由驗收條件寫測試）成為常態。
- 應用層規範（API/FE/SH）落地，CI 已納入 test + lint + 機密掃描（Critical / Standard 另含相依套件安全掃描）。

### 第二階段 PR 檢查清單（疊加於第一階段）
- [ ] 已標示服務風險分級
- [ ] 變更範圍收斂：diff 僅含與 spec 相關之變更（§CP-1）；新功能 / 修改功能建議宣告影響範圍（§TR-8，Critical / Standard 為 SHOULD）
- [ ] 依 §TR-2 完成對應分級的測試組合
- [ ] 測試案例設計符合分級之強度與涵蓋範圍（§TR-7；分割表建議附於 spec 或測試檔）
- [ ] 符合對應應用憲章（API / FE / SH）
- [ ] CI 自動閘門：測試、lint、機密掃描通過（§GV-3）；Critical / Standard 另須相依套件安全掃描通過（§TR-3）

---

## 第三階段：治理與部署（Governance & Deployment）

**目標**：導入完整的商業專案準則——跨服務治理與部署 / 基礎設施，使系統可在真實環境穩定運行與演進。

### 新增必要（MUST 採用）
- **§SVC 跨服務治理**（[`constitution-microservice.md`](constitution-microservice.md)）：服務契約與相容性、事件 / 非同步、分散式追蹤、韌性、資料所有權、並行安全、服務 DoD 與生命週期。
- **§DEP 部署與基礎設施**（[`constitution-deployment.md`](constitution-deployment.md)）：容器化通則、**Docker Compose 為主要部署**（K8s 為低優先客戶選項）、第三方官方容器（版本鎖定）、DB 拓樸中立、檔案儲存（NFS/NAS）、反向代理。
- **完整 §GV 合規閘門**：自動閘門（test / lint / 機密掃描 / 相依掃描 / schema 破壞性變更 / 容器映像掃描 / 覆蓋率報告）+ 人工審查清單。

### 進入「完整導入」的條件
- 微服務具備契約測試與破壞性變更檢查；關鍵服務有追蹤與韌性機制。
- 服務皆可由 `docker-compose` 一鍵啟動；機密 / 設定 / 儲存連線全外部化。

### 第三階段 PR 檢查清單（疊加於前兩階段）
- [ ] 契約已版本化，CI 檢查破壞性變更（§SVC-2）
- [ ] 跨服務請求傳遞 trace context（§SVC-4）；關鍵服務具韌性（§SVC-5）；資料所有權清楚（§SVC-6）
- [ ] 並行安全：避免 race condition（§SVC-8）
- [ ] 容器化 + compose 可一鍵啟動（§DEP-2、§DEP-3）；第三方映像版本鎖定（§DEP-4）
- [ ] DB 連線 / 檔案儲存外部化（§DEP-5、§DEP-6）；反向代理責任分界清楚（§DEP-7）

---

## 四、角色與工具：AI Agent 怎麼用

- **AI Agent 是實作與審查的助手，不是決策者**：
  - 產出**MUST 對應 spec**（§CP-1）；無 spec 不交付實作。
  - **MAY 協助 PR 審查**（檢視合規、CI 結果），但**最終合併 MUST 由人核准**，**MUST NOT** 由 AI 自動合併（§CP-5、§GV-3）。
- **讓 AI 產出更準的做法**：spec 寫清楚「目的 + 驗收條件 + 邊界 / 錯誤情境」；先寫測試（TDD）讓 AI 有可量測的目標。

## 五、如何開始（Quick Start）

1. 全員讀本 README + [`constitution.md`](constitution.md) 的「核心原則 CP」與「規範用語（RFC 2119）」。
2. 在團隊（或個人專案）宣告**目前導入階段 = 第一階段**。
3. 新任務一律先寫輕量 spec（目的 + 驗收條件），再交付實作。
4. 套用第一階段 PR 檢查清單；穩定後依「進入條件」晉級下一階段。

## 六、維護

- 本憲章修訂依 §GV-1（SemVer）：MAJOR 移除 / 重新定義原則或重編識別碼；MINOR 新增 / 擴充；PATCH 文字釐清。
- 條款引用請用前綴式 ID（如 `§CP-2`、`§SVC-5`），勿用舊式章節號。

## 七、授權

本 repo 以 [MIT License](LICENSE) 釋出，歡迎自由使用、fork 與修改。
