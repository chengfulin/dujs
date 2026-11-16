# SDD 憲章：跨服務治理延伸（SVC）

> 版本：5.6.0｜本文件為 [`constitution.md`](constitution.md) 之延伸，**須與核心原則（CP）、治理（GV）、[`constitution-api.md`](constitution-api.md)、以及 [`constitution-deployment.md`](constitution-deployment.md) 一併適用**。
> RFC 2119 用語定義見核心文件。條款前綴為 `§SVC-`。

> **邊界聲明**：本檔規範**跨服務治理**（契約、事件、追蹤、韌性、資料邊界、並行、服務生命週期）。各應用的對外行為見對應應用延伸（API / FE / SH）；**部署與基礎設施**（容器、Compose、第三方服務、DB 拓樸、檔案儲存、反向代理）見 [`constitution-deployment.md`](constitution-deployment.md)（DEP）。

> **分級適用**：本章規則以 **Critical / Standard** 為基準描述。Internal、Experimental 分級依核心「服務風險分級」與**附錄 B 矩陣**調整強制程度。核心原則（CP）不因分級豁免。

## 跨服務治理憲章

本章補充微服務 / 分散式後端服務之專屬規範，聚焦單一應用規範未涵蓋的分散式治理：契約相容性、事件、可觀測性、韌性、資料邊界、並行安全與服務生命週期。

### §SVC-1 通訊模型（Communication Model）

- **對外介面**（供其他服務 / 用戶端串接）以 **HTTP REST** 與 **WebSocket** 為主，依 §API-0 至 §API-11 治理。
- **內部服務間通訊**（服務處理自身商務邏輯時與其他服務溝通）**MAY** 採 **gRPC**（同步 RPC）或 **訊息佇列 / 事件**（非同步）：
  - 同步且強型別、低延遲需求 → **SHOULD** gRPC（契約見 §SVC-2）。
  - 鬆耦合、可非同步、需削峰填谷或廣播 → **SHOULD** 事件 / MQ（見 §SVC-3）。
- **MUST NOT** 讓內部通訊細節洩漏至對外契約；對外契約變更與內部實作 **MUST** 解耦。

### §SVC-2 服務契約與相容性（Contracts & Compatibility）

> 本節為**所有對外 / 對內介面契約**之相容性政策的權威來源；對外 REST / WebSocket 之文件格式見 §API-2，內部 gRPC / 事件契約於此規範。

- 每個介面 **MUST** 有**版本化、機器可讀的契約**：對外 REST→OpenAPI、WebSocket→訊息 schema（見 §API-2）；**內部 gRPC→`.proto`（protobuf）**、**事件→事件 schema**（見 §SVC-3）。
- 變更契約 **MUST** 遵循相容性原則：
  - **MUST NOT** 在不升版本的情況下做破壞性變更（移除 / 改名欄位、改變型別或語意、移除端點 / 事件 / RPC）。
  - 新增欄位 **SHOULD** 為可選（optional）以維持向後相容。
- CI **MUST**（Critical / Standard）執行**契約破壞性變更檢查**（OpenAPI / proto / 事件 schema diff），偵測到破壞性變更時阻擋合併或要求版本升級。
- 有下游消費者的服務 **SHOULD** 採**消費者驅動契約測試**（consumer-driven contract test，如 Pact），確保變更不破壞既有消費者。
- 棄用介面 **MUST** 有 deprecation 與 sunset 策略（見 §SVC-9）。

### §SVC-3 事件驅動與非同步通訊（Event-Driven & Async）

- 事件 **MUST** 有明確 schema 與**版本管理**；事件命名 **SHOULD** 一致（如 `domain.entity.action`，採過去式表已發生事實）。
- 消費者 **MUST** 設計為**冪等**（idempotent），以安全處理重複投遞（at-least-once 語意下的重送）。
- **MUST** 定義失敗處理：重試策略（含上限與退避）、**死信佇列（DLQ）**，**MUST NOT** 無限重試造成阻塞或風暴。
- 跨服務狀態變更與「先寫資料庫再發事件」之原子性 **SHOULD** 採 **outbox pattern**（或等效）避免雙寫不一致。
- 事件重放（replay）**MUST** 安全：重放不得造成重複副作用（呼應冪等與 §SVC-8）。

### §SVC-4 分散式追蹤與可觀測性（Distributed Tracing & Observability）

