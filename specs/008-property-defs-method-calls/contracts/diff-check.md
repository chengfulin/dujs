# Contract：golden／MDN 差異判定與損失／修正分類（FR-009、FR-010、SC-003、SC-004；D006、D011）

**Feature**: `008-property-defs-method-calls` | 工具：`specs/008-property-defs-method-calls/tools/diffcheck.js`（CLI）、`tools/classify.js`（分類純模組）；自我測試 `tools/diffcheck.test.js`、`tools/classify.test.js`（不屬 lib，不進 `npm test`）|
理由見 [research.md](../research.md) R9；格式先例：`specs/007-split-call-nodes/contracts/diff-check.md`。**005／006／007 的 diffcheck 不得修改**；008 工具以 `require` 使用其既有匯出，或複製後修改。工具首次 commit 後的任何修改先發 DECISION（D006）。

## 1. 比對

- **基準**：golden 為 `2035c93`（取自 git，寫在 `golden-diff.md` 檔頭「基準：`2035c93`」行）；MDN 為 `specs/008-property-defs-method-calls/mdn/baseline-develop/`（Setup 以 `2035c93` 的 lib 產生，作法同 007 contracts/diff-check.md §4，含 `*.matching.json`、`exitcodes.json`、`<id>.pairs.txt`），`mdn-diff.md` 檔頭同樣寫基準行。未給 `--base` 時讀檔頭。
- **沿用**（require）：005／006 的 `.dot` 解析、`locate`、`baseOf`、`exitCodesOf`；007 的 `duplicateCount`、`sourceFactsOf`、`outputFactsOf`（只 require，不改）。
- **不沿用**：007 §1 的標記改寫（基準與 008 的 CALL／CALL RETURN 標記形式相同）；007 的「intra-procedural 層級 pair 差異一律失敗」（FR-001／FR-002 本來就改 intra-procedural 模型，008 照一般分類）。
- **pair 比對（處理 007 T068 (d) 的限制）**：每個 `.dupairs.dot` 中，
  1. 對每一行號 `n`，若兩側同模型 `.graph.dot` 中標記以 `n` 開頭的節點（`n`、`n:T`、`call (n)`、`callReturn (n)` 及其 `_a`… 後綴）的**多重集合相同**，該行的 pair 以**保留後綴的完整標記**比對；
  2. 不同時（FR-004／外溢新增或移除呼叫點使段後綴位移），該行的 pair 以去後綴後的集合比對，並把（case、頁、模型檔、行、兩側段標記數）列入機器區塊「段結構改變行」表——`--verify` 核對列數與內容，使用者簽核時逐列確認；
  3. 重複列數照 007（data-model §6）另列，不設門檻（KI §43）。
- 差異單位：`pair`、`row`、`model`、`graph`、`matching`（同 007）。

## 2. 類別（SC-004）與機械觸發

每頁前置：以 espree＋eslint-scope 讀串接後原始碼（`classify.sourceFacts(source)`），並讀兩側 `.hierarchy.dot`、`*.matching.json`（呼叫點：行 → 被呼叫端集合）。

