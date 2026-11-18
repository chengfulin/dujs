# Contract：獨立可到達檢查器（FR-006、FR-007、FR-008、SC-005；M4 定案）

**Feature**: `008-property-defs-method-calls` | 模組：`tests/helpers/reachability.js`（測試輔助，不屬 lib）| 測試：`tests/dujs/reachability.js`、`tests/dujs/reachabilityinvariant.js` |
允許清單：`tests/dujs/cases/reachability-allowlist.json` | 理由見 [research.md](../research.md) R8；結構見 [data-model.md](../data-model.md) §4–§5。

## 1. 介面

```js
reachableNodes(model, options) -> Set<FlowNode>
//   options: {finallyRule: boolean (預設 true), level: 'intra-procedural'|'inter-procedural'|'intra-page'|'inter-page'（預設由 model.level／model.hierarchy 推得）}
normalReturns(model, options) -> Map<Scope, boolean>       // (a) 的最小不動點（intra-procedural 模型回傳空 Map）
violationsOf(model, options) -> Array<Violation>            // data-model §4
check(model, programId, modelName) -> {violations, eligible, witnesses}
//   全開與關掉 (c) 各跑一次；eligible＝全開違反且關掉 (c) 後兩端皆可達者
assertInvariant(results, allowlist) -> void                 // §5 的三種失敗情形拋 AssertionError，訊息列出每一項
modelsOfPages(codeOfPages) -> Array<{programId, modelName, model}>   // 以 tests/helpers/analyze.js 建模後列出四層全部模型
```

**獨立性（FR-007）**：模組 MUST NOT require `lib/dujs/reachingsolver`、`lib/dujs/summary`、`lib/dujs/defuseanalyzer`，MUST NOT 讀 `reachIns`、`reachOuts`、`analysisResultOf`、`setAnalysisResults` 的結果、`normalReturn`、`summaryOf`。
只讀：`model.graph`（`[entry, exit, nodes]`）、節點的 `type`、各連線欄位（`normal`、`true`、`false`、`exception`、`call`、`return`、`onEvent`、`saveStorage`、`loadStorage`、`finally`）、`prev`、`scope`、`astNode`、`line`、`col`、`segment`、`original`；
`model.callSiteRecords()`、`model.loopRecords()`、`model.dupairs`、`model.level`、`model.hierarchy`；scope 的 `ast`。守門測試以正規表示式掃描模組原始碼，出現上列禁止名稱即失敗。

## 2. 可到達規則（「表示法」的 (a)(b)(c)）

**起點（M4）**：

| 模型 | 起點 | 說明 |
|------|------|------|
| intra-procedural | `graph[0]`（該 scope 的 entry） | 呼叫不透明（沒有 records），只套用 (c) |
| inter-procedural | `graph[0]`（根 scope 的 entry） | 被呼叫端只經 call 邊進入 |
| intra-page | `graph[0]`（頁面 entry） | 事件處理器只經 LOOP 的 `onEvent` 邊進入 |
| inter-page | `graph[0]`（domain 節點） | 每頁 entry 經 domain 的 `loadStorage` 邊進入；檢查器另斷言每頁 entry 都可到達（否則拋錯，表示模型形狀與本契約不符） |

不另把事件處理器 entry 列為起點：處理器只有經可到達的 LOOP 進入才算可到達（與求解器的 LoopRecord 語意一致；處理器若沒有被註冊在可到達的 LOOP 上，其 pair 即為違反）。

**邊的可走性**（`u` 可到達時）：

| 邊 | 規則 |
|----|------|
| `normal`、`true`、`false`、`finally`、`onEvent`、`saveStorage`、`loadStorage`、`call` | 照常可走；**例外**：`u` 是 finallyExit 時，其 `normal` 出邊依 (c) |
| `exception`（`u.exception`） | 照常可走（**例外邊的辨識**：連線型別 `FlowNode.EXCEPTION_CONNECTION_TYPE`，即節點的 `exception` 欄位） |
| `return`，目標是某 CallSiteRecord 的 `callReturn` | **不走**；改由 (a) 的虛擬邊 |
| `return`，目標是 LOOP（LOOP RETURN → LOOP） | 照常可走 |
| 處理器 exit → LOOP RETURN（`normal`） | 照常可走（「表示法」(b)） |
| (a) 虛擬邊 `record.callNode → record.callReturn` | `callNode` 可到達且 `normalReturn(record.calleeScope)` 為是 |
| 虛擬例外邊 `record.callNode → record.exceptionalReturn`（非 null 時） | `callNode` 可到達即可走，**型別視為例外**（被呼叫端未捕捉的例外；D014）。`exceptionalReturn` 由 `lib/dujs/expansion.js:592-606` 的 `finishCallRecords` 依圖結構設定（鏈的第一個呼叫的段 0 呼叫節點的 `.exception` 目標），不是求解器的結果；求解器只在 `reachingsolver.js:292` 讀它。實測 1278 筆 record：1230 筆 `callNode.exception` 即 `exceptionalReturn`（與圖上的例外邊重合），39 筆呼叫節點本身沒有例外邊（鏈式呼叫的後段、決策前呼叫——這些才需要本虛擬邊），9 筆為 null |
| (b) 虛擬邊 `loopRecord.loop → loopRecord.loopReturn` | `loop` 可到達即可走（不論圖上有無對應的邊） |

