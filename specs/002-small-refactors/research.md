# Research: 三項小型重構

**Feature**: `002-small-refactors` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

Technical Context 無 NEEDS CLARIFICATION（技術選型沿用既有專案）。本文件記錄 spec 交由 plan 決定的事項，每項以
「Decision／Rationale／Alternatives considered」記錄。程式碼位置以本分支 `e02a8c9` 為準。

## 現況盤點

| 項目 | 現況 | 位置 |
|------|------|------|
| `branchsplitter.js` | 687 行；常數（`PLACEHOLDER_TYPE`、`REMOVED`、`LOGICAL_ASSIGNMENTS`、`NULLISH_OPERATORS`、`STRUCTURAL_TYPES`）＋17 個函式（行數見 R1） | `lib/esgraph/branchsplitter.js` |
| `split` 使用者 | 只有 `lib/esgraph/index.js:23,219`（LGPL）；`PLACEHOLDER_TYPE` 匯出但 lib／tests 無人使用 | — |
| `branchPath` 讀寫 | 寫：`branchsplitter.js` `create`、`modelbuilder.js:280,291`（call return／call 節點）；讀：`cfggraphconverter.js:39`、`tests/helpers/analyze.js:45,65`、tests 多處 | 見 data-model §3 |
| `splitOrigin` 讀寫 | 寫：`branchsplitter.js` `create`；讀：`branchsplitter.js` `isInsideLoopBody`、`cfgbuilder.js:30`、`defuseanalyzer.js:566`、`tests/dujs/branchsplit.property.js` | 同上 |
| `preEvaluated` 讀寫 | 寫：`branchsplitter.js` `expand`；讀：`flownode.js` `analyzedExpressions`、`defuseanalyzer.js:562`、`modelbuilder.js:380,383,385` | 同上 |
| `findUSESet` | 走訪 `analyzedExpressions`；以 `isPreEvaluated`、`currentRoot.type === 'Identifier'`、`SwitchCase`／`ForIn`／`ForOf` handler 實作節點種類規則 | `lib/dujs/defuseanalyzer.js:557-699` |
| 測試腳本 | `npm test` 以 glob 納入 `tests/dujs/*.js`，esgraph 則逐檔列出 `flownodetest.js`、`flownodefactory.js`、`test.js` | `package.json` |
| 基線 | 640 passing；lint 0 錯誤；抑制 119 筆 | — |

## R1. 三模組的函式分配與行數（US1、SC-003）

**Decision**：

| 現行函式（jsdoc 起算行數） | 歸屬 | 理由 |
|---------------------------|------|------|
| `PLACEHOLDER_TYPE`、`isPlaceholder`（4）、`isInert`（42） | decisionfinder | `findFirstDecision` 的 `operand` 以 `isInert` 判斷「已求值且需佔位」；再次搜尋改寫後的 AST 時須認得 placeholder |
| `LOGICAL_ASSIGNMENTS`、`STRUCTURAL_TYPES` | decisionfinder | 只有搜尋用 |
| `findFirstDecision`（168，含 `searchByType` switch 原樣，D2） | decisionfinder | — |
| `preEvaluatedOf`（10） | decisionfinder | 只讀 decision 的 `entries`；US1 情境 1 要求 decision finder 直接給出「條件前已求值的運算式」 |
| `placeholder`（11）、`REMOVED`、`NULLISH_OPERATORS`、`shallowCopy`（13） | astrewriter | 只有改寫會建立 placeholder／移除宣告子／複製節點 |
| `branchesOf`（35）、`staticChoice`（20） | astrewriter | 產生「替換成什麼」的 AST（含合成 `=` 指派與 placeholder），純 AST→AST |
| `rewrite`（60）、`branchRoot`（21） | astrewriter | — |
| `redirect`、`contextsOf`、`discriminantContexts`、`isInsideLoopBody`、`splitNode`、`reachableNodes`、`split` | branchsplitter | 讀寫 FlowNode 與邊 |

預估行數：decisionfinder ≈ 265、astrewriter ≈ 195、branchsplitter ≈ 280，皆 < 350（SC-003 成立）。

**Rationale**：依「誰需要它」最小歸屬，形成單向依賴 `branchsplitter → astrewriter → decisionfinder`，
astrewriter 只依賴 decision 的輸出形狀與 `isPlaceholder`（FR-003 允許）；兩者都不 require `flownode`／`flownodefactory`。

**Alternatives considered**：
- 另設 `asthelpers.js` 放所有共用 helper：多一個模組、而 helper 各自只有一個「自然擁有者」，不採用。
- `branchesOf`／`staticChoice` 放 decisionfinder（屬「決策語意」）：decisionfinder 會開始建立 placeholder 與合成
  AST，違反「只讀 AST」；且行數升到 ≈ 330，接近上限。不採用。

