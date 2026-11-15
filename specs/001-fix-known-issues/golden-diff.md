# Golden 差異稽核（FR-013、SC-004）

implement 期間的工作檔：每次 `UPDATE_GOLDEN=1 npm test` 的差異逐處對應到 FR，最後由 T053 彙整進 PR 說明。

說明：dot 輸出的節點標記為 fixture 行號 + 1（`tests/golden/fixtures/es2015/app.js` 的 L16 在 dot 中為 `17`，
L18 為 `19`）。

## US2（T023）：`new` 的參數（FR-004）、預設參數初始化節點（FR-005）

`tests/golden/expected/`（ES5）：零差異。

| 檔案 | 差異位置 | 內容 | FR |
|------|----------|------|----|
| `tests/golden/expected-es2015/page0/intra-procedurals/0.dupairs.dot` | `document` 列 | 新增 `(entry,17)`：fixture L16 `new TodoList(document.getElementById('list'))` 的參數讀 `document`；表格欄數 1→2（`COLSPAN` 與各列空白 `<td>` 隨之增加） | FR-004 |
| `tests/golden/expected-es2015/page0/intra-pages/0.dupairs.dot` | `document` 列 | 同上，新增 `(entry_a,17)`；欄數 3→4 | FR-004 |
| `tests/golden/expected-es2015/inter-page/0.dupairs.dot` | `document` 列 | 同上，新增 `(entry_a,17)`；欄數 3→4 | FR-004 |
| `tests/golden/expected-es2015/page0/intra-procedurals/4.graph.dot`（`$ANONYMOUS_FUN_3`＝fixture L18 `addTodo`） | 全檔 | 新增 `title = ''` 的初始化節點 `19`：`entry -> 19 -> 20`、`19 -> exit`（exception），取代 `entry -> 20`；其餘節點只是編號順移 | FR-005 |
| `tests/golden/expected-es2015/page0/intra-procedurals/4.dupairs.dot` | `title` 列 | `title` 的 def 由 `entry` 改為初始化節點 `19`：`(19,(20,21))`、`(19,(20,23))`、`(19,23)` | FR-005 |
| `tests/golden/expected-es2015/page0/intra-procedurals/5.graph.dot`、`6.graph.dot` | 節點編號 | 只有節點 id 順移（+2：上一個模型多一個敘述，CFG 建構多耗用節點計數）；以標記比對節點與邊完全相同 | FR-005（編號連帶） |
| `tests/golden/expected-es2015/inter-page/0.graph.dot` | 節點編號 | 只有節點 id 順移；以標記比對節點與邊完全相同 | FR-005（編號連帶） |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/es2015.js`「should declare pattern, default and rest parameters」 | `last: entry -> L2` → `last: L1 -> L2`（`last = 1` 在 L1 的初始化節點定義） | FR-005 |
