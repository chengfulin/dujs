# Contract: 測試輔助工具的 def-use pair 記法

**對象**：`tests/helpers/analyze.js` 的 `intraProcedural()`、`intraPage()` 回傳的字串陣列
**來源**：spec「表示法」、D9、D13、Clarifications 2026-11-16；FR-014

## 文法

```text
pair        = variable ": " def " -> " use
def         = "entry" | label
use         = label                                   ; c-use
            | label ">" target                        ; p-use
target      = pathLabel                               ; 目標帶路徑：不加分支碼
            | plainLabel ":" ("T" | "F")              ; 目標不帶路徑
label       = plainLabel | pathLabel
plainLabel  = "L" line | "entry" | "exit"
pathLabel   = "L" line ":" path
path        = 1*("T" | "F")
line        = 1*DIGIT                                 ; 被分析程式碼的行號（1 起算），拆出節點取原敘述所在行
```

## 規則

1. 一般節點、敘述的第一個決策、拆分後接回的原有節點（如 if 本體）：`L<行>`。
2. 由 FR-008 拆出、位於某分支內的節點（葉與內層決策）：`L<行>:<路徑>`，def 與 use 皆適用。
3. p-use：`<決策>><目標>`；目標為 `pathLabel` 時不加 `:T`／`:F`（路徑最後一碼即分支），否則加。
4. 決策節點的 true 與 false 目標為同一節點時，同時輸出 `:T` 與 `:F` 兩筆。
5. 結果去重、排序（既有行為）。
6. 任一 p-use 的決策節點缺 true 或 false 目標時拋出 `Error`（訊息含變數名與節點標記）——FR-010。

## 範例（取自 spec）

| 程式 | 部分輸出 |
|------|----------|
| `var a = 1, b = 2;` / `var c = a ? b : 3;` / `console.log(c);` | `a: L1 -> L2>L2:T`、`b: L1 -> L2:T`、`c: L2:F -> L3` |
| `var a = 1, b = 2;` / `if (a && b) {` / `  b = 3;` / `}` | `a: L1 -> L2>exit:F`、`b: L1 -> L2:T>L3:T` |
| `var a = 0, b = 1;` / `a ||= b;` / `console.log(a);` | `a: L1 -> L2>L3:T`、`a: L1 -> L2>L2:F`、`a: L2:F -> L3` |

## 已知限制

同一行有多個節點來源（多個敘述、多個拆分來源、參數預設值與本體同行）時標記可能碰撞，p-use 的省略記法也可能
有歧義（`L2>L2:T` 可能是目標 `L2` 的 true 分支或目標 `L2:T`）；for-in／for-of 右側拆分時第一個決策與迴圈節點
同為 `L<行>`。接受為已知限制（spec「表示法」、Clarifications 2026-11-16（analyze））：不加序號、不拋錯；驗收
程式一行一個節點來源。`tests/helpers/analyze.js` 檔頭 MUST 註明此限制。
