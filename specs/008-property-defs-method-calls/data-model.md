# Data Model：feature 008

**Feature**: `008-property-defs-method-calls` | 理由見 [research.md](./research.md)；介面見 [contracts/](./contracts/)。本 feature 不新增 lib 的資料結構、節點型別或邊型別；以下為規則上的實體與測試／工具的資料形狀。

## 1. 成員目標與物件變數（R1、R2；spec「表示法」）

| 欄位 | 定義 |
|------|------|
| 成員目標 `T` | 賦值目標位置（`=`、複合、邏輯、`++`／`--`、解構元素、`for…in`／`for…of` 左側）的 `MemberExpression` |
| 物件變數 `objectVar(T)` | 自 `T` 沿 `.object` 鏈往左，到達的節點是 Identifier 時為它；遇到其他型別（Call、This、Super、Logical…）為「無」（D013：如 `localStorage.getItem(n).p` 無物件變數、不豁免，P42） |
| 豁免 `exempt(T)` | `objectVar(T)` 存在且 `binding.isLocalStorageObject(objectVar(T))`（D004、D008） |
| 讀取集合 `reads(T)` | 非豁免：`T.object` 子樹中被求值的識別字（物件變數、計算鍵、callee、引數）＋`T.computed` 時的 `T.property`；豁免：develop 的讀取（凍結表） |
| 定義集合 `defs(T)` | 非豁免：∅；豁免：develop 的定義（`T.object` 是 Identifier 時為其 Var） |

規則：
- 邏輯賦值的 F 分支（合成 `=`，`left` 與原邏輯賦值同一物件；`binding.isLogicalAssignmentTarget(left)`）：`reads` 不在 F 分支節點重複記（決策節點已以 p-use 讀取）。
- `++`／`--`、複合、邏輯賦值：讀取沿用 develop（讀整個目標），定義依上表（非豁免為 ∅，與 develop 的 `++` 相同）。
- 巢狀賦值 `T = (x = v)`：右側的定義是否記錄，依「develop 會定義左側」（R1 (d)；D012 維持 develop，通用缺口記 KI，spec FR-011 (g)）。

## 2. `o.m()` 放寬規則（R7，FR-004）

前提：呼叫 `o.m(…)`（callee 為非計算、非 optional 的 `MemberExpression`，`o` 為 Identifier），嚴格規則（`resolveVariable(o)`、`classOfInstance` 的到達定義）都沒有結果，且 `o` 在節點的 intra-procedural `reachIns` 中沒有定義。

| 條件 | 來源 |
|------|------|
| `isInFunction(node, scopeTree)` | 005 D2 同一函式 |
| `binding.isRelaxedInstance(Var(o))`（`let`／`const`） | D002 |
| `definitionsOnThePage(Var(o)).length === 1` | 005 D2 同一函式（GEN 計數，FR-001 後不含成員賦值） |
| 該定義的 range ↦ `new A(…)`，`A` 為 Identifier，`resolveVariable(def.fromNode, A)` 給 `classInfo` | 既有 `classOfInstance` 的嚴格分支同一判定（含 FR-018） |

結果：`classInfo.instanceMethods.get(m)`（不含 constructor），無則 `[]`。

## 3. `localStorage` 凍結表（D004；驗收基準 `probes/pages/baseline-develop.txt`）

見 spec「表示法」與 research R5 的對照表：每列對應到 develop 的程式路徑；s11–s14 依 D008 不豁免。

## 4. 可到達性（`tests/helpers/reachability.js`，contracts/reachability.md）

| 結構 | 欄位 |
|------|------|
| `ReachabilityOptions` | `finallyRule: boolean`、`level` |
| `Violation` | `{variable: string, pair: string（pairsOfModel 格式）, unreachable: ['def'|'use'|'decision'|'target'], nodes: [cfgId…]}` |
| `CheckResult` | `{programId, modelName, violations: Violation[]（全開）, eligible: string[]（pair，關掉 (c) 兩端可達者）, witnesses: Map<pair, Witness[]>}` |
| `Witness` | `{scope: string（scope 全名）, line: number（finallyExit 的行，即 finalizer 結尾）, nonExceptionalEntries: 0}` |
| `FinallyRegion`（內部） | `{finallyExit, tryStatement, owner（擁有函式 scope）, range（finalizer.range）, entered: boolean}` |

狀態：`FinallyRegion.entered` 由 false 單調轉 true（第一條可到達的非例外進入）；轉 true 時若 `finallyExit` 已可到達，補走其 `normal` 出邊。
normalReturn：`Map<Scope, boolean>`，初值全 false，迭代至不動點（只會 false → true）。
CALL RETURN 分呼叫點（D015）：只經同一 record 的 `callNode`（可到達）∧ `normalReturn(calleeScope)` 的虛擬邊；`exceptionalReturn`（非 null）視為從 `callNode` 出發的例外邊，且必須是圖上某節點的 `.exception` 目標（D014，否則拋錯）。

## 5. 允許清單項（`tests/dujs/cases/reachability-allowlist.json`）

`{program, model, pair, witness: Witness[], note}`；鍵＝(program, model, pair) 唯一。驗證：全開違反 ∧ 關掉 (c) 兩端可達 ∧ `witness` 與當次輸出逐字相同；否則測試失敗（含過期）。

## 6. 差異紀錄（`golden-diff.md`、`mdn-diff.md`；contracts/diff-check.md）

| 機器區塊 | 欄位 |
|----------|------|
| 淨差異（相對 develop） | case、頁、檔案／層級、單位、符號（+／−／~）、內容、類別（子標）、說明 |
| 段結構改變行 | case、頁、模型檔、行、基準段標記數、008 段標記數 |
| 重複列數 | 檔案、頁、基準、008 |
| 釘選與簽核 | case、頁、類別、+ 筆數、− 筆數、說明、簽核（「草擬，待簽核」→ 使用者簽核） |

分類函式（`tools/classify.js`）：`classifyRemoved({source, variable, defLine, useLine}) -> {category: '屬性寫入→讀取損失'|'成員目標', sub: '修正'|null, reason}`；
`writePathsAt(sourceFacts, variable, line) -> Array<Array<string>>`；`readsAt(sourceFacts, variable, line) -> Array<{kind: 'callee'|'method'|'member'|'deref'|'whole', path}>`；`statementCountAt(sourceFacts, line) -> number`。
