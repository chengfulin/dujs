# Contract：dot 輸出的變更（FR-011、FR-015）

**Feature**: `004-fix-remaining-issues`

## 1. CALL RETURN 標籤（FR-011，`lib/dujs/cfggraphconverter.js`）

| 轉換器 | 節點 | 修正前 | 修正後 |
|--------|------|--------|--------|
| `toDotWithLabelLine`（CLI 預設） | CALL RETURN，`labelPath` 空 | `callReturn`（同名多個時 `callReturn_a`、`callReturn_b`…） | 不變 |
| 同上 | CALL RETURN，`labelPath` 非空（拆分呼叫點） | 同上 | `callReturn (<line>:<path>)`，例 `callReturn (5:T)`；若仍有同名，照舊加 `_a`、`_b` |
| `toDotWithLabelLoc` | CALL RETURN，`labelPath` 空 | `callReturn (L<line>:C<col>)` | 不變 |
| 同上 | CALL RETURN，`labelPath` 非空 | `callReturn (L<line>:C<col>)` | `callReturn (L<line>:C<col>:<path>)`，例 `callReturn (L2:C0:T)` |

- `<path>` 為 `branchLabel.pathOf(node)`（CALL RETURN 取呼叫點的 `labelPath`），分隔與一般節點的 `pathSuffix` 相同。
- 其他節點（含 CALL、決策前插入的 CALL）的標籤不變（FR-011 只涵蓋 CALL RETURN）。
- dupairs 表格以節點標籤列出 pair，拆分呼叫點的 CALL RETURN 若出現在 pair 中，標籤隨之改變（golden-diff 記錄）。

## 2. 階層圖的回邊（FR-015，`lib/dujs/hierarchydot.js`）

- `EDGE_ATTRIBUTES` 新增兩種：

| kind | 屬性 |
|------|------|
| `backCall` | `color="blue", style="bold", label="recursive call"` |
| `backReturn` | `color="blue", style="bold,dashed", label="recursive return"` |

- `collectCalls` 遇到 `edge.back === true`：`collector.edge(caller, callee, 'backCall')`、`collector.edge(callee, caller, 'backReturn')`，圖節點仍以 scope
  為鍵（回到已存在的節點；自我遞迴為自環）；不往下遞迴。去重鍵含 kind，因此同一對 scope 的 `call` 與 `backCall` 並存。
- 一般邊、單位節點、檔名與 HTML 插入位置（003 contracts/hierarchy-output.md）不變 → 沒有回邊的模型其 hierarchy.dot 逐位元組不變。
- 範例（`probes/cyc-2.js` 的 M）：

```
h0 [label="$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0"]
h1 [label="$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1"]
h0 -> h1 [color="blue", label="call"]
h1 -> h0 [color="blue", style="bold", label="recursive call"]
h0 -> h1 [color="blue", style="bold,dashed", label="recursive return"]
h1 -> h0 [color="blue", style="dashed", label="return"]
```

（邊的行序依 `collectCalls` 的走訪：先 call、再遞迴子模型、最後 return；實作以實際輸出為準並以單元測試鎖定。）

## 3. 扁平圖

- 回邊不新增節點種類：回邊的 CALL／CALL RETURN 與一般呼叫相同（`call`、`callReturn`），`call` 邊指向已存在的 entry 節點、`return` 邊自已存在的 exit 節點。
- FR-016 的 bypass 不在圖上畫邊（只影響分析）。