| 類別（子標） | 適用 | 觸發條件（必要條件） | FR |
|--------------|------|----------------------|----|
| `成員目標`（`修正`） | − pair | 定義行在基準側有該變數的「定義性成員目標」（§3.1），且 §3 判定為修正 | FR-001 |
| `屬性寫入→讀取損失` | − pair | 同上，§3 判定為損失 | D001、FR-009 |
| `成員目標`（`新增讀取`） | + pair | 使用行有物件變數為該變數的非豁免成員目標，或成員目標的物件運算式／計算鍵中讀到該變數（含沒有物件變數的成員目標，如 `localStorage.getItem(n).p = o` 讀 `localStorage`、`n`，D013）；新增的 `localStorage` 讀取帶出的新 inter-page pair 同歸此類 | FR-002 |
| `成員目標`（`不再殺除`） | + pair | 頁面上該變數有定義性成員目標，且該 pair 的定義行不是成員目標 | FR-001 |
| `外溢` | ± pair／row、model、graph、matching | 某行的被呼叫端集合兩側不同（007 `連結` 的判定），且該行呼叫的 callee 識別字（`f()`、`new A()`）或接收者（`o.m()`、`A.s()`）在基準側頁面上有定義性成員目標；pair 的 def 或 use 位於（任一側）被呼叫端的行範圍或該呼叫點之後（use 行 > 呼叫點行）；或 007 防護（同節點先定義的接收者）因成員目標不再定義而解除 | FR-001 外溢（P1、P9、P29–P32） |
| `放寬` | ± pair／row、model、graph、matching | 某行 008 側新增 `o.m()` 的被呼叫端、基準側沒有；該呼叫在函式中、`o` 的宣告為 `const`／`let` 且初值為 `new A(…)`；pair 位置條件同上 | FR-004 |
| `無法到達` | − pair | 無自動觸發；預期 0 筆（FR-013 的修正以原型實測 golden、MDN 皆 0 筆差異，D017）。若出現：FR-013 消失的 p-use pair 須以 `tests/helpers/reachability.js` 對基準側模型確認其決策節點不可到達（附檢查器輸出）；其他情形須有 `tests/dujs/reachabilityinvariant.js` 的違反紀錄並發 DECISION | FR-006、FR-013 |
| `§38`、`§43`… | ± pair | 同 007 的 KI 觸發；說明欄註明節次 | — |
| `共通` | graph、matching | 去除節點編號後相同；或頁面有新增／移除呼叫點而 `.graph.dot`／`*.matching.json` 結構改變（CALL／CALL RETURN 增減） | — |

- **位置條件的 probe 驗證**（plan 裁決，推論未實測）：「外溢」「放寬」的位置條件（use 行 > 呼叫點行、或位於被呼叫端行範圍）可能涵蓋不到間接呼叫——含該呼叫的函式 `g` 宣告在使用行**之後**、經 `g()` 間接執行時（如 `g` 宣告於 L20、內含 `o.m()`，L5 `g();`、L6 讀 `x`）。工具首次 commit 前以此形態的 probe（`tools/` 自我測試的 fixture）驗證；涵蓋不到時把條件放寬為「pair 的 def 或 use 位於被呼叫端行範圍、該呼叫點之後，或位於某個（遞移地）呼叫含該呼叫點之函式的呼叫點之後」，在首次 commit 前定案（不需 DECISION）。
- 一筆 pair 差異只能歸上列類別之一（多類成立時報告全部，紀錄選一且須成立）；歸不進即失敗（exit 1），須先在 `docs/known-issues.md` 記為新已知問題再以 KI 類記錄。
- `成員目標`、`屬性寫入→讀取損失`、`外溢`、`放寬`、KI 類的每頁 +／− 筆數記在「釘選與簽核」表，`--verify` 核對；`共通` 不釘選。
- golden-diff／mdn-diff 的「分類說明」段 MUST 寫明：`o.m()` 歸修正是**語法層**判定（方法 `m` 內讀 `this.p` 的流動，選項 B 也不追；不代表語意上沒有資料流）。

## 3. 損失／修正判準（`classify.classifyRemoved`，D006、D011）

輸入：頁面原始碼、變數名 `v`、定義行 `d`、使用行 `u`（p-use 取決策節點的行）、使用端所在 scope（可選）。

### 3.1 定義性成員目標（基準側會定義 `v` 的成員目標，R0）

行 `d` 上：`AssignmentExpression`（任何運算子，非解構）的 `left` 是 `MemberExpression` 且 `left.object` 是名為 `v` 的 Identifier；或解構樣式、`for…in`／`for…of` 左側中的這種 `MemberExpression` 目標。
每個目標給出**寫入路徑**：`[p]`（`v.p`）、`[*]`（`v[k]`，計算鍵＝萬用）。行 `d` 沒有這種目標 → 不適用本節（歸其他類別）。

### 3.2 使用行的讀取（每個名為 `v` 的 Identifier 讀取出現處）

