# Golden 差異紀錄（FR-013）

基準：`e091b1d`（新 fixture 以修正前程式產生）。dot 標記的行號＝fixture 行號＋1（CLI 在檔首加一行 `/// --- start ...`）。

## §20（US1，FR-001）

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | 4 檔差異（皆為 fixture 第 2 行 `if (a + b >= c)` 的 `c`） |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|
| `expected-fixes004/` | `page0/intra-procedurals/0.dupairs.dot` | 第 18 行（`c` 列） | `(2,3)` → `(2,(3,4))`、`(2,(3,9))`：決策 L3（fixture L2）右運算元 `c` 由 c-use 改為 T／F 兩條 p-use，與 `a`、`b` 相同 | `bc605ce580ed` → `e31229399c54` | FR-001 |
| `expected-fixes004/` | `page0/inter-procedurals/0.dupairs.dot` | 第 18 行（`c` 列） | 同上 | `593eecf94eb3` → `01074adcad54` | FR-001 |
| `expected-fixes004/` | `page0/intra-pages/0.dupairs.dot` | 第 18 行（`c` 列） | 同上 | `593eecf94eb3` → `01074adcad54` | FR-001 |
| `expected-fixes004/` | `inter-page/0.dupairs.dot` | 第 18 行（`c` 列） | 同上 | `593eecf94eb3` → `01074adcad54` | FR-001 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/usedexpressions.js` 約 139 行（findUSESet scenario 1，`x = o.p[i] ? a : b`） | `{cuse: ['o', 'i'], puse: []}` → `{cuse: [], puse: ['o', 'i']}`；標題改為「as p-uses」 | FR-001 |
| `tests/dujs/usedexpressions.js` 約 145 行（同上，前有 `f(y)`） | `{cuse: ['f', 'y', 'o', 'i'], puse: []}` → `{cuse: ['f', 'y'], puse: ['o', 'i']}`（`f(y)` 為先求值呼叫，維持 c-use） | FR-001 |
| `tests/dujs/usedexpressions.js` 約 273、279 行（usedExpressionsOf scenario 1） | 決策條件 `o.p[i]` 的 read `'walk'` → `'p-use'`；標題改為「in the condition mode」 | FR-001 |
| `tests/dujs/es2015.js` 約 407 行（`var v = o?.a?.b ?? t;`） | `'o: L4 -> L5'` → `'o: L4 -> L5>L5:F'`、`'o: L4 -> L5>L5:T'` | FR-001 |
| `tests/dujs/usedexpressions.js`（新增） | 新增 `switchCall` 程式與測試：`switch (a + f(b) + c)` 的 case 節點 `{cuse: ['b'], puse: ['a', 'f', 'c']}` | FR-001 |

## §21（US2，FR-002、FR-003）

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | 7 檔差異，皆來自 fixture 第 8 行 `new P(1);` 連到 `P`（dot 行號 9）；無新增、無刪除檔（仍 31 個 .dot）。fixture L15–L18（實例欄位 `count = x;` 與 constructor）只由 L35 `new Counter().add(2);` 觸發（`new A().m()` 屬 US3／§7），L36 `var counter = new Counter();` 不是 `new` 敘述，本節無差異 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|
| `expected-fixes004/` | `page0/inter-procedurals/0.hierarchy.dot` | `h1`–`h5` 標籤、新增一組 call／return 邊 | 頁面階層新增被呼叫端 `$DOMAIN.$PAGE_0.P`（`h1`，排在第一個：L8 是第一個呼叫點），其餘單位編號順延（`h2`…`h5`），多一對 `h0 -> h5` call／`h5 -> h0` return | `7537aaacc7ef` → `5994e108afbc` | FR-002 |
| `expected-fixes004/` | `page0/inter-procedurals/0.graph.dot` | 節點 `n41`–`n46` 起及其後的邊 | dot L9 節點改為 `call_a`，插入 `entry_b`、`7`（`x = v;`）、`exit_a`、`callReturn_a`；其後的 call／entry／exit／callReturn 標籤字母順延一位（`call_c`→`call_d` 等） | `103943169b5b` → `96ec8627c134` | FR-002 |
| `expected-fixes004/` | `page0/inter-procedurals/0.dupairs.dot` | `a`、`b`、`c`、`x`、`P`、`log`、`h`、`Counter`、`p` 列；新增 `v` 列 | `x`：`(2,10)`、`(2,52)` → `(7,10)`、`(7,52)`（`y = x;` 與 `console.log(x, y)` 讀到 `P` 內的 `x = v`）；`P`：`(entry_a,9)` → `(entry_a,call_a)`；新增 `v`：`(entry_b,7)`；`a`／`b`／`c` 的 `(3,9)` → `(3,call_a)`（L3 決策的 false 目標即 L9，現為 CALL 節點）；其餘為標籤順延（`call_c`→`call_d`、`entry_e`→`entry_f`、`Counter` 的 `call_a`→`call_b` 等） | `01074adcad54` → `c3d7645b7aa6` | FR-002 |
| `expected-fixes004/` | `page0/intra-pages/0.graph.dot` | 同 inter-procedural graph | 同上（頁面模型的展開圖） | `1b5d187006ba` → `de490b005751` | FR-002 |
| `expected-fixes004/` | `page0/intra-pages/0.dupairs.dot` | 同 inter-procedural dupairs | 同上 | `01074adcad54` → `c3d7645b7aa6` | FR-002 |
| `expected-fixes004/` | `inter-page/0.graph.dot` | 同 inter-procedural graph | 同上（inter-page 展開圖） | `fd33dfe953bd` → `f37181acd098` | FR-002 |
| `expected-fixes004/` | `inter-page/0.dupairs.dot` | 同 inter-procedural dupairs | 同上 | `01074adcad54` → `c3d7645b7aa6` | FR-002 |

（新 sha 為 implement 時以 CLI 在暫存目錄實跑所得，`UPDATE_GOLDEN=1` 後以 quickstart §1 步驟 4 重算確認。）

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/classfields.js` 檔頭 1–10 行 | 001 D7「實例欄位初始化式不接入流程」說明改為「已由 004 FR-003 取代：`new A();` 敘述依序連實例欄位初始化式與 constructor」；無斷言變更（既有測試皆無 `new` 敘述觸及實例欄位，US3-2／US3-5 仍通過） | FR-003 |
| `tests/dujs/newcallsite.js`（新增） | acceptance US2 #1–#7、`edge-classexpr`、FR-017／FR-018 表的 `field-new`、`fn-new-early`，以及 `callResolver` 單元測試 | FR-002、FR-003、FR-017、FR-018 |

