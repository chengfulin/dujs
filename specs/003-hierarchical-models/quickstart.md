# Quickstart：驗證階層式模型結構（重構 stage 1）

**Feature**: `003-hierarchical-models` | **Plan**: [plan.md](./plan.md)

所有指令在專案根目錄執行；git 一律 `git -C <專案根>`。前置：Node.js ≥ 24、`npm ci` 完成；Graphviz 不需要。

## 0. 基線（plan 階段已量測）

```sh
npm test        # 786 passing
npm run lint    # 0 errors
node -e "const s=require('./eslint-suppressions.json');let n=0;for(const f in s)for(const r in s[f])n+=s[f][r].count;console.log(n)"  # 119
```

## 1. Setup：新 fixture 與重構前 golden（任何 lib/ 變更之前）

1. 確認程式是重構前版本：`git diff --quiet bf07818 HEAD -- lib bin package.json && echo pre-refactor`。
2. 新增 `tests/golden/fixtures/interprocedural/app.js`：

   ```js
   var total = 0;
   var limit = 3;
   function addTo(value) {
     function scale() {
       return value * 2;
     }
     total = total + value;
     scale();
     return total;
   }
   function isReady() {
     return total > limit;
   }
   addTo(1);
   if (isReady()) {
     total = 0;
   }
   function onClick() {
     function log() {
       console.log(total);
     }
     log();
   }
   function onLoad() {
     limit = 5;
   }
   window.addEventListener('click', onClick);
   window.addEventListener('load', onLoad);
   localStorage.total = total;
   ```

3. 在 `tests/golden/golden.js` 加入 case `Golden outputs (inter-procedural fixture)`（`[['interprocedural/app.js']]` → `expected-interprocedural/`），
   然後只產生新 case：`UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js --grep "inter-procedural fixture"`。
4. 預期：`git status --short tests/golden` 只出現 `fixtures/interprocedural/` 與 `expected-interprocedural/`（inter-page 2 個、
   inter-procedurals 6 個、intra-pages 2 個、intra-procedurals 14 個 .dot）。
5. 產生 `tests/golden/manifest.json` 的 `baseline`（三個 expected 目錄每個 .dot 的 sha256；`added: []`），加入 contract #3、#4 的 `it`。
6. `npm test` 全綠（786 ＋ 新 case 的 4 個 ＋ 既有兩個 case 各 2 個新 `it`）。
7. （**必做**交叉驗證）`git worktree add <scratch>/base bf07818`，在該處以 `node bin/dujs.js -js <絕對路徑>/app.js` 產生輸出，與
   `expected-interprocedural/` 逐檔 `cmp`，全部相同才可提交。`manifest.json` 本身是可手改的文字檔，雜湊無法自證來源；
   靠本步驟（expected 確實出自重構前程式）與之後各 story 的 `git diff --exit-code tests/golden/manifest.json tests/golden/expected*`
   （`baseline` 與既有 expected 未被改動）把關。

## 2. 每個 user story 結束時

```sh
npm test                                   # 全綠；golden 段 #1–#4（US2 起含 #5）全過
npm run lint                               # 0 errors
git diff --exit-code eslint-suppressions.json
git diff --exit-code tests/golden/manifest.json   # US2 以外不得變更；US2 只改 added
FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js
```

## 3. US1 驗收

| 情境 | 驗證 |
|------|------|
| 1（§13） | `tests/dujs/hierarchy.js`：`var a = 1; if (a) { a = 2; }` 四層建完後，頁面 intra-procedural 模型 `L2` 的 `false` 仍是該模型的 exit；`analyze(...).intraProcedural()` 含 `a: L1 -> L2>exit:F` |
| 2（§16） | known-issues §16 範例：intra-procedural 模型中 `L5` 的前驅不是 CALL 節點；inter-procedural 扁平圖為 前驅 → call → `f` → callReturn → `L5`；pair 與現況相同（既有測試） |
| 3（SC-003） | helper 的不變性檢查在所有使用 `analyze()` 的測試中執行；`tests/dujs/hierarchy.js` 對三個 golden fixture 逐段執行並比對快照 |
| 4（SC-002） | `grep -n "LOOP_NODE_TYPE\|dujsDecisionCalledBefore" tests/helpers/analyze.js tests/dujs/branchsplit.property.js lib` 無結果；全部既有測試通過 |
| 5（SC-001） | golden #3 |
| 6 | 主程式 `f();` 與 `localStorage.x = 1;`：intra-procedural 呼叫點仍為 normal、GEN／KILL 與出邊不變；intra-page 扁平圖的頁面節點沒有 `saveStorage`／`loadStorage` |
| 7 | `model.hierarchy.edges` 的 call 邊：`caller`、`callee.model`、`callSite`、`order`、`beforeDecision` 皆可取得；`callee.model.graph` 與建好時快照相同 |
| 環防護 | `hierarchy.createCallHierarchyModel` 手建 A→B→A，`expansion.expand` 拋出 `call cycle in hierarchy` 並終止 |
| 計數器 | `expand` 前後 `require('./lib/esgraph/flownodefactory').counter` 相同 |

## 4. US2 驗收

1. 執行 `node bin/dujs.js -js "$PWD/tests/golden/fixtures/interprocedural/app.js"`（在暫存目錄），確認出現
   `page0/inter-procedurals/{0,1,2}.hierarchy.dot`、`page0/intra-pages/0.hierarchy.dot`、`inter-page/0.hierarchy.dot`。
2. 依 [contracts/hierarchy-output.md](./contracts/hierarchy-output.md) §3 人工核對每個新檔（含 ES5、ES2015+ fixture 的 intra-page 與 inter-page
   階層圖），通過後 `UPDATE_GOLDEN=1 npm test`，`git status` 只應新增 `.hierarchy.dot` 檔；把清單寫入 `manifest.json` 的 `added`。
3. golden #5：報告中每段階層圖在扁平圖之前，既有內容順序不變（不需 Graphviz）。

## 5. US3 驗收

```sh
grep -n "findKILLSet" -r lib tests          # 無結果
grep -n "catch {" lib/dujs/jsparser.js      # 無結果
grep -n "expressionThrows\|ClassDeclaration" THIRD_PARTY_NOTICES.md lib/esgraph/index.js | head
```

並人工檢查 `defuseanalyzer.js` 每段 JSDoc 緊接其函式、known-issues §9／§13／§16／§18 與新增的 N1 一節（FR-012）。
