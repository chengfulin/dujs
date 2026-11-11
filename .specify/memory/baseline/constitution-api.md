# SDD 憲章：API 服務延伸（API）

> 版本：5.6.0｜本文件為 [`constitution.md`](constitution.md) 之延伸，**須與核心原則（CP）、治理（GV）一併適用**。
> RFC 2119 用語定義見核心文件。條款前綴為 `§API-`。

> **邊界聲明**：本檔只規範 API 服務的**對外應用面**（HTTP REST / WebSocket 的設計與行為）。**跨服務治理**（內部 gRPC / MQ / 事件契約、相容性、追蹤、韌性、資料邊界）見 [`constitution-microservice.md`](constitution-microservice.md)（SVC）；**部署與基礎設施**（容器、Compose、TLS、反向代理、CORS 落點）見 [`constitution-deployment.md`](constitution-deployment.md)（DEP）。

> **分級適用**：本章規則以 **Critical / Standard** 為基準描述。Internal、Experimental 分級依核心「服務風險分級」與**附錄 B 矩陣**調整強制程度。核心原則（CP）不因分級豁免。

## API 服務憲章

本章在核心原則基礎上補充 API 服務專屬規範。

### §API-0 通訊模型與適用範圍（Communication Model）

- 本服務的**對外介面**——即提供給其他服務 / 用戶端串接者——以 **HTTP REST** 與 **WebSocket** 為主，是本服務的**主要對外契約**，§API-1 至 §API-11 適用之。
- 服務在處理自身商務邏輯時，**可能**需透過 **gRPC** 或 **訊息佇列（MQ）/ 事件** 與其他內部服務溝通；此類**內部通訊**之契約與治理見 §SVC-2（契約）、§SVC-3（事件）。
- 各條款**依通訊型態適用**：§API-3～§API-7 為共通條款，HTTP REST 與 WebSocket 皆適用（§API-3 僅限提供互動式文件時；§API-7 適用長駐服務）；HTTP REST 另適用 §API-1、§API-2、§API-8、§API-9、§API-10；WebSocket 另適用 §API-2、§API-11；內部 gRPC / MQ 不套用 REST / OpenAPI / CORS 等 HTTP 專屬條款，改依其對應 schema 契約（見 SVC）。

### §API-1 RESTful 設計（HTTP REST API）

- 提供 HTTP REST API 時 **MUST** 遵循 RESTful 設計：以資源為中心、正確使用 HTTP 動詞與狀態碼（`2xx`/`4xx`/`5xx` 語意正確）。
- 非 GET 的寫入操作 **SHOULD** 考量冪等性，PUT/DELETE **MUST** 為冪等。
- API **SHOULD** 提供版本管理機制（如路徑 `/v1/...` 或 header），避免破壞性變更影響既有用戶端（破壞性變更檢查見 §SVC-2）。

### §API-2 對外介面契約文件（External Interface Contract）

> 原則：**對外介面 MUST 有與實作一致的、機器可讀的契約文件**。本檔只涵蓋對外的 REST 與 WebSocket；內部 gRPC / MQ / 事件契約見 §SVC-2、§SVC-3。

- **HTTP REST API**：**MUST** 提供 **OpenAPI 3.1** 文件，描述每個端點的路徑、方法、參數、請求 / 回應 schema、錯誤回應與狀態碼。
- **WebSocket API**：**MUST** 文件化連線端點、子協定 / 訊息格式、各訊息 / 事件的 schema 與方向（見 §API-11）。
- 契約文件 **MUST** 與實際行為一致，介面變更時 **MUST** 同步更新；**SHOULD** 由程式碼 / 註解自動產生以降低脫節。
- 所有對外 / 對內契約之**相容性與破壞性變更政策**統一見 §SVC-2。

### §API-3 互動式 API 文件之暴露限制（Interactive Docs Exposure）

> 安全原則（取代「production 一律禁止」）。

- 提供互動式 API 文件（如 Swagger UI / Redoc）時，**MUST NOT** 在 production **匿名公開**暴露。
- 於 production 啟用時 **MUST** 具備存取控制：身份驗證 + 授權、網路限制（如內網 / VPN / API gateway）與審計，且 **MUST NOT** 洩漏未授權者其存在。
- 是否啟用 **MUST** 由環境變數（如 `APP_ENV`）或設定控制，**MUST NOT** 寫死為永遠公開。
- **MUST** 撰寫測試驗證暴露行為符合預期（如 production 匿名存取被拒、development 可存取）。

### §API-4 責任分離原則（Separation of Concerns）

> 原則式（取代強制 Controller→Service→Repository 形狀）。

- 服務 **MUST** 清楚分離以下責任，各責任**不得混雜**；具體形狀不限定：
  - **Transport / 接入層**：協定接入與橫切關注點（authn/authz、rate limiting、request logging）。
  - **Application / 編排層**：用例流程編排、輸入驗證與回應組裝，**MUST NOT** 直接耦合資料庫驅動。
  - **Domain / 商務邏輯層**：商務規則，**MUST NOT** 直接處理協定細節（HTTP / WS）或 DB driver。
  - **Infrastructure / 整合層**：資料存取與外部系統整合，對上層提供抽象介面。
