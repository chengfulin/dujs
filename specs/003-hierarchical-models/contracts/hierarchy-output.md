# Contract：階層圖 .dot 與 HTML 報告

**Feature**: `003-hierarchical-models` | US2（FR-008、FR-009）| 產生模組：`lib/dujs/hierarchydot.js`（新，MIT）

## 1. 檔案

| 層級 | 目錄（相對於 `out-<time>/`） | 檔名 | 何時產生 |
|------|-----------------------------|------|---------|
| inter-procedural | `page<i>/inter-procedurals/` | `<k>.hierarchy.dot`（`k` 與同模型的 `<k>.graph.dot` 相同） | 每個 inter-procedural 模型一個；沒有可解析呼叫的頁面沒有 |
| intra-page | `page<i>/intra-pages/` | `0.hierarchy.dot` | 每頁一個（沒有處理器也輸出） |
| inter-page | `inter-page/` | `0.hierarchy.dot` | 一個 |

既有的 `<k>.graph.dot`、`<k>.dupairs.dot` 內容與檔名不變。png 由既有的 `writeImageFileFromDotFile` 產生（`<k>.hierarchy.png`）。

## 2. 格式

```text
digraph Hierarchy {
node [shape="box"]
label = "<level>: <main 名稱>"
h0 [label="<標籤>"<樣式>]
...
h<a> -> h<b> [<邊樣式>]
...
}
```

- `<level>`：`inter-procedural`、`intra-page`、`inter-page`；`<main 名稱>`：inter-procedural 為根 scope 的 `String(scope)`，intra-page 為頁面
  scope 的 `String(scope)`；inter-page 只寫 `inter-page`。
- 檔尾與既有 graph.dot 相同沒有換行（`}` 結尾）。

### 2.1 節點

| 單位 | 標籤 | 樣式 |
|------|------|------|
| 主程式、函式、事件處理器 | `String(scope)`，如 `$DOMAIN.$PAGE_0`、`$DOMAIN.$PAGE_0.addTo` | 預設（box） |
| LOOP | `loop` | `, shape="ellipse", style="filled", fillcolor="yellow"`（同扁平圖） |
| 頁面 | `page<i>` | 預設 |
| domain | `$DOMAIN` | `, shape="doublecircle", style="filled", fillcolor="orange"`（同扁平圖 localStorage） |

不輸出 CALL、CALL RETURN、LOOP RETURN（D8）。每個單位一個節點（同一 scope 只一個）。

### 2.2 節點與邊的次序

邊種類（FR-008）：呼叫（`call`）、返回（`return`）、進入 LOOP（主程式→LOOP，`loop`）、事件（`onEvent`）、`loadStorage`、`saveStorage`。

- **inter-procedural**：`h0` 為根；之後以深度優先走訪呼叫邊（模型自己的邊依 `seq`，遇到被呼叫者是 inter-procedural 模型時遞迴進入它的
  邊）：每走一條邊輸出 `caller -> callee [color="blue", label="call"]`，遞迴處理被呼叫者後輸出
  `callee -> caller [color="blue", style="dashed", label="return"]`；節點 id 依第一次出現指派。
- **intra-page**：`h0` 主程式、`h1` LOOP、`h2...` 處理器（依清單第一次出現）；邊：`h0 -> h1 [label="loop"]`（進入 LOOP）；每個處理器
  `h1 -> hk [color="green", label="onEvent"]` 與 `hk -> h1 [color="blue", style="dashed", label="return"]`。處理器內呼叫的函式不出現。
- **inter-page**：`h0` domain、`h1...` 各頁（頁序）；每頁 `h0 -> hp [style="dotted", label="loadStorage"]`，有儲存點時再
  `hp -> h0 [style="dotted", label="saveStorage"]`。
- 去重：同一 `(from, to, 種類)` 只輸出第一次。

### 2.3 新 fixture 的預期（人工核對的參考，不是逐位元組規格）

`tests/golden/fixtures/interprocedural/app.js`：

- `inter-procedurals/0.hierarchy.dot`：`addTo` → `addTo.scale`（call、return 各一）。
- `inter-procedurals/1.hierarchy.dot`：`$PAGE_0` → `addTo` → `addTo.scale`、`$PAGE_0` → `isReady`；4 個節點、6 條邊（3 call、3 return）。
- `inter-procedurals/2.hierarchy.dot`：`onClick` → `onClick.log`。
- `intra-pages/0.hierarchy.dot`：`$PAGE_0`、`loop`、`onClick`、`onLoad`；不含 `addTo`、`scale`、`isReady`、`log`。
- `inter-page/0.hierarchy.dot`：`$DOMAIN`、`page0`；loadStorage 與 saveStorage 各一條。

## 3. 人工核對準則（FR-010）

每個新增的 `.hierarchy.dot` 對照同目錄、同索引的 `graph.dot`：

| 層級 | 節點對應 | 邊對應 |
|------|---------|--------|
| inter-procedural | 扁平圖中每個 `entry` 節點所屬 scope ↔ 一個階層節點，無多無少；不出現 call／callReturn | 扁平圖每條 `label = "call"` 邊（呼叫點或插入的 CALL → 被呼叫者 entry）↔ 一條 call 邊（呼叫點的 scope → entry 的 scope）；每條 `label="return"` 邊（被呼叫者 exit → CALL RETURN）↔ 一條 return 邊；同一對只一條 |
| intra-page | 主程式、`loop`、扁平圖 LOOP 的每個 `onEvent` 目標（處理器 entry）的 scope；扁平圖中屬於處理器之 inter-procedural 子模型的 scope 不出現 | LOOP 的每條 onEvent 邊 ↔ loop → 處理器；處理器 exit → loopReturn 的邊 ↔ 處理器 → loop（return）；主程式 → loop 一條（`label="loop"`） |
| inter-page | `localStorage` 節點 ↔ `$DOMAIN`；每頁一個 `page<i>` | domain 的每條 loadStorage 點線邊 ↔ 一條 loadStorage；指向 domain 的 saveStorage 點線邊依來源節點所屬頁面歸併，每頁最多一條 |

`tests/dujs/hierarchy.js` 對三個 golden fixture 以程式做同樣的對應檢查（自動化的核對），人工核對另記在 PR 描述。

## 4. HTML 報告（FR-009）

- `outputWriter` 新增陣列：`interProceduralHierarchyImageFilePaths[page][k]`、`intraPageHierarchyImageFilePaths[page][k]`、
  `interPageHierarchyImageFilePaths[k]`（png 路徑；與既有陣列同樣由 `writeImageFileFromDotFile` 回傳，不論 Graphviz 是否安裝）。
- `reportGenerator` 在 `createInterProceduralReportForAPage`、`createIntraPageReportForAPage`、`createInterPageReportForAPage` 的每個模型區塊
  開頭（扁平圖 `<div>` 之前）插入：

  ```html
  <div class="col-lg-8 col-lg-offset-2 col-sm-12"><img src="../<階層圖 png 路徑>" class="center-block"></div>
  ```

- 不變：Intra-procedural 段、Source Code 段、tab 與 script、既有 `<img>` 的 class 與相對順序。
- 驗證（golden case 的 `it`）：讀 `out-*/report.html` 文字；對每個階層圖 png 路徑，`indexOf(階層圖) < indexOf(同模型 graph png) < indexOf(同模型 dupairs png)`；
  移除所有 `.hierarchy.png` 的 `<div>` 後，其餘內容的 `<img src>` 序列與只含既有路徑時的序列相同。