## R2. 對外介面與 LGPL 檔（FR-002、FR-011）

**Decision**：`branchsplitter.js` 匯出維持 `{split, PLACEHOLDER_TYPE}`（後者改為 re-export decisionfinder 的常數）；
`lib/esgraph/index.js` 不修改。新模組採與現行 `branchsplitter.js` 相同的 MIT 檔頭（「Original dujs code, MIT License…
contains no code derived from esgraph」），並補進 `THIRD_PARTY_NOTICES.md` §1 列出 original dujs code (MIT) 檔案的那一句
（`lib/esgraph/flownode.js`、`flownodefactory.js`、`branchsplitter.js` 所在句；US2 的 `branchlabel.js` 同樣補進）。US3 的
`lib/dujs/usedexpressions.js` 採同一 MIT 檔頭但不列入（該句未列任何 `lib/dujs` 檔，FR-011）。

**Rationale**：index.js 的 require 與呼叫都不變，FR-011 的 LGPL 修改紀錄不觸發；保留 `PLACEHOLDER_TYPE` 匯出使模組
介面完全不變。

**Alternatives considered**：讓 index.js 直接 require 新模組——須改 LGPL 檔且無益處，不採用。

## R3. 保持節點建立順序（FR-009、Edge Case 1）

**Decision**：函式本體以「整段搬移」為原則，只改跨模組呼叫的前綴（如 `decisionFinder.findFirstDecision`）。
`splitNode` 內 `create` 的呼叫時機與次序（`expand` 先建決策節點、再遞迴 T、再遞迴 F；`decide`／`finish*` 各一次）、
`split` 走訪 `reachableNodes` 的次序與 `created.concat` 次序一律不動。US2 將 `create(ast, path)` 擴為
`create(ast, path, preEvaluated)`，`preEvaluatedOf(decision)` 只是提前計算（純函式），不影響建立次序。

**Rationale**：dot 節點編號由建立後的排序編號決定（index.js 在 split 之後排序），任何 `create` 次序變化都會位移編號。

**驗證**：golden（含 `cfg`／`dupairs` 四層 dot 檔）逐位元組比對；`tests/dujs/branchsplit.js` 的節點數與路徑斷言。

**Alternatives considered**：無（spec 明定不得以更新 golden 放行）。

## R4. `FlowNode.split` 與 `labelPath` 的表示法（US2、FR-004）

**Decision**：
- `split`：`null` 或凍結物件 `{path: string, origin: AST, preEvaluated: ReadonlyArray<AST>}`。setter 接受 `null`／
  `undefined`（→ null）或「`path` 為字串、`origin` 為非 null 物件、`preEvaluated` 為陣列或省略（→ `[]`）」的物件，
  存入 `Object.freeze` 的淺複本（`preEvaluated` 另複製並凍結）；其他輸入忽略（與既有 setter 一致）。getter 回傳
  同一個凍結物件。
- `labelPath`：字串，預設 `''`；setter 只接受字串（同舊 `branchPath`）。是所有節點標籤路徑的唯一來源（analyze 閘門決定，
  spec Clarifications 2026-11-16）。寫入者：
  - `branchsplitter.js` 的 `create`：拆分節點一次設定 `split` 與 `labelPath = split.path`；不變量
    `split !== null ⇒ labelPath === split.path`。
  - `modelbuilder.js`（現行 :280-315）：call return 節點一律新建，`split` 為 null、`labelPath = callSite.labelPath`；callSite 是
    決策節點（`isCallBeforeDecision`）時新建的呼叫節點同樣 `split` 為 null、`labelPath = callSite.labelPath`；callSite 不是決策節點
    時 callSite 本身被改型為呼叫節點並沿用，保留原本的 `split` 與 `labelPath`（不寫入）。
- `analyzedExpressions`：`(split ? split.preEvaluated : []).concat([astNode])`，仍回傳新陣列。
- `toJSON` 不變（不含這些欄位）；jsdoc 新增 `@typedef SplitInfo`。

**Rationale**：「`split === null` ⇔ 非拆分產生的節點」語意單一（D3 保留 `isWithObject` 在外；被改型為呼叫節點的 callSite
原本即是拆分節點，保留 `split`）；標籤路徑只有 `labelPath` 一個讀取來源，標籤 helper 不需判斷 `split`；凍結取代舊 getter 的
防禦性複製，誤寫會在 strict mode 直接丟錯；拆分節點一次建好、之後不再修改（`expand` 在建立時即知 `preEvaluated`）。