**`exceptionalReturn` 的斷言（D014）**：檢查器對每個模型斷言「每個非 null 的 `record.exceptionalReturn` 都是圖上某節點的 `.exception` 目標」，不成立即拋錯（表示 records 與圖的關係改變，本契約須重審）。

**(a) 分呼叫點（D015）**：本契約的 (a) 比 spec「表示法」(a) 的字面嚴格——CALL RETURN 只經「同一 record 的 CALL 可到達 ∧ 被呼叫端有正常返回」的虛擬邊，不走圖上的 return 邊（不分呼叫點）。分呼叫點的可達集合是字面可達的子集，故檢查器通過即滿足 FR-006。

**與求解器的關係（獨立性的限度）**：本節的可走規則與求解器 `reached` 的計算（`reachingsolver.js:266-303`）幾乎同構；獨立性只靠重寫（不 require、不讀其結果）、自算 normalReturn 與 (c)。因此注入（§6）與陽性對照（P21、P23、P24）是證明檢查器確實會報錯的唯一防線，tasks 不得刪減。

**(a) normalReturn（最小不動點）**：對 records 中出現的每個 `calleeScope`，以 `record.entry`／`record.exit`（攤平圖中的副本）為該 scope 的 entry／exit；初值全為否；
每輪對每個 scope 從其 entry 以本節同一組規則做可到達，若 exit 有某前驅 `p` 可到達且 `p → exit` 的連線型別不是 `exception`，則為是；直到沒有改變。遞迴的被呼叫端因此從「沒有正常返回」開始（005 FR-003）。

**(c) finallyExit 的正常出邊**：
- 對應：finallyExit 節點 `F`（`type === 'finallyExit'`）屬於某 `TryStatement T`：在 `F.scope` 的擁有函式（沿 block scope 往上的第一個非 block scope）的 `ast` 中，找 `finalizer.loc.end.line === F.line` 且 `finalizer.loc.end.column - 1 === F.col` 的 `TryStatement`（不進入巢狀函式／class 本體）；找不到或多於一個時拋錯。
- 區域：`region(T)`＝擁有函式相同、且位置（下列）落在 `T.finalizer.range` 內的節點。節點位置：`astNode.range`；沒有 `astNode` 者依序取 `segment.source.astNode`、`original` 的位置；某 record 的 `callReturn` 取其 `callNode` 的位置；finallyExit 取其 `T.finalizer` 的結尾；entry／exit／LOOP／LOOP RETURN／domain／localStorage 節點沒有位置（不在任何區域）。
- 非例外進入：一條**可到達**的邊 `u → v`，`v ∈ region(T)`、`u ∉ region(T)`、`u` 與 `v` 擁有函式相同，且邊的型別不是 `exception`（含 (a) 虛擬邊以外的一切非例外型別；`finally` 邊——外層 finally 的待決跳躍——算非例外）。
- 規則：`finallyRule` 為真時，`F` 的 `normal` 出邊只有在 `T` 已有至少一條非例外進入時才可走；worklist 中先到 `F`、後到進入邊時，於記錄進入的當下補走 `F` 的 `normal` 出邊（單調）。`F` 的 `exception`、`finally` 出邊照常。
- `finallyRule` 為假（關掉 (c)）時 `F` 的 `normal` 出邊照常可走；(a) 的不動點也以同一設定重算。

**intra-procedural 模型**：沒有 records 與 LoopRecords，(a)(b) 不適用；只套用 (c)（呼叫敘述是一般節點，呼叫之後皆可到達，P14 intra(f)）。

## 3. 違反與差分（FR-006、FR-008）

- pair 的兩端：`DUPair.first`（定義節點）；`DUPair.second` 是節點（c-use）或 `Pair(決策節點, 分支目標)`（p-use，兩者都要可到達）。
- **違反**：全開（`finallyRule: true`）時任一端不可到達。
- **允許清單資格**：全開違反，且 `finallyRule: false` 時兩端皆可到達（finallyExit 根因）。
- **見證**：全開時可到達、但 `normal` 出邊被 (c) 停用（`T` 沒有可到達的非例外進入）、且關掉 (c) 後經該出邊可到達該 pair 的不可到達端的 finallyExit（以「只開放這一個 F 的 `normal` 出邊、其餘依全開規則」重跑一次判定）——輸出 `{scope: <F.scope 名稱>, line: <F.line>, nonExceptionalEntries: 0}`；有多個時全部列出（排序：scope 名、行）。
- 關掉 (c) 仍違反者不得列入允許清單：屬本 feature 範圍者修正，否則發 DECISION（FR-008）。