- **MAY** 採用 DDD、Hexagonal / Ports-and-Adapters、Clean Architecture、CQRS、serverless handler 等任一能達成上述分離的架構。
- **MUST** 使用成熟、社群活躍的框架（避免自製不成熟核心框架）；具體選型 **SHOULD** 依 [`tech-standards.md`](tech-standards.md)（建議 NestJS / FastAPI；其中 Controller→Service→Repository 為一種建議實作）。
- 相依方向 **MUST** 由上而下，下層 **MUST NOT** 反向相依上層。

### §API-5 API 安全與驗證

- 認證 / 授權 **MUST** 於 Transport / 接入層（middleware / guard）集中處理（見 §API-4），並依 §CP-2 管理機密。
- 所有外部輸入（path、query、body、header）**MUST** 於進入商務邏輯前完成驗證（validation），不合法輸入 **MUST** 回應 `4xx`。
- 對外傳輸 **MUST** 經由安全通道；TLS 終結與 HTTPS 落點見 §DEP-7（應用不得假設自己直接對外）。
- **SHOULD** 防範 OWASP API Top 10 風險（注入、權限繞過、過量資料暴露等）。

### §API-6 統一錯誤回應

- API **MUST** 提供一致的錯誤回應格式（如含 `code`、`message`、選擇性的 `details`）。
- 錯誤回應 **MUST NOT** 洩漏堆疊追蹤（stack trace）、內部路徑或機密資訊（尤其 production）。

### §API-7 健康檢查（Health Endpoint）

- 服務 **SHOULD** 提供健康檢查端點（如 `/health`），且該端點 **MUST NOT** 洩漏機密或內部敏感資訊。
- 此處僅規範「應用提供端點」之行為；**readiness / liveness 探針之部署使用見 §DEP-2**。

### §API-8 列表端點與分頁（List Endpoints & Pagination）

- **可能回傳大量或不可預期筆數**資料的列表端點 **MUST** 支援分頁，**MUST NOT** 無上限回傳全部資料；資料量小且可控（如固定列舉、設定項）的端點 **MAY** 不分頁。
- 有分頁的端點 **SHOULD** 採用 cursor-based 分頁（適合大資料集）或 offset/limit 分頁，並在回應中包含分頁元資料（如 `total`、`nextCursor`、`hasMore`）。
- 有分頁的端點 **MUST** 設定單次請求最大回傳筆數上限（**SHOULD** 預設 ≤ 50、上限 ≤ 100），並於 OpenAPI 文件中說明。
- 預設排序 **MUST** 明確指定（不依賴資料庫自然順序），以確保分頁結果的一致性。

### §API-9 CORS 政策（Cross-Origin Resource Sharing）

> 僅適用於**瀏覽器可直接存取**的 HTTP API；純後端對後端（internal service / worker）不涉及 CORS，可不適用。CORS 由 app 或反向代理負責，責任歸屬見 §DEP-7。

- 瀏覽器可存取的 API 服務 **MUST** 明確設定 CORS 政策；**MUST NOT** 在 `production` 環境中使用 `*` 作為 `Access-Control-Allow-Origin`。
- 允許的 origin 清單 **MUST** 透過環境變數指定（如 `CORS_ALLOWED_ORIGINS`），**MUST NOT** 寫死。
- **SHOULD** 僅開放業務所需的 HTTP 方法與 header，遵循最小權限原則。

### §API-10 寫入冪等性（Write Idempotency）

- 對可能因網路重試而重複觸發的寫入操作（POST 建立、支付、觸發非同步工作等），**SHOULD** 支援冪等鍵（Idempotency Key，通常以 header `Idempotency-Key` 傳入）。
- PUT 與 DELETE 操作 **MUST** 設計為冪等（同 §API-1）。
- 對於長時間執行的操作，**SHOULD** 採用非同步模式（回應 `202 Accepted` 並提供狀態查詢端點），避免同步超時；若背後涉及 worker / 事件編排，其治理見 §SVC-3。

### §API-11 WebSocket API

> 適用於以 WebSocket 對外提供即時 / 雙向通訊的服務。

- 連線端點、子協定與**每種訊息 / 事件的 schema 及方向**（client→server / server→client）**MUST** 文件化（見 §API-2）。
- 連線**建立時** **MUST** 完成身份驗證與授權（如握手階段驗證 token），**MUST NOT** 接受未授權連線後才補驗證。
- **MUST** 驗證 `Origin`（瀏覽器來源）以防跨站 WebSocket 劫持（CSWSH）；允許來源 **MUST** 由設定 / 環境變數指定，**MUST NOT** 寫死。
- 所有進入的訊息 **MUST** 在處理前完成 schema 驗證；無效訊息 **MUST** 以明確錯誤回應或關閉連線。
- **SHOULD** 處理連線生命週期：心跳 / ping-pong、逾時、重連與背壓（backpressure）；訊息 schema 變更之相容性依 §SVC-2。
- 對外傳輸 **SHOULD** 使用 `wss://`（TLS 落點見 §DEP-7）。