| 出現形態 | 讀取路徑 | 結果 |
|----------|----------|------|
| 裸識別字作 callee 或 `new` 運算元（`v()`、`new v()`） | — | 修正（D011，P29–P32） |
| 方法呼叫 `v.m(…)`（`v` 是 callee 成員的物件） | `[m]` | 與寫入路徑比較（下） |
| 成員鏈 `v.a.b…` 的讀取（含 `delete v.p`、複合／邏輯賦值的目標、`v.p++`、p-use 條件） | 沿鏈的靜態屬性名，遇計算鍵為 `*` 後停止 | 與寫入路徑比較 |
| `=` 的成員目標 `v.a…z = …`（含 `for (v.p of …)` 左側、解構中的目標）：只為解參考而讀 | 去掉最後一段的路徑（`v.p = …` 為 `[]`） | `[]` → 修正；否則比較 |
| 其他位置（引數 `f(v)`、`var s = v`、`return v`、`if (v)`、`typeof v`、展開、`console.log(v)`） | 整個物件 | 損失 |

**路徑比較**：讀取路徑與任一寫入路徑**相同**、或**互為前綴**（非空）、或任一方含 `*` → 損失；否則修正。
**模糊情形預設歸損失**：行 `d` 或 `u` 上有兩個以上敘述（以 espree 的 Statement 節點起訖行判定，不計 Block、函式與 class 容器）；頁面上名為 `v` 的宣告不只一個（eslint-scope，R13 L4）；使用行找不到 `v` 的讀取出現處。
**彙總**：任一出現處、任一寫入路徑判為損失 → 損失（同一節點多個成員目標：任一寫入路徑符合即損失）；全部為修正 → 修正。p-use 與跨 scope（使用端位於被呼叫端）用同一判定。

### 3.3 正反例（`tools/classify.test.js` 至少包含）

| 程式 | pair | 結果 | 理由 |
|------|------|------|------|
| P1 | `o: L8 -> L9` | 修正 | `o.m()` 讀 `[m]`，寫 `[p]` |
| P25 | `o: L2 -> L3`、`o: L4 -> L5` | 損失 | 讀寫同路徑 `[p]` |
| P4 | `o: L3 -> L4` | 損失 | `o.p` 讀寫同路徑 |
| P2 | `o: L5 -> L6`、`o: L4 -> L5`、`o: L9 -> L10`、`o: L9 -> L11` | 損失 ×4 | 同路徑；計算鍵 `*`；`delete o.p`；整個物件 |
| P2 | `o: L7 -> L8`、`o: L8 -> L8` | 修正 ×2 | `for (o.p of a)` 左側只為解參考讀 `o`（`[]`） |
| P27 | `o: L7 -> L8` | 損失 | `console.log(o, x)` 整個物件 |
| P29、P30、P31、P32 | `f: L5 -> L6`、`f: L5 -> L8`、`A: L7 -> L8`、`f: L5 -> L7` | 修正 | 裸 callee／`new` 運算元（D011） |
| P37 | `o: L2 -> L5` | 損失 | `o.m = fn; o.m()` 同路徑（D011 同路徑優先） |
| P37 | `q: L6 -> L7` | 修正 | 寫 `[n]`、呼叫 `[m]` |
| 合成 | `o.p.q = 1;` → `x = o.p;` | 損失 | 前綴重疊 |
| 合成 | `o.p = 1; o.q = 2;` 一行 | 損失 | 同一行多個敘述 |

## 4. 紀錄檔

`golden-diff.md`、`mdn-diff.md`：機器區塊「淨差異（相對 develop）」「段結構改變行」「重複列數」「釘選與簽核」；另有「分類說明」、各階段敘述節、雜湊變化表、「單元測試期望」表（同 007 §3）。
允許清單項（FR-008）的見證：golden／MDN 有允許清單項時，在對應紀錄檔的「可到達性允許清單」節逐項列出（程式、模型、pair、見證），與 `tests/dujs/cases/reachability-allowlist.json` 相同。

## 5. 指令與結束碼

```sh
node specs/008-property-defs-method-calls/tools/diffcheck.js golden --report
node specs/008-property-defs-method-calls/tools/diffcheck.js golden --verify specs/008-property-defs-method-calls/golden-diff.md
node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --report
node specs/008-property-defs-method-calls/tools/diffcheck.js mdn --verify specs/008-property-defs-method-calls/mdn-diff.md
npx mocha specs/008-property-defs-method-calls/tools/classify.test.js specs/008-property-defs-method-calls/tools/diffcheck.test.js
```

結束碼同 007（0 通過；1 未記錄／不符／類別不成立／釘選、段結構改變行或重複列數不符／exit code 不同；2 無法取得基準）。