## 4. 允許清單（`tests/dujs/cases/reachability-allowlist.json`）

```json
[
  {
    "program": "probes008/p21-finally.js",
    "model": "inter-procedural[0] | intra-page | intra(<scope>) | inter-page",
    "pair": "x: L1 -> L11",
    "witness": [{"scope": "$DOMAIN.$PAGE_0", "line": 10, "nonExceptionalEntries": 0}],
    "note": "KI §38 形態 P21"
  }
]
```

- `program`：`probes008/<檔名>`、`probes008/pages/<檔名>`、`golden/<case>`（如 `golden/expected`）、`mdn/<id>`（`specs/006-eslint-scope/mdn/pages.json` 的 id）。`model`：`intra(<scope 名去掉 $DOMAIN.>)`、`inter-procedural[<i>]`、`intra-page[<頁>]`、`inter-page`。`pair`：`tests/helpers/analyze.js` 的 `pairsOfModel` 標記格式。
- 明列 (程式, 模型, pair)，不以規則放行（FR-007）。`witness` 必須與檢查器當次輸出逐字相同（validator 可重跑比對）。
- 同一份見證另寫入 KI §38（PRB）或 `golden-diff.md`／`mdn-diff.md`（golden、MDN 的項目），FR-008。

## 5. 測試失敗的情形（`assertInvariant`）

1. 有允許清單以外的違反（列出程式、模型、pair、不可到達端）；
2. 允許清單項不符差分判準（全開未違反，或關掉 (c) 仍違反）；
3. 允許清單項已不再違反（過期）——與 2 的「全開未違反」同一檢查，訊息標「過期」；
4. 允許清單項的 `witness` 與當次輸出不同。

## 6. 陽性對照與單元測試（`tests/dujs/reachability.js`）

- P21、P23、P24：全開時報出 `x: L1 -> L11`／`x: L11 -> L14`／`x: L1 -> L11`（inter-procedural 與 intra-page），關掉 (c) 後兩端皆可達，見證的 `nonExceptionalEntries` 為 0（US3 情境 5）。
- 注入（US3 情境 6）：取 P13 的 inter-procedural 模型 `m`，`Object.create(m)` 並以 `Object.defineProperty` 覆寫 `dupairs` 為原 Map 的複本加一筆 `DUPair(L9 節點, L9 節點)`（新的 Var `injected`）；`assertInvariant` 必須拋錯且訊息含 `injected`。另一例把同一 pair 加入允許清單時因關掉 (c) 仍違反而拋錯（判準 2）。
- 規則單元：(a) 無條件遞迴之後不可到達（P13、P14、P15）、條件遞迴可到達（P16、P17）；(a) 分呼叫點（D015）：P41 的 inter-procedural 與 intra-page 模型中，L10 的 CALL、CALL RETURN 與 L11 皆不在 `reachableNodes` 的結果中（直接斷言可達集合；或以注入 `Object.create(model)` 覆寫 `dupairs` 加入一筆以 L11 為使用端的 pair，`assertInvariant` 必須拋錯），並對照「照圖走 return 邊」時 L10 的 CALL RETURN 會可到達（說明本測試能區分兩種解讀）；
  D014：「呼叫節點無例外邊」的 record（鏈式呼叫的後段，如 `a().b()`；決策前呼叫，如 `if (f())`）在被呼叫端拋錯時，`exceptionalReturn`（catch 或 exit）經虛擬例外邊可到達；`exceptionalReturn` 斷言的反例（以包裝物件竄改 records）會拋錯；FR-013（D017）：P38、P39、P40 修正後全開無違反（修正前即 develop 行為，檢查器報 `f: entry -> L5>L6:T` 等為違反且關掉 (c) 仍違反）；(b) 沒有任何處理器邊的 LoopRecord 其 LOOP RETURN 可到達；(c) 只由例外進入的 finally 之後不可到達、正常進入時可到達、`return` 經 finally 時（`finally` 邊）可到達；巢狀 try–finally（內層 finallyExit 在外層區域內，不算外層的進入）；
  intra-procedural 模型中呼叫之後皆可到達；inter-page 每頁 entry 可到達；獨立性守門（§1）。
- 不變量（`tests/dujs/reachabilityinvariant.js`）：對 `tests/dujs/cases/probes008/`（含 `pages/`）、`tests/golden/fixtures`（頁面同 `tests/golden/golden.js`）、`specs/006-eslint-scope/mdn/corpus`（依 `pages.json`）的每個模型執行 `check`，以 `assertInvariant` 對照允許清單（US3 情境 4、SC-005）。
  MDN 語料（D016）：直接讀 006 的 corpus（先例 `tests/dujs/splitcallnodes.js:24`），缺檔或 `.js` 檔數 ≠ 33 時測試**失敗**（不得 `skip`／`pending`），並以 `crypto` 計算每檔 sha256、與 `specs/006-eslint-scope/mdn/README.md`「sha256（全碼）」區塊逐檔比對，不符即失敗（語料 33 檔、1218 行）。
