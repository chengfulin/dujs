# Contract：golden 驗證與差異紀錄（FR-013、SC-003）

**Feature**: `004-fix-remaining-issues` | 檔案：`tests/golden/golden.js`、`tests/golden/manifest.json`、`tests/golden/fixtures/fixes004/app.js`（新）、
`tests/golden/expected-fixes004/`（新）、`specs/004-fix-remaining-issues/golden-diff.md`（新）

## 1. Golden cases

| case | 頁面 | expected | 本 feature 預測 |
|------|------|----------|----------------|
| `Golden outputs (ES5 fixtures)` | `page0/app.js`；`page1/report.js` | `expected/` | 零差異 |
| `Golden outputs (ES2015+ module fixture)` | `es2015/app.js` | `expected-es2015/` | 零差異 |
| `Golden outputs (inter-procedural fixture)` | `interprocedural/app.js` | `expected-interprocedural/` | 零差異 |
| `Golden outputs (004 fixes fixture)`（新） | `fixes004/app.js` | `expected-fixes004/` | 各 story 有差異（§3） |

預測依據：research R1、R4、R6、R7、R9、R11 的「Golden 影響」。既有 case 出現任何差異時，先確認是否為某項修正的必然結果（記入 golden-diff 並更新
manifest），否則視為回歸修正程式。

## 2. 新 fixture 的基準

- Setup 在任何 `lib/` 變更前加入 fixture 與 golden case，以**修正前**程式執行 `UPDATE_GOLDEN=1 npm test` 產生 `expected-fixes004/`，並把全部 .dot 的
  sha256 寫入 `manifest.json` 的 `"expected-fixes004": {"baseline": {...}, "added": []}`（指令見 quickstart §1）。此 commit 是本 fixture 的「修正前」。
- golden.js 的斷言 #1–#5（003 contracts/golden-verification.md §2）對新 case 一體適用；#5（階層圖在扁平圖之前）需新 fixture 至少有一個上層模型——
  修正前已有（`new P(1)` 以外的 `log(...)` 呼叫會建 inter-procedural 模型）。

## 3. manifest 的更新規則（取代 003 §3「baseline 不得修改」於本 feature 的適用）

- 允許改變 `baseline` 的雜湊、增刪鍵，但**每一處**都必須在 `golden-diff.md` 有對應列（檔名、KI 節次、FR），且在同一個 commit 內更新。
- 新增的輸出檔（例如多了一個 inter-procedural 模型 `page0/inter-procedurals/3.*.dot`）加入該 case 的 `baseline`（帶雜湊），不放 `added`；
  刪除的檔同時自 `baseline` 移除。既有三個 case 的 `added`（003 的 hierarchy 檔）不動。
- `UPDATE_GOLDEN=1` 只重建 expected 目錄，仍不碰 manifest；manifest 以 quickstart 的指令重算後手動貼上差異的鍵。
- 測試期望（既有單元測試）的修改也列入 golden-diff 的「單元測試期望」表。

## 4. `golden-diff.md` 格式

```markdown
# Golden 差異紀錄（FR-013）

基準：`<Setup commit>`（新 fixture 以修正前程式產生）。dot 標記的行號＝fixture 行號＋1（CLI 在檔首加一行 `/// --- start ...`）。

## §20（US1，FR-001）

`expected/`、`expected-es2015/`、`expected-interprocedural/`：無差異。

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|
| fixes004 | `page0/intra-procedurals/0.dupairs.dot` | `c` 列 | `(2,3)` → `(2,(3,4))`、`(2,(3,6))`：`if (a + b >= c)` 的 `c` 改為 p-use | `ab12…` → `cd34…` | FR-001 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/usedexpressions.js` 約 273、279 行 | 決策條件的 read `'walk'` → `'p-use'` | FR-001 |
| `tests/dujs/usedexpressions.js` 約 139、145 行 | `findUSESet` characterization：`o`、`i` 由 c-use 改 p-use | FR-001 |
| `tests/dujs/es2015.js` 約 407 行 | `o?.a?.b ?? t` 的 `o: L4 -> L5` 改為 p-use | FR-001 |

## §21（US2，FR-002、FR-003）
...
```

- 節次依序：§20、§21、§7（含 FR-015、FR-016、FR-017）、§10、§11、§17、§12、§15、§14；每節開頭逐一列出四個 case，沒有差異者寫「無差異」。
  FR-016 對既有 `f()` 的影響記在 §7 節下的子表「FR-016（Fable A1）」，並註明 KI §16 後果段。
- 「內容」以節點標記描述（不寫 n-id）；只有 n-id 順移者寫「編號連帶」。
- 「單元測試期望」已知必改的既有測試（見 plan Constraints）：§20 節列 `usedexpressions.js` 約 139、145、273、279 行與 `es2015.js`
  約 407 行（範例表）；§10 節列 `tests/dujs/paramsandnew.js` 約 148 行（預設值箭頭函式改為 scope `f.$ANONYMOUS_FUN_0`，FR-006）；§7 節列
  `call cycle` 測試改斷言 `model cycle`（FR-015）。其餘既有測試的修改都須先查證並補列。
- §12（CLI）預期只有「無差異」與目錄名稱規則說明；§14 只有單元測試列。