- 跨服務請求 **MUST** 傳遞**關聯 ID / trace context**（correlation id / trace id，**SHOULD** 採 W3C Trace Context / OpenTelemetry），並貫穿同步與非同步（事件 header）流程。
- 結構化日誌 **MUST**（Critical）/ **SHOULD**（Standard）包含標準欄位：trace id、service name、時間戳、log level；且 **MUST NOT** 記錄機密（§CP-2）。
- 服務 **SHOULD** 輸出關鍵 metrics（請求量、延遲、錯誤率、飽和度）；Critical 服務 **MUST** 定義並監控 **SLO**。
- 一般日誌與可觀測性基準見 §TR-4；本節為其分散式延伸。

### §SVC-5 韌性（Resilience）

- 對其他服務 / 外部依賴的呼叫 **MUST**（Critical）/ **SHOULD**（Standard）具備：
  - **逾時（timeout）**：**MUST NOT** 無限等待。
  - **重試 + 退避（retry with backoff，含 jitter）**：僅對可重試錯誤，且 **MUST** 有上限。
  - **斷路器（circuit breaker）**：避免對故障依賴持續打擊造成連鎖故障。
- **SHOULD** 視情境採 bulkhead 隔離、rate limiting、fallback / 降級回應。
- 重試與 fallback **MUST** 與冪等性（§SVC-3、§SVC-8）一致，避免重複副作用。

### §SVC-6 資料所有權與一致性（Data Ownership & Consistency）

- 每個服務 **MUST** 擁有並封裝自己的資料；其他服務 **MUST NOT** 直接讀寫該服務的資料庫，**MUST** 透過其 API / 事件存取。
- 跨服務交易 **MUST NOT** 依賴分散式 2PC；**SHOULD** 採 **saga / outbox / 最終一致性（eventual consistency）**，並明確定義補償（compensation）流程。
- 需要的跨服務資料 **SHOULD** 透過事件同步並保留來源服務為真實來源（source of truth）；快取 / 複本 **MUST** 標示為非權威並有更新策略。
- 資料儲存的部署拓樸（binary / 容器 / cluster / 託管）見 §DEP-5；無論拓樸為何，上述資料所有權皆適用。

### §SVC-7 容器化與部署（指向 DEP）

- 微服務之容器化、Compose 部署、health / readiness、graceful shutdown、設定注入、第三方服務 / 資料 / 檔案儲存等部署通則，**MUST** 遵循 [`constitution-deployment.md`](constitution-deployment.md)（§DEP-2 至 §DEP-7）。
- 微服務 **MUST** 可**獨立部署**：不與其他服務綁定於同一行程 / 映像，並作為整體 Compose 堆疊中的一個獨立服務單元。
- 微服務的可擴展性與並行安全另見 §SVC-8。

### §SVC-8 並行安全與可擴展性（Concurrency Safety & Scalability）

> 後端設計 MUST 保留可擴展性，並主動避免 race condition。

- 服務 **MUST** 為**水平擴展**而設計：**MUST NOT** 假設僅有單一實例執行；**MUST NOT** 將狀態存於行程內記憶體作為唯一真實來源（狀態 **SHOULD** 外置於 DB / cache / queue）。
- 對共享資源的並行存取 **MUST** 防範 race condition：
  - 對「讀取—修改—寫入」之關鍵區段 **MUST** 採適當機制（資料庫交易、樂觀鎖 / 版本欄位、悲觀鎖、或原子操作 / 分散式鎖），**MUST NOT** 依賴單一實例的記憶體鎖保證跨實例正確性。
  - 涉及金額 / 庫存 / 配額等**關鍵不變量（invariant）** 的更新（Critical）**MUST** 在資料層以條件更新 / 約束（如 `UPDATE ... WHERE version = ?`、唯一約束）保證一致。
- 可能重複觸發的寫入 / 訊息處理 **MUST** 冪等（呼應 §SVC-3、§API-10）。
- **SHOULD** 對昂貴或受限資源採限流 / 佇列；長工作 **SHOULD** 非同步化並可由任一實例接手。

### §SVC-9 服務 Definition of Done 與生命週期（Service DoD & Lifecycle）

- 新服務上線（Critical / Standard）**MUST** 具備：
  - 服務 **owner**（負責人 / 團隊）與 **README**；
  - 對外 / 對內**契約文件**（§SVC-2）；
  - **health / readiness** 與基本可觀測性（log / trace；Critical 含 metrics / SLO）；
  - **Dockerfile + docker-compose**（見 §DEP-2、§DEP-3）；
  - 設定 / 機密說明（所需環境變數清單）；
  - **rollback / 復原**策略。
- **SHOULD** 提供 runbook（常見故障與處置）；Critical 服務 **SHOULD** 納入服務目錄與依賴登錄。
- 介面 / 服務棄用 **MUST** 有 deprecation 通知與 sunset 時程，並通知已知消費者（§SVC-2）。