### FR-018（呼叫規則統一與 class 放寬，analyze 裁決 1、2）

呼叫規則統一：既有 golden 無差異（與 Fable 原型 `FSTRICT`／`RELAX=i` 實測一致）。`f()` 改為嚴格規則（到達定義至少一筆且全部指向同一函式）後，
既有 fixture 中被連結的 `f()` 到達定義都只有一筆函式定義，連結不變；class 放寬只作用於函式／成員內、到達定義為空的 `new A()`，既有 fixture 沒有此形式。

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | 無差異（`log(...)`、`h()` 的連結不變；L8 `new P(1);` 依嚴格規則解析到 `P`，差異記於 §21 上表；L36 不是 `new` 敘述；L35 `new Counter().add(2)`、L38 `Counter.reset()` 屬 US3） |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

## §7（US3，FR-004、FR-005）

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

### FR-015

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### FR-016（Fable A1）

（Foundational 的差異記於本子表；對既有 `f()` 的影響註明 KI §16 後果段。）

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | 無差異（fixture 中被連結呼叫的呼叫點，到達定義都是被呼叫端看得到、也不是其區域變數的定義，bypass 集合為空；KI §16 後果段的恢復見探針 `ki16b`、`ki16`，不在 golden fixture 中） |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### FR-017

欄位 `f = new B();` 依 FR-018 class 放寬會連（`probes/field-new.js`，`tests/dujs/newcallsite.js`）；欄位 `f = this.m();` 屬 US3。

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | 無差異（fixture 沒有值為 `new B()` 的實例欄位；L15 `count = x;` 不是呼叫） |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

## §10（US4，FR-006）

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## §11（US4，FR-007）

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## §17（US4，FR-008）

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## §12（US5，FR-009、FR-010）

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## §15（US6，FR-011）

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## §14（US6，FR-012）

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

## 驗收預期更正

無
