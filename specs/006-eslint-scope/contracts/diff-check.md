# Contract：FR-012 (2) 差異判定腳本、golden-diff.md／mdn-diff.md 與 MDN 基準快照

**Feature**: `006-eslint-scope` | 工具：`specs/006-eslint-scope/tools/diffcheck.js`（不屬 lib，不進 `npm test`，不納入 lint 抑制）| 驗收：US4-1、US4-7、SC-002、SC-003

## 1. 輸入

| 模式 | 基準側（develop） | 新側 | 原始碼（判準用） |
|------|------------------|------|------------------|
| `golden` | `git archive <base> tests/golden/expected*` 解到暫存目錄（`<base>` 預設為 Setup 記錄的基準 commit） | 工作樹 `tests/golden/expected*` | `tests/golden/golden.js` 的 case 定義（頁面＝檔案清單）與 `tests/golden/fixtures/` |
| `mdn` | `specs/006-eslint-scope/mdn/baseline-develop/<id>/`（§5） | 以本 branch CLI 對 `mdn/corpus/` 實跑到暫存目錄 | `mdn/corpus/` 與 `mdn/pages.json`（每個 id 的頁面＝檔案清單） |

- 頁面原始碼以 `lib/dujs/sourcereader.js` 的 `getSourceFromFiles(files)` 重建（CLI 實際分析的串接字串），dot 標籤的行號即此字串的行號。
- 「eslint-scope 結果」：以 research R1 的選項（含 `optimistic: true`）分析上述字串；腳本只讀 eslint-scope，不呼叫 dujs 的分析。

指令：

```sh
node specs/006-eslint-scope/tools/diffcheck.js golden [--base <commit>] --report   # 輸出差異表（markdown）到 stdout
node specs/006-eslint-scope/tools/diffcheck.js golden [--base <commit>] --verify specs/006-eslint-scope/golden-diff.md
node specs/006-eslint-scope/tools/diffcheck.js mdn --report
node specs/006-eslint-scope/tools/diffcheck.js mdn --verify specs/006-eslint-scope/mdn-diff.md
```

`--verify` 結束碼：0＝全部通過；1＝有差異未記錄、記錄與實際不符、類別判準不成立、釘選筆數不符（逐項列出）。

## 2. 差異單位（每頁、每個模型層級）

| 單位 | 計算 |
|------|------|
| `pair` | 解析 `*.dupairs.dot` 每列：列名＝變數名，每格 `(def,use)`；正規化成 `name: def -> use` 字串（`entry_a`→`entry`、`exit_b`→`exit`、`call_c`→`call`、`callReturn_d`→`callReturn`；行號不變；p-use `(d,(t,u))` 保留結構）。以 **multiset** 比對（基準側只有名稱＋行，spec FR-012 (2)）。intra-procedural 以檔案索引對齊（scope 清單不變，FR-009）；其他層級在模型數相同時以檔案索引對齊，不同時把該層級的所有檔案合併成一個 multiset |
| `row` | 同一檔案中各列名的列數（multiset of names）的增減 |
| `model` | 每頁每層級的 `*.dupairs.dot` 檔數增減 |
| `graph` | `*.graph.dot`、`*.hierarchy.dot` 的 sha256 變化（或增刪）；只允許在有「呼叫連結觸發」的頁面發生 |

## 3. 類別判準（每筆差異至少符合一類，否則失敗）

前置計算（每頁）：`vars(N)`＝eslint-scope 中名為 N 的 Variable 數（不含 `defs` 為空者）；`special(N)`＝有名為 N 的 Variable 宣告在 `function-expression-name`
或 `class` scope；`defaultLines`＝含參數預設值（params 中的 AssignmentPattern）的行；`unresolved(N)`＝頁面有名為 N 的未解析 Reference；`catches`＝每個
CatchClause 的（所在行、行範圍、參數綁定名）；`nonCatchDecl(N)`＝頁面有名為 N、宣告 scope 不是 `catch` 的 Variable（不含 `defs` 為空者）。

| 類別 | 判準 | FR |
|------|------|----|
| `解析` | pair／row：`vars(N) ≥ 2`，或 `special(N)`，或 pair 的 def 或 use 行 ∈ `defaultLines` | FR-002–FR-005 |
| `全域` | `unresolved(N)` 成立時，名稱 N 的**任何新增** pair 或 row（def 不限 `entry`：含 `++`／`--`、for-in／for-of 左側、解構、`G.p = v` 在該節點的定義；U4、Fable F4） | FR-006 |
| `catch` | (a) 移除的 pair，use 行為某 CatchClause 所在行且 N 不是該 catch 的參數名；(b) N 是某 catch 的參數名且 def、use 兩端都在該 catch 子句的行範圍內（增或減）；(c) 新增的 row，N 為 catch 參數名；(d) 移除的 pair，def 行為某 CatchClause 所在行且 N 不是該 catch 的參數名（U3）；(e) N 是某 catch 的參數名且 `nonCatchDecl(N)` 不成立時，N 的**移除**的 pair 與 row（Q2，Fable F2；例：probes/plan-catch1.js 的 `e: entry -> L4`、row `e`） | FR-003（D4） |
| `AnnexB` | 觸發：頁面有呼叫點（`f()`、`new f()` 的 callee 或 `addEventListener` 的 handler 識別字）其識別字未解析，且同頁有同名的 block 內函式宣告 | FR-007（D5） |
| `連結` | 觸發：頁面有呼叫點（`f()`、`new X()`、`o.m()`／`A.s()` 的物件、handler 識別字）其識別字解析到 catch／`function-expression-name`／`class` scope 的 Variable，或其名稱 N 有 `vars(N) ≥ 2`，或名稱同於某 catch 參數名（FR-013 列舉：link-n4、n8a、n9、n10 的形態） | FR-013 |