**Alternatives considered**：
- 保留舊名為相容別名：spec Assumptions 明定不保留。
- `split` 每次 getter 回傳新複本：多餘配置，且凍結已防止外部修改。
- 把 `labelPath` 併入 `split`（呼叫節點帶 `split`）：D5 明定新建的呼叫節點不是拆分節點，不採用。
- `pathOf(node) = split ? split.path : labelPath`（原 Clarifications 規則，拆分節點的 `labelPath` 留空）：標籤路徑有兩個來源，
  helper 須知道 `split`；analyze 閘門改為一律讀 `labelPath`，以不變量與測試保證拆分節點兩處一致。

## R5. 分支標籤 helper（US2、FR-006、SC-004）

**Decision**：新模組 `lib/esgraph/branchlabel.js`（MIT，不依賴 FlowNode 模組，只讀節點的 `labelPath`），
提供：

| 函式 | 結果 | 取代 |
|------|------|------|
| `pathOf(node)` | `node.labelPath` | 所有 `node.branchPath` 讀取 |
| `pathSuffix(path)` | `path ? ':' + path : ''` | `cfggraphconverter.branchPathSuffix` |
| `lineLabel(line, path)` | `'L' + line + pathSuffix(path)` | `tests/helpers/analyze.js` `nodeLabel` 的拼接 |
| `extendPath(path, branch)` | `path + branch` | `expand` 的 `path + 'T'`／`path + 'F'` |
| `branchMark(branch)` | `':' + branch`（與 `pathSuffix` 共用同一個分隔符常數） | `useLabels` 的 `prefix + ':T'`／`':F'` |
| `TRUE_BRANCH`／`FALSE_BRANCH` | `'T'`／`'F'` | 字面值 |

`lineLabel` 以行號與路徑為輸入（D5），helper 不讀 `split`（標籤路徑一律取 `labelPath`）。`cfggraphconverter` 的 `L<line>:C<col>` 與
`callReturn (L…)` 是位置標籤，不屬分支標籤，只把後綴改為 `pathSuffix(pathOf(node))`。

**Rationale**：spec 指定「放 flownode.js 旁」；獨立模組讓 `tests/helpers/` 與 `lib/dujs` 都可 require 而不擴大
FlowNode 介面。

**Alternatives considered**：做成 FlowNode 的方法（`node.labelPath()` 等）——FlowNode 已 1057 行，且標籤格式是輸出層
關注，不採用。

## R6. `usedExpressionsOf` 的回傳形狀（US3、FR-007、SC-005）

**Decision**：新模組 `lib/dujs/usedexpressions.js` 匯出 `usedExpressionsOf(cfgNode)`，回傳
`Array<{expression: AST, read: 'c-use' | 'p-use' | 'walk'}>`，依 US3 節點種類表（spec 權威）：

1. 前綴：`split` 非 null 時，`split.preEvaluated` 每個運算式各一項 `read: 'c-use'`。
2. 接著依 astNode 判斷（第一個符合者）：
   - astNode 為 null → 不加項目（舊行為 `walkes(null)` 不產生 use，等價）。
   - `SwitchCase`：`test` 非 null、`cfgNode.parent` 為 `SwitchStatement` 且 `!cfgNode.discriminantSplit` →
     `{parent.discriminant, 'p-use'}`；否則不加（case 的 test 一律不讀）。
   - `ForInStatement`／`ForOfStatement`：依舊 `useLoopHead` 次序——左側為成員存取時 `{left.object, 'walk'}`；
     `bindingPattern.getEvaluatedExpressions(left)` 各一項 `'walk'`；`!loopRightSplit` 時 `{right, 'walk'}`。
   - `Identifier`：有 true 或 false 邊 → `'p-use'`；否則 `split` 非 null 或 `isWithObject` → `'c-use'`；否則不加（`a;`）。
   - 其他 → `{astNode, 'walk'}`。

`findUSESet` 改為：對每一項設 `forceCUse = (read === 'c-use')`、`isPUse = (read === 'p-use')`，再以原 walker 走訪；
`Identifier` handler 只剩「`forceCUse` → c-use；否則依 `isPUse`」。移除 `isPreEvaluated`、`currentRoot`、`isSplitLeaf`、
`readsDiscriminant`、`SwitchCase`／`ForInStatement`／`ForOfStatement` handler 與 `useLoopHead`、`readsSwitchDiscriminant`
（兩者邏輯併入新模組）。二元、呼叫 callee、一元、`?:`、class 頭的 p-use 傳播規則原樣保留（Clarifications）。

**逐項等價論證**（characterization，均取自重構前行為）：

