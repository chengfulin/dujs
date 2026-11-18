# Contract：DOT → Mermaid 圖（扁平圖與階層圖）

適用：`lib/dujs/dotreader.js`、`lib/dujs/mermaidgraph.js`（皆原創 MIT，不 require、不複製 `lib/esgraph/dot.js`）。
對應：FR-002、FR-003、FR-004、FR-006、FR-010；research R1、R4。

## 1. 輸入：dujs DOT 方言（`dotreader.readDot(text)`）

逐行（`\n` 分隔）判定，順序不限，空行略過；**其他任何行拋 `Error('unsupported DOT line: …')`**：

| 行 | 規則 |
|----|------|
| `digraph <word> {`、`node [shape="box"]`、`}` | 略過 |
| `label = "<q>"` | 圖標題（不輸出到 Mermaid，見 model-markdown.md 的標題規則） |
| `<id> [<attrs>]` | 節點；`<id>` 為 `[A-Za-z_]\w*` |
| `<from> -> <to> [<attrs>]` | 邊；`[]` 內可為空 |

`<attrs>`：以逗號分隔的 `key = "<q>"`（`=` 兩側可有空白，如 `label = "call"`）。解析 MUST quote-aware：引號內的 `,`、`]` 不是分隔或結尾（如 `style="bold,dashed"`、標籤含 `]`；兩者各有單元測試）。`<q>` 解碼：`\"`→`"`、`\\`→`\`，其他字元原樣。

**不支援**：`.dot` 標籤含 `\n` 跳脫或真換行——現行產生路徑（`dot.js`、`hierarchydot.js`）不產生；`\n` 不解碼（原樣保留），真換行使該行無法比對而拋錯。遇到方言外的行拋錯會使 CLI exit 1，屬有意取捨（plan「有意的取捨與已知限制」）。
回傳 `{label, nodes: [{id, attrs}], edges: [{from, to, attrs}]}`，**保留出現順序與重複邊**。

## 2. 輸出：Mermaid 區塊文字（`mermaidgraph.toMermaid(graph)`）

區塊文字＝下列各行以 `\n` 連接（不含 fence 行），縮排兩個空白：

```
flowchart TD
  <node lines，依 nodes 順序>
  <edge lines，依 edges 順序>
  classDef ellipse fill:#ffff00,stroke:#333,color:#000      ← 僅當有 ellipse 節點
  classDef storage fill:#ffa500,stroke:#333,color:#000      ← 僅當有 storage 節點
  class <id>,<id>,... ellipse                               ← 依節點順序
  class <id>,<id>,... storage
  linkStyle <i>,<j>,... <style>                             ← 每種樣式一行，依該樣式第一次出現的邊序
```

### 2.1 節點形狀（FR-004）

| DOT 屬性 | 出現於 | Mermaid | class |
|----------|--------|---------|-------|
| 無 `shape`（預設 box） | 一般敘述節點、階層圖的函式／頁面單元 | `id["L"]` | — |
| `shape="ellipse"`（`fillcolor="yellow"`） | entry、exit、call、callReturn、loop、loopReturn、finallyExit；階層圖 LOOP | `id(["L"])`（stadium） | `ellipse` |
| `shape="doublecircle"`（`fillcolor="orange"`） | localStorage；階層圖 domain | `id((("L")))` | `storage` |

形狀只依 `shape` 屬性判斷，不依節點型別（轉換器不知道型別）；遇到其他 `shape` 值拋錯。

### 2.2 邊（FR-003、FR-004）

`from <arrow>|"L"| to`；DOT 邊沒有 `label` 屬性時不寫 `|…|`。

| DOT `style` | arrow | 額外 linkStyle |
|-------------|-------|----------------|
| 無 | `-->` | — |
| `dotted`（資料流、loadStorage、saveStorage） | `-.->` | `stroke-dasharray:2 2` |
| `dashed`（return） | `-.->` | — |
| `bold`（recursive call） | `==>` | — |
| `bold,dashed`（recursive return） | `-.->` | `stroke-width:3px` |

`color` 屬性（`red` exception、`blue` call／return／recursive、`green` onEvent）→ linkStyle `stroke:<color>`。同一條邊的 linkStyle 片段依 `stroke`、`stroke-dasharray`、`stroke-width` 順序以逗號連接；完全相同的樣式字串合併為一行。

### 2.3 標籤跳脫（FR-006）

`quote(text)`：
1. 依序替換（`#` 必須第一個）：`#`→`#35;`、`"`→`#34;`、`&`→`#38;`、`<`→`#60;`、`>`→`#62;`、`` ` ``→`#96;`、`:`→`#58;`、`%`→`#37;`、`\r`→`#13;`（D004-1a，一律實體化）。
2. 相鄰 `$$` 打斷：凡緊接在 `$` 之後的 `$`（以原文判斷）改為 `#36;`（`$$a$$`→`$#36;a$#36;`、`$$$`→`$#36;#36;`）；單一 `$` 不動。
3. 換行 `\n`→`<br/>`。
4. 首尾的空白字元（`\s`）各自以 `#<十進位碼>;` 表示（Mermaid 會 trim）。
5. 結果為空字串時輸出 `" "`（Mermaid 不接受 `""`）。
6. 前後加 `"`。

