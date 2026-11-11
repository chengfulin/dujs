# SDD 憲章：Shell Script 延伸（SH）

> 版本：5.6.0｜本文件為 [`constitution.md`](constitution.md) 之延伸，**須與核心原則（CP）、治理（GV）一併適用**。
> RFC 2119 用語定義見核心文件。條款前綴為 `§SH-`。

> **邊界聲明**：本檔只規範 Shell Script 的**應用面**（健全性、安全、可用性、測試）。若以容器化工具服務形式部署，部署與基礎設施見 [`constitution-deployment.md`](constitution-deployment.md)（DEP）。

> **分級適用**：本章規則以 **Critical / Standard** 為基準描述。Internal、Experimental 分級依核心「服務風險分級」與**附錄 B 矩陣**調整。核心原則（CP，含不得寫死、不得提交機密）不因分級豁免。

## Shell Script 憲章

本章在核心原則基礎上補充 Shell Script 專屬規範。

### §SH-1 設定不得寫死

- Script 存取服務或查詢 API 時，base URL、domain、host、port、端點路徑等 **MUST** 透過**參數**或**環境變數**指定，**MUST NOT** 寫死於 script 中。
- 機密資訊一律依 §CP-2 處理，**MUST** 由環境變數注入，**MUST NOT** 以參數明文傳入後留存於指令歷史或行程清單中（如必要，**SHOULD** 改由環境變數或檔案讀取）。

### §SH-2 健全性與安全（Robustness & Safety）

- Script **MUST** 啟用嚴格模式：`set -euo pipefail`（或對應 shell 的等效設定）。
- 所有變數引用 **MUST** 加上雙引號（如 `"$VAR"`），避免字詞切割與萬用字元展開問題。
- **MUST** 驗證必要參數 / 環境變數是否提供，缺漏時 **MUST** 輸出明確用法（usage）說明並以非零碼退出。
- **MUST NOT** 在 script 中以可被注入的方式拼接外部輸入（避免 command injection）。

### §SH-3 可用性

- Script **SHOULD** 提供 `-h` / `--help` 說明參數與環境變數需求。
- Script **MUST** 以有意義的退出碼（exit code）表示成功（0）或失敗（非 0）。
- 錯誤訊息 **SHOULD** 輸出至 `stderr`，正常結果輸出至 `stdout`。

### §SH-4 測試

- Shell Script **不**套用數字覆蓋率門檻。
- 含邏輯判斷的 Script **MUST** 撰寫測試（如以 bats 或等效工具），涵蓋**主要功能邏輯、邊界與例外情境**，且測試案例 **MUST** 通過。
- 核心邏輯之測試案例設計方法依 §TR-7（輸入空間分割，強度與涵蓋範圍依分級適用）。
- 純粹一次性、無分支邏輯的簡單 script **MAY** 豁免測試，但 **MUST** 在 spec / PR 說明理由。