| 情況 | 舊行為 | 新行為 | 關鍵 |
|------|--------|--------|------|
| preEvaluated 內任何識別字 | `isPreEvaluated` 先判斷 → c-use，即使走訪內二元等把 `isPUse` 設 true | `'c-use'` 為**強制**旗標，不只是起始值 | 三種讀法而非兩種 |
| `switch (x)` 的 `case y` | root 是 `SwitchCase`，handler 設 `isPUse = true` 後 recurse discriminant；root 不是 Identifier，**不套根識別字規則** → `x` 為 p-use | `{x, 'p-use'}` → p-use | 新 walker 不再有根識別字規則，故 discriminant 為單一識別字時不會被改判；`y` 從未被讀 |
| `switch (a + b)` 的 case | 起始 `isPUse = true`，二元 handler 依節點是否有雙邊重設，結束後 `isPUse = false` | 相同起始狀態、相同 handler | — |
| `for (k in x)`（loop 節點有 true/false 邊） | root 是 `ForInStatement`，`x` 以 `isPUse = false` 走訪 → c-use | `{x, 'walk'}` → c-use | 若沿用「根為 Identifier → 決策節點 p-use」規則會誤判為 p-use；故根識別字規則必須在 `usedExpressionsOf` 決定、walker 移除 |
| `for (o.p in x)`、`for ({a = d} of x)` | 依序 recurse `o`、`d`、`x` | 依序三項 `'walk'` | Set 插入次序相同 |
| `if (a)`／拆分葉 `a`／with 物件 `a`／`a;` | p-use／c-use／c-use／不讀 | `'p-use'`／`'c-use'`／`'c-use'`／無項目 | — |
| 決策 `c`（preEvaluated `[f(y)]`） | `f(y)` 全 c-use，`c` 根識別字 → p-use | `[{f(y),'c-use'}, {c,'p-use'}]` | 前綴與 astNode 規則可組合 |
| 拆分產生、astNode 為 `SwitchCase` 複本的 case 決策節點 | `parent` 與 `discriminantSplit` 由 `split()` 設定 | 同一判斷 | — |

**Rationale**：`read` 三值恰好表達舊程式三個獨立機制（強制 c-use、起始 p-use、預設走訪）；根識別字規則以
「起始 p-use／強制 c-use／省略」三種結果之一表達，walker 因此不需知道 root 是什麼。獨立模組可直接以手建 FlowNode
＋解析出的 AST 做單元測試，不跑 worklist（FR-008）。

**Alternatives considered**：
- `read` 只有 `'c-use'`／`'p-use'` 兩值：無法區分「preEvaluated 強制 c-use」與「一般走訪起始 c-use」，不等價。
- 回傳 `{expression, isRootIdentifier}` 讓 walker 繼續套根識別字規則：判斷仍留在 `findUSESet`，違反 SC-005。
- 放在 `defuseanalyzer.js` 經 `_testonly_` 匯出：可行但檔案仍 700 行、測試需穿過 singleton；新模組較清楚。

## R7. 新測試的位置與 `npm test` 納入（FR-003、FR-008）

**Decision**：`tests/esgraph/decisionfinder.js`、`astrewriter.js`、`branchlabel.js`；`tests/dujs/usedexpressions.js`。
`package.json` 的 `test` 腳本把逐檔列出的三個 esgraph 檔改為 `tests/esgraph/*.js`（目前該目錄頂層恰為這三檔，
集合不變，再加新檔）；`doc` 腳本加入 `lib/esgraph/branchlabel.js`（spec Assumptions：API 文件隨欄位調整）。
AST 由 `lib/dujs/jsparser` 的 `parseAST` 取得；`searchByType` 每個 case 至少一例（清單見 contracts）；astrewriter
以深度凍結或 JSON 快照驗證輸入 AST 不被修改。預期值取自重構前行為，於測試標題或註解標示 characterization。

**Alternatives considered**：放 `tests/dujs/` 以免改腳本——測試對象在 `lib/esgraph`，與既有目錄慣例不符。

## R8. 文件與註解同步

**Decision**：`tests/helpers/analyze.js` 檔頭說明、`docs/known-issues.md` §15 的 `FlowNode.branchPath` 改為
「`labelPath`（call return 節點）／`split.path`」；`defuseanalyzer.js` 的註解改指新模組。`specs/001-*` 為歷史文件，不改。

## R9. 驗證策略

**Decision**：每個 story 結束時跑 quickstart 的共同檢查（`npm test`、`npm run lint`＋抑制數、`FC_NUM_RUNS=1000` 性質測試、
golden 目錄無變更）與該 story 專屬檢查（US1：`wc -l`、新模組不 require flownode；US2：標籤字串 grep；US3：`findUSESet`
grep）。golden 由 `npm test` 內的 `tests/golden/golden.js` 比對，不使用 `UPDATE_GOLDEN`。
