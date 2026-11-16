# Contract: 對外介面（CLI、函式庫 API、輸出檔）

**來源**：spec Assumptions「對外的 CLI 參數與輸出檔格式不變；只有輸出內容依上述需求改變」、FR-012、FR-013

## CLI（`bin/dujs.js`）

| 項目 | 本輪 |
|------|------|
| 參數 `-js <files…>`（可重複，每組一個 page） | 不變 |
| 結束碼 | 0（含 labeled／`with`／`debugger` 的輸入不再因例外而無輸出；SC-002） |
| 輸出目錄 `out-<時間>/`、`page<n>/intra-procedurals`、`intra-pages`、`inter-page` | 不變 |

## 輸出檔內容（`*.graph.dot`、`*.dupairs.dot`）

| 項目 | 本輪 |
|------|------|
| dot 結構、檔名、def-use 表欄位 | 不變 |
| 一般節點 label（`toDotWithLabelLine`） | 無拆分節點不變：`<行>`；**拆出節點**：`<行>:<路徑>`（如 `2:TF`）；碰撞時沿用既有 `a`、`b`… 後綴 |
| `toDotWithLabelLoc` | 拆出節點為 `L<行>:C<欄>:<路徑>` |
| 新節點 | 條件／短路拆出的決策與葉、參數初始化節點；static 成員串接的 CALL／RETURN 邊與 call return 節點 |
| 新 scope 的 intra-procedural 輸出 | 欄位初始化式與 static block 各一組（匿名函式 scope 標題，`$ANONYMOUS_FUN_<n>`） |
| scope 名稱 | 同父 scope 下重名者加 `_1`、`_2`…（FR-011），無重名時不變 |

## 函式庫 API

- 公開模組與方法簽章不變。
- `FlowNode` 新增屬性 `preEvaluated`、`branchPath`、`splitOrigin`、`analyzedExpressions`
  （見 [data-model.md](../data-model.md)）；既有屬性語意不變。
- `ScopeTree.getScopeByName` 對重名函式可分別查到（US6）。

## 相容性與回歸

- golden 期望輸出只可因 FR-001、FR-004～FR-010、FR-014 改變（FR-010 限 T040a 新增的 loop 出邊，D17）；每處差異在 PR 說明中對應 FR（FR-013、SC-004）。
- `tests/esgraph/tests/*.js`（上游 fixture）視同 golden：`maythrow.js` 的 `1 && call();` 因 FR-008 改變。
