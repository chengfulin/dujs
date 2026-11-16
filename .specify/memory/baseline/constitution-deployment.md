# SDD 憲章：部署與基礎設施延伸（DEP）

> 版本：5.6.0｜本文件為 [`constitution.md`](constitution.md) 之延伸，**須與核心原則（CP）、治理（GV）一併適用**。
> RFC 2119 用語定義見核心文件。條款前綴為 `§DEP-`。

> **邊界聲明**：本檔規範**部署與基礎設施**（橫切維度，適用所有自建可部署服務）。各應用的**應用面**見 API / FE / SH；**跨服務治理**見 [`constitution-microservice.md`](constitution-microservice.md)（SVC）。

> **分級適用**：本章規則以 **Critical / Standard** 為基準描述。Internal、Experimental 分級依核心「服務風險分級」與**附錄 B 矩陣**調整強制程度。核心原則（CP）不因分級豁免。

## 部署與基礎設施憲章

本章規範**跨應用類型的部署與基礎設施治理**：容器化通則、Compose 部署、第三方容器服務、資料儲存拓樸、檔案儲存與反向代理。適用於專案中**所有自行開發、需部署的服務**，以及其所依賴的基礎設施。

### §DEP-1 適用範圍（Scope）

- 本章適用於**所有自行開發、需部署的服務**：AP 前端、AP 後端 / 微服務、工具服務（Python / Shell 等），不論其應用類型。
- 同時涵蓋專案運行所依賴的**第三方容器服務、資料儲存、檔案儲存與反向代理 / 閘道**之整合與部署治理。
- 與各應用延伸並行載入，例如：容器化前端 = 核心 + FE + 本章；後端微服務 = 核心 + API + SVC + 本章；容器化工具服務 = 核心 + 本章（+ SH / API 視實作）。

### §DEP-2 容器化通則（Containerization）

- 自行開發、需部署的服務 **MUST** 容器化：提供 **Dockerfile**，產出可重現的 OCI 映像。
- 映像 **MUST** 以 **non-root** 使用者執行；**SHOULD** 採最小基底映像；容器映像安全掃描依附錄 B：Critical **MUST**、Standard **SHOULD** 通過。
- **長駐服務** **MUST** 提供 **health / readiness / liveness** 探針並支援 **graceful shutdown**（收到終止訊號後完成在途工作、釋放資源）；應用端點行為見 §API-7，本節規範其作為部署探針之使用。
- **一次性 / 批次工具** **MUST** 以明確 exit code 表示成敗（呼應 §SH-3）。
- 設定與機密 **MUST** 由環境變數注入（§CP-2、§CP-3），**MUST NOT** 烘焙進映像；啟動時 **SHOULD** 驗證必要設定存在。
- 映像 **MUST NOT** 包含機密、私鑰或開發用憑證。

### §DEP-3 Docker Compose 為主要部署（Compose-First）

- 部署 **以 Docker Compose 為主要實現目標**：**MUST** 提供可一鍵啟動「應用服務 + 其所需依賴」的 `docker-compose.yml`（或等效），供本機開發與基本部署。
- Compose 設定 **SHOULD** 涵蓋整體堆疊（前端、後端、工具服務及所需第三方服務），並以環境變數**參數化所有環境相依設定**（連線、port、來源、掛載路徑），**MUST NOT** 寫死（§CP-3）。
- **Kubernetes 為客戶端部署選項，優先度低**：**MAY** 另提供 K8s manifests / Helm chart，但 **MUST NOT** 將 K8s 設為服務可運行的前提；服務 **MUST** 能在純 Docker Compose 環境正常運作。

### §DEP-4 第三方 / 官方容器服務（Third-Party Services）

> 如 Redis、RabbitMQ、Nginx、Traefik、langflow 等官方提供之容器化服務。

- **SHOULD** 優先採用**官方 / 可信來源**之映像。
- 映像版本 **MUST** 以明確標籤或 digest **鎖定**，**MUST NOT** 使用 `:latest`，以確保部署可重現。
- **SHOULD** 將第三方映像納入漏洞掃描，並定期評估安全更新（呼應 §TR-3 相依安全精神）。
- 其設定與機密（密碼、連線字串）**MUST** 由環境變數 / 設定注入（§CP-2、§CP-3），**MUST NOT** 寫死或提交預設密碼進版控。
- 具狀態的第三方服務（如 Redis、RabbitMQ、訊息 / 快取）**MUST** 規劃持久化 volume 與資料保存 / 還原策略。

### §DEP-5 資料儲存部署拓樸（Data Store Topology）

> 如 Postgres、MongoDB、MSSQL、OpenSearch、Elasticsearch 等。

- 資料庫 / 搜尋引擎之部署形式（binary、容器、cluster、或客戶託管）**因專案需求而異**；服務 **MUST NOT** 假設特定部署拓樸。
- 連線資訊（host、port、認證、TLS）**MUST** 一律經設定 / 環境變數提供（§CP-3、§CP-2）；切換拓樸 **MUST NOT** 需要改動程式碼。
- 服務 **SHOULD** 容忍儲存的暫時不可用（連線重試 / 逾時，呼應 §SVC-5），並於啟動時驗證連線設定。
- 資料所有權依 §SVC-6：即使共用同一套（託管）DB，各服務 **MUST** 僅存取自身擁有的 schema / 資料，**MUST NOT** 跨服務直接讀寫他者資料。
- Schema 變更 **MUST** 以可重複、可回溯的 **migration** 管理；Critical 另需 migration 測試（見 §TR-2）。

### §DEP-6 檔案儲存（File Storage：NFS / NAS）

> NFS 可能由 host 主機本地建置；NAS 通常由客戶提供（含連線與權限）。

- 檔案儲存的路徑、掛載點與存取憑證 **MUST** 由設定 / 環境變數提供（§CP-2、§CP-3），**MUST NOT** 寫死；客戶提供之 NAS 連線 / 權限由部署環境注入。
- 服務 **MUST NOT** 假設本地檔案系統永遠可用；檔案存取 **SHOULD** 經抽象介面，以便在 host 本地 NFS 與客戶 NAS 間切換。
- **MUST** 處理儲存的不可用、權限不足與部分失敗，並以明確錯誤回報，**MUST NOT** 靜默吞錯。
- 多實例共享同一儲存時（呼應可擴展性 §SVC-8），對同一檔案 / 路徑的並行寫入 **MUST** 防範 race condition（如檔名唯一化、寫暫存檔再原子改名、或檔案鎖）。
- 含機密 / 個資之檔案存取 **SHOULD** 遵循最小權限，並依需要納入審計（§TR-5）。

### §DEP-7 反向代理 / 閘道（Reverse Proxy / Gateway：Nginx / Traefik）

- 對外流量 **SHOULD** 經反向代理 / 閘道，由其負責 **TLS 終結**、路由，以及（可選）邊緣限流與安全標頭。
- **安全標頭 / CORS 之責任歸屬 MUST 明確**（由應用或代理其一負責，避免重複或遺漏）；無論由何者負責，最終對外行為 **MUST** 符合 §API-9（CORS）與 §FE-2（安全標頭）。
- 應用服務 **MUST NOT** 假設自己直接對外暴露；解析 `X-Forwarded-For` / `X-Forwarded-Proto` 等轉送標頭時 **MUST** 僅信任來自可信代理的值，避免來源偽造。
- 代理設定（上游位址、對外域名、憑證路徑）**MUST** 外部化（§CP-3），**MUST NOT** 寫死。