`[ ] { } ( ) | ;` 與單一 `$` 在引號內原樣（R4 探針確認）。

補洞理由（D004-1a，`mermaid@12.3.0` 查證）：
- `encodeEntities` 先跑 `/style.*:\S*#.*;/`、`/classDef.*:\S*#.*;/`，比對到就砍掉最後一個 `;`；因為任何實體都帶 `#…;`，標籤只要含 `style`／`classDef` 與 `:` 就會觸發（例 `style:#x`→顯示 `style:#35x`、`a.style:#b;c` 掉 `;`）。`:` 實體化後標籤內不再有字面 `:`，兩條 regex 不會命中。
- 標籤內 `%%{…}%%` 被當 directive，parse 失敗 → `%` 實體化。
- `\r` 被正規化成 `\n` → 以 `#13;` 保留。
- `/\$\$(.*?)\$\$/` 觸發 KaTeX 數學式 → 打斷相鄰 `$$`。

往返測試案例 MUST 包含：`style:#x`、`classDef x:#1`、`%%{init: {}}%%`、含 `\r` 的標籤、`$$a$$`。

**往返解碼（測試用，不在 lib）**：`getDiagramFromText` 的頂點／邊文字中，`ﬂ°°(\d+)¶ß`→`String.fromCharCode(碼)`、`ﬂ°(\w+)¶ß`→具名實體、`<br>`→`\n`；解碼後 MUST 等於 DOT 標籤解碼結果；空標籤對應 `""`。

## 3. 降級（FR-010）

常數（`mermaidgraph.js` 匯出，不讀 mermaid 套件）：`MAX_EDGES = 500`、`MAX_TEXT_SIZE = 50000`。

每張圖各自判斷：`edges.length > MAX_EDGES` **或** `toMermaid(graph).length > MAX_TEXT_SIZE`（JS 字串長度、UTF-16 code unit，即 §2 的區塊文字，含 `classDef`／`class`／`linkStyle` 行、不含 fence）→ 降級。邊數 500 或字元數 50000 剛好不降級。

降級輸出（取代該圖的 mermaid 區塊，Markdown 表格的儲存格規則見 model-markdown.md §3）：

```
> This graph has <E> edges and <C> characters in Mermaid, over the limits of Mermaid (500 edges, 50000 characters); it is shown as tables. See [`<n>.<kind>.dot`](<n>.<kind>.dot) for the graph.

| Node | Label |
| --- | --- |
| `n0` | `entry` |

| From | To | Label |
| --- | --- | --- |
| `n0` | `n1` |  |
```

節點表依 nodes 順序、邊表依 edges 順序（含重複邊）；無標籤的邊 Label 欄為空。`<kind>` 為 `graph` 或 `hierarchy`。

## 4. 不變量（測試對象）

- I1：Mermaid 的節點（id, label）多重集合＝`.dot` 的；邊（from, to, label）多重集合＝`.dot` 的（含無標籤重複邊，經 `getEdges()` 驗證）；box／stadium／double circle 的節點數各等於 `.dot` 的 `shape` 計數（SC-003）。
- I2：每個 mermaid 區塊 `mermaid.parse` 通過（FR-009）。
- I3：輸出只依輸入字串，不含時間、路徑、隨機值（FR-007）。