- `model`、`graph` 差異只能歸 `AnnexB`／`連結`，且該頁觸發成立。
- 觸發成立的頁面上，**無法歸入前三類**的 pair／row 差異為「衍生差異」：必須逐筆出現在簽核表（§4），且每頁的衍生筆數等於釘選數，否則失敗。
- **解析類的移除 pair**（F3）：歸 `解析` 的 `-` pair 另計小計，每頁筆數須等於「解析類移除簽核」表（§4）的釘選數，且每列「說明」必填（指出是哪個宣告的
  解析修正），否則失敗。新增的解析類 pair 與 row 不需簽核。
- 一筆差異符合多類時，報告列出全部，紀錄中選一類即可（須為成立者之一）。

## 4. 紀錄檔格式（`golden-diff.md`、`mdn-diff.md`）

由 `--report` 產生表格骨架，人工補「說明」欄；`--verify` 只讀下列三個機器區塊，其他段落（各階段敘述、單元測試期望、驗收預期更正）為人工說明。

```markdown
## 淨差異（相對 develop，機器核對）

| # | case | 頁 | 檔案／層級 | 單位 | ± | 內容 | 類別 | FR | 說明 |
|---|------|----|------------|------|---|------|------|----|------|
| 1 | expected | page0 | intra-pages/0.dupairs.dot | pair | + | `JSON: entry -> 54` | 全域 | FR-006 | `parseSaved` 的 `JSON.parse` |
| 2 | expected-fixes004 | page0 | intra-procedurals/0.dupairs.dot | row | + | `Counter` | 解析 | FR-004 | class 內層綁定（無 pair） |

## 解析類移除簽核（F3：歸「解析」的移除 pair 的釘選筆數）

| case | 頁 | 移除筆數 | 原因摘要 | 簽核 |
|------|----|----------|----------|------|
| （範例）expected | page0 | 2 | catch-edge 型：`var e` 初值改歸 catch 參數 | 已逐筆檢查（#7、#8） |

## 呼叫連結簽核（衍生差異的釘選筆數）

| case | 頁 | 觸發（呼叫點：行、callee、解析變化） | 衍生 + | 衍生 − | 簽核 |
|------|----|----------------------------------------|---------|---------|------|
| （範例）s99 | page0 | L5 `f()`：block 函式 → 未解析 | 0 | 3 | 已逐筆檢查（#12–#14） |
```

- 「內容」與 §2 的正規化字串逐字相同（反引號內）；每筆實際差異恰對應一列，多列或少列皆失敗。
- 衍生差異列的「類別」寫 `連結`／`AnnexB`，「說明」必填且引用簽核表的觸發。
- 解析類移除列的「說明」必填；「解析類移除簽核」表每頁一列，「移除筆數」與實際不符即失敗，沒有解析類移除的頁面不列。
- golden-diff.md 另依 004 慣例保留各階段（Foundational、US1、US3、US4）的敘述節、雜湊變化表（舊→新 sha256 前 12 碼）與「單元測試期望」表；
  「淨差異」表在每個改 golden 的階段結束時重新產生並 `--verify`。

## 5. MDN `develop` 基準快照（Setup，任何 lib 變更前）

1. **主要來源（F8）**：自 validation-004 的工作目錄
   `/private/tmp/claude-501/-Users-chengfulin-Documents-Personal-dujs/cbaaf31a-c3b2-4a55-9ff4-356dc509edf6/scratchpad/mdncheck/ex/` 複製 33 個 `.js`
   （32 個 id，s09 兩檔）到 `mdn/corpus/`，以 sha256 前 16 碼逐行核對 `docs/research/mdn-baseline/validation-004.md` 附錄 A（33 行）。plan 修訂時（2026-11-17）
   已核對該目錄 33 檔全部相符。
2. **備援（目錄已被清除或有不符者）**：在 repo 外的工作目錄 clone `mdn/content` 與 `mdn/learning-area`，checkout 到 `docs/research/mdn-baseline/README.md`
   釘選的 commit 並核對 HEAD；依 validation-004 §2 各範例的「來源」以 `docs/research/mdn-baseline/tools/extract-sample.js`（live sample）或直接複製
   （learning-area 檔案）抽取，a02b、a06、x01 依 §2 描述人工組合。每個檔案的 sha256 前 16 碼須等於附錄 A；不相等者不得使用，記入 `mdn/README.md` 並交使用者
   裁決（以新雜湊取代或剔除）。
3. 檔名維持附錄 A 的檔名（`specs/006-eslint-scope/mdn/corpus/<檔名>.js`）；`mdn/pages.json` 記錄每個 id 的頁面（s09 為兩頁 `-js s09-first.js -js s09-second.js`，其他為單頁單檔）；
   `mdn/README.md` 記錄來源 commit、授權（CC0）與 sha256 全碼。
4. 以 develop 的 lib（本 branch 在 Setup 時與 develop 相同；或 `git worktree add <tmp> develop`）對每個 id 執行 CLI，只保存 `.dot` 檔到
   `mdn/baseline-develop/<id>/`（不存 `.png`、`report.html`），並以 `docs/research/mdn-baseline/tools/run-pairs.js` 輸出 `mdn/baseline-develop/<id>.pairs.txt` 供人工閱讀。
5. 以 `tools/perf.js` 量 develop 的分析時間（research R15），寫入 `perf.md`。
6. 同一個 commit 提交 corpus、快照與 perf 基準；此 commit 為 MDN 的「修正前」。
