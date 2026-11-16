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

fixture 的匿名 scope：`$A0`＝L11 `static self`、`$A1`＝L12 static block、`$A2`＝L15 欄位 `count = x;`、`$A3`＝L16 constructor、`$A4`＝L19 `add`、
`$A5`＝L24 `bump`、`$A6`＝L31 static `reset`（`$Ak` ＝ `$DOMAIN.$PAGE_0.$ANONYMOUS_FUN_k`；dot 行號＝fixture 行號＋1）。L35 `new Counter().add(2);`
依序連 `$A2`、`$A3`、`$A4`；L37 `counter.bump();` 連 `$A5`；L38 `Counter.reset();` 連 `$A6`。`add`↔`bump` 互相呼叫的回邊見 FR-015 子表，`add` 的
`t` 繞過見 FR-016 子表；同一檔的差異分記於各表，雜湊只在本表列一次。

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異（呼叫敘述的連結只新增 class 方法與 `new A().m()` 形式，既有 fixture 沒有此形式；hierarchydot 的回邊屬性只在 `edge.back` 時使用） |
| `expected-fixes004/` | 7 檔差異、新增 6 檔（`page0/inter-procedurals/1.*`、`2.*`）；inter-procedural 模型由 1 個變 3 個：0＝`add` 的模型 `[$A4, $A5]`（13 節點）、1＝頁面模型（原 0，66 節點）、2＝`bump` 的模型 `[$A5, $A4]`（13 節點），序號依登記順序（`add`／`bump` 的環模型先於頁面模型完成）；intra-page 由 41 節點變 68 節點 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|
| `expected-fixes004/` | `page0/intra-pages/0.graph.dot` | dot L36–L39 的節點及其後全部節點與邊 | L35（dot 36）由一般節點改為 `call_d`（→ `$A2` `entry_e`、`16`、`exit_d`）、`call_e`（→ `$A3` `entry_f`、`18`、`exit_e`）、`call_f`（→ `$A4` `entry_g`、`21`、`call_g` → `$A5` `entry_h`、`26`、`27`、`call_h`（回邊，見 FR-015）、`callReturn_c`、`exit_f`、`30`、`callReturn_d`、`23`、`exit_g`）、`callReturn_e`；L37（dot 38）改為 `call_i`／`callReturn_f`（共用同一份 `$A5` 複本，與既有 `log` 兩次呼叫共用複本相同）；L38（dot 39）改為 `call_j` → `$A6` `entry_i`、`33`、`exit_h`、`callReturn_g`；其後 `log`、`h` 的標籤字母順延（`call_d`→`call_k`、`entry_e`→`entry_j`、`call_e`→`call_l`、`entry_f`→`entry_k`、`call_f`→`call_m` 等，編號連帶） | `de490b005751` → `2c49191ebc8f` | FR-004、FR-005、FR-003 |
| `expected-fixes004/` | `page0/intra-pages/0.dupairs.dot` | `c`、`x`、`y`、`counter`、`Counter` 列與 `log`、`h`、`a`、`b`、`p` 的標籤；新增 `n`、`t` 列 | `x`：`(7,52)` 消失（L38 `Counter.reset()` 的 `x = 0` 在所有路徑上覆寫），新增 `(7,16)`（欄位 `count = x;` 讀 `P` 的 `x = v`）、`(7,entry_e)`（§18 殘留：欄位 entry）、`(33,52)`（`reset` 的 `x = 0` 到 `console.log`）；`y`：新增 `(23,52)`（`add` 的 `y = t`）；`counter`：`(37,38)` → `(37,call_i)`；`Counter`：`(call_b,36)` → `(call_b,call_d)`、`(call_b,39)` → `(call_b,call_j)`；新增 `n`：`(entry_g,21)`（`add` 的參數）；`c` 的 `(27,…)`、`(2,(26,…))`、`(2,entry_h)` 見 FR-015 子表；`t` 見 FR-016 子表；`a`、`b`、`c`、`log`、`h`、`p` 其餘為標籤順延（`call_d`→`call_k`、`call_f`→`call_m`、`call_e`→`call_l`、`entry_f`→`entry_k`） | `c3d7645b7aa6` → `41037642281e` | FR-004、FR-005、FR-003 |
| `expected-fixes004/` | `inter-page/0.graph.dot` | 同 intra-page graph | 同上（inter-page 展開圖，42 → 69 節點） | `f37181acd098` → `472b7bc163d1` | FR-004、FR-005、FR-003 |
| `expected-fixes004/` | `inter-page/0.dupairs.dot` | 同 intra-page dupairs | 同上（與 `page0/intra-pages/0.dupairs.dot` 逐位元組相同） | `c3d7645b7aa6` → `41037642281e` | FR-004、FR-005、FR-003 |
| `expected-fixes004/` | `page0/inter-procedurals/1.graph.dot`（新增） | 全檔 | 頁面模型（原 `0.graph.dot`，序號改為 1）：內容同 `page0/intra-pages/0.graph.dot`，只差頁面模型沒有 `loop`／`loopReturn` 兩個節點與其三條邊（66 節點） | 新增 → `77c50f8c3fb1` | FR-004、FR-005、FR-003 |
| `expected-fixes004/` | `page0/inter-procedurals/1.dupairs.dot`（新增） | 全檔 | 頁面模型的 pair，與 `page0/intra-pages/0.dupairs.dot` 逐位元組相同（差異同上） | 新增 → `41037642281e` | FR-004、FR-005、FR-003 |
| `expected-fixes004/` | `page0/inter-procedurals/1.hierarchy.dot`（新增） | 全檔 | 頁面階層（原 `0.hierarchy.dot`）：`h0`（頁面）之下依呼叫點順序為 `P`、`$A0`、`$A1`、`$A2`、`$A3`、`$A4`、`$A5`、`$A6`、`log`、`h`（新增 `$A2`–`$A6`，原 `log`／`h` 編號順延為 `h9`／`h10`）；`h6`（`add`）→ `h7`（`bump`）一般 call／return 與 `h7 → h6` recursive call／recursive return（FR-015）；`h0 → h7`（L37）一般 call／return | 新增 → `d336eb38142c` | FR-004、FR-005、FR-015 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/expansion.js` 約 1026–1043 行 | `describe('call cycle')` → `describe('model cycle')`、`it('should throw for a call cycle built by hand')` → `it('should throw for a model cycle built by hand')`（加註：modelBuilder 建的呼叫環改為回邊）；兩處斷言 `/^call cycle in hierarchy: …/`、`/^call cycle in hierarchy/` → `/^model cycle in hierarchy: …/`、`/^model cycle in hierarchy/`（手建的模型環仍拋錯，訊息改名） | FR-015 |
| `tests/dujs/modelbuilder.js` 730 行 | 標題「…of the inter-procedural model analyzed last」→「…of the inter-procedural model of the page first」（加註 plan U3 (a)）；斷言不變（該測試中頁面模型也是最後分析者） | FR-015（plan U3） |
| `tests/dujs/methodcalls.js`、`tests/dujs/callcycles.js`（新增）；`tests/dujs/expansion.js`、`tests/dujs/hierarchy.js`、`tests/dujs/hierarchydot.js`、`tests/dujs/modelbuilder.js`（新增測試，既有斷言不變） | acceptance US3 #1–#7、FR-015、FR-016 `byp-3`、Edge cases 的單元與探針測試；回邊的展開、bypass、`open hierarchy` 錯誤與 hierarchy.dot 回邊屬性 | FR-004、FR-005、FR-015、FR-016、FR-017 |

### FR-015

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異（既有 fixture 沒有呼叫環） |
| `expected-fixes004/` | `add`（L21 `this.bump()`）↔ `bump`（L27 `this.add(1)`）成環：頁面模型以 L27 為回邊（`h7 → h6`，見 §7 表 `1.hierarchy.dot`）；新增兩個環模型 `[$A4, $A5]`（0.*）與 `[$A5, $A4]`（2.*），各以環上第二個呼叫點為回邊；頁面 pair 新增環造成的 `c` 列 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|
| `expected-fixes004/` | `page0/intra-pages/0.dupairs.dot`、`inter-page/0.dupairs.dot`、`page0/inter-procedurals/1.dupairs.dot` | `c` 列 | 新增 `(27,(26,27))`、`(27,(26,30))`、`(2,(26,27))`、`(2,(26,30))`（L25 `if (c)` 的 p-use：L1 的定義與 L26 `c = 0` 經 L27 回邊重入 `add` → `bump` 到達）、`(27,entry_h)`、`(2,entry_h)`（§18 殘留：`bump` 的 entry）、`(27,(42,call_k))`、`(27,(42,call_m))`（L26 的 `c = 0` 到 L41 `log(c ? a : b)`） | 見 §7 表 | FR-015 |
| `expected-fixes004/` | `page0/intra-pages/0.graph.dot`、`inter-page/0.graph.dot`、`page0/inter-procedurals/1.graph.dot` | `call_h`、`callReturn_c` | `bump` 內 L27 的 `call_h` 以 `call` 邊指向已存在的 `add` 複本 `entry_g`、`exit_g` 以 `return` 邊回到 `callReturn_c`，不重複展開 `add`（回邊） | 見 §7 表 | FR-015 |
| `expected-fixes004/` | `page0/inter-procedurals/0.hierarchy.dot` | 全檔 | 原為頁面階層（移至 `1.hierarchy.dot`）；現為 `add` 的模型：`h0`＝`$A4`、`h1`＝`$A5`，`h0 → h1` call／return，`h1 → h0` recursive call（bold）／recursive return（bold,dashed） | `5994e108afbc` → `b7b7d8290c1e` | FR-015 |
| `expected-fixes004/` | `page0/inter-procedurals/0.graph.dot` | 全檔 | 原為頁面模型（移至 `1.graph.dot`）；現為 `add` 的模型 13 節點：`entry_a`、`21`、`call_a` → `bump`（`entry_b`、`26`、`27`、`call_b`（回邊 → `entry_a`）、`callReturn_a`、`exit_a`、`30`）、`callReturn_b`、`23`、`exit_b` | `96ec8627c134` → `15aa29de3b01` | FR-015 |
| `expected-fixes004/` | `page0/inter-procedurals/0.dupairs.dot` | 全檔 | 原為頁面 pair（移至 `1.dupairs.dot`）；現為 `add` 模型的 pair：`c`：`(27,entry_b)`、`(27,(26,27))`、`(27,(26,30))`；`n`：`(entry_a,21)`；`t`：`(21,23)`（FR-016） | `c3d7645b7aa6` → `bdf4ba013185` | FR-015、FR-016 |
| `expected-fixes004/` | `page0/inter-procedurals/2.hierarchy.dot`（新增） | 全檔 | `bump` 的模型：`h0`＝`$A5`、`h1`＝`$A4`，`h0 → h1` call／return，`h1 → h0` recursive call／recursive return | 新增 → `c039426dfc3e` | FR-015 |
| `expected-fixes004/` | `page0/inter-procedurals/2.graph.dot`（新增） | 全檔 | `bump` 的模型 13 節點：`bump` 為主體、L27 呼叫展開 `add`，`add` 內 L21 為回邊 | 新增 → `f9edebfc6ee8` | FR-015 |
| `expected-fixes004/` | `page0/inter-procedurals/2.dupairs.dot`（新增） | 全檔 | `c`：`(27,entry_a)`、`(27,(26,27))`、`(27,(26,30))`；`n`：`(entry_b,21)`；`t`：`(21,23)`（與 0 號模型同組 pair，標籤字母依節點順序不同） | 新增 → `2a3b853d5805` | FR-015、FR-016 |

### FR-016（Fable A1）

（Foundational 的差異記於本子表；對既有 `f()` 的影響註明 KI §16 後果段。）

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | Foundational：無差異（當時 fixture 中被連結呼叫的呼叫點，到達定義都是被呼叫端看得到、也不是其區域變數的定義，bypass 集合為空；KI §16 後果段的恢復見探針 `ki16b`、`ki16`，不在 golden fixture 中）。US3：L19–L23 `add` 連上後出現 1 筆繞過（`t`），見下表 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|
| `expected-fixes004/` | `page0/intra-pages/0.dupairs.dot`、`inter-page/0.dupairs.dot`、`page0/inter-procedurals/{0,1,2}.dupairs.dot` | 新增 `t` 列 | `(21,23)`：`add` 的 L20 `var t = n;` 跨過 L21 `this.bump()` 到 L22 `y = t;`——`t` 是 `add` 的區域變數，`bump` 看不到，經 bypass 由 CALL 直達 CALL RETURN；沒有 FR-016 時遞迴重入 `add` 的 `var t` 會蓋掉它 | 見 §7、FR-015 表 | FR-016 |

### FR-017

欄位 `f = new B();` 依 FR-018 class 放寬會連（`probes/field-new.js`，`tests/dujs/newcallsite.js`）；欄位 `f = this.m();` 由 US3 連結（`probes/us3-5.js`，
`tests/dujs/methodcalls.js`）。

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | 無差異（fixture 沒有值為 `new B()` 或 `this.m()` 的實例欄位；L15 `count = x;` 不是呼叫，其被 L35 連上記於 §7 表） |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

## §10（US4，FR-006）

fixture L42–L49 的 `h`：參數 `{p = a, q = p} = {}`（§17）與 `g = () => q`（§10），本體 `g();`。§10、§11、§17 的差異落在同一批檔案，
雜湊只在本表列一次；§11、§17 表列各自的差異位置。dot 行號＝fixture 行號＋1。

| case | 結果 |
|------|------|
| `expected/` | 無差異（預設值沒有函式：`title = ''`，R7） |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | 9 檔差異、新增 5 檔（`page0/intra-procedurals/11.*`、`page0/inter-procedurals/3.*`）、無刪除（31 → 36 個 .dot）。L46 的箭頭函式成為 `h` 的子 scope `$DOMAIN.$PAGE_0.h.$ANONYMOUS_FUN_7`（scope 樹中排在最後，`$ANONYMOUS_FUN_0`–`6` 與 intra-procedurals `0`–`9` 不推移，逐位元組相同）；L48 `g();` 連到它。inter-procedural 模型由 3 個變 4 個：0＝`add` 環模型（不變）、1＝`h` 的模型 `[h, h.$A7]`（新，先於頁面模型完成登記）、2＝頁面模型（原 1）、3＝`bump` 環模型（原 2，三檔與原 `2.*` 逐位元組相同）；頁面模型 66 → 72 節點、intra-page 68 → 74 節點 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|
| `expected-fixes004/` | `page0/intra-procedurals/11.graph.dot`（新增） | 全檔 | 箭頭函式 `h.$ANONYMOUS_FUN_7` 的 intra-procedural 模型：`entry`、`48`（`q`）、`exit` | 新增 → `56a246670a79` | FR-006 |
| `expected-fixes004/` | `page0/intra-procedurals/11.dupairs.dot`（新增） | 全檔 | 無 pair（`q` 不是箭頭函式自己的定義） | 新增 → `c0f3d8867fc8` | FR-006 |
| `expected-fixes004/` | `page0/intra-procedurals/10.graph.dot` | 全部節點與邊 | `h` 的 intra-procedural 模型：`43` → `46`（只求值 `{}`）、`44`（`p = a`）、`45`（`q = p`），見 §17；節點編號順延（`n128`→`n130` 起） | `a15271e49574` → `57877a56a9b8` | FR-008、FR-006 |
| `expected-fixes004/` | `page0/intra-procedurals/10.dupairs.dot` | `p` 列 | 見 §17 | `f582d269c7b3` → `a4b8ca856921` | FR-008 |
| `expected-fixes004/` | `page0/inter-procedurals/1.hierarchy.dot` | 全檔 | 原為頁面階層（移至 `2.hierarchy.dot`）；現為 `h` 的模型：`h0`＝`h`、`h1`＝`h.$A7`，`h0 → h1` call／return | `d336eb38142c` → `b6ede78c2c16` | FR-006 |
| `expected-fixes004/` | `page0/inter-procedurals/1.graph.dot` | 全檔 | 原為頁面模型（移至 `2.graph.dot`）；現為 `h` 的模型 11 節點：`entry_a`、`46`、`44`、`45`、`47`、`call`（L48 `g();`）→ `entry_b`、`48`、`exit_a` → `callReturn`、`exit_b` | `77c50f8c3fb1` → `c7e843bc8efc` | FR-006、FR-008 |
| `expected-fixes004/` | `page0/inter-procedurals/1.dupairs.dot` | 全檔 | 原為頁面 pair（移至 `2.dupairs.dot`）；現為 `h` 模型的 pair：`p`：`(44,45)`；`q`：`(45,entry_b)`（§18 殘留：箭頭函式 entry）、`(45,48)`；`g`：`(47,call)` | `41037642281e` → `2df60ae29939` | FR-006、FR-008 |
| `expected-fixes004/` | `page0/inter-procedurals/2.hierarchy.dot` | 全檔 | 原為 `bump` 環模型（移至 `3.hierarchy.dot`）；現為頁面階層（原 `1.hierarchy.dot`）多一個 `h11`＝`h.$A7`，`h10 → h11` call／return | `c039426dfc3e` → `a3c90364678e` | FR-006 |
| `expected-fixes004/` | `page0/inter-procedurals/2.graph.dot` | 全檔 | 原為 `bump` 環模型；現為頁面模型（原 `1.graph.dot`，66 → 72 節點）：`h` 段 `43`、`47`、`49` → `46`（無 exception 邊：`{}` 不會丟例外）、`44`、`45`、`47`、`call_m`（L48）→ `entry_l`、`48`、`exit_j` → `callReturn_i`；其後標籤字母順延（`h` 的 exit `exit_j`→`exit_k`、`callReturn_i`→`callReturn_j`、`log` 的 `call_m`→`call_n`、`callReturn_j`→`callReturn_k`、頁面 `exit_k`→`exit_l`），節點編號連帶 | `f9edebfc6ee8` → `a63d2e7f7762` | FR-006、FR-008 |
| `expected-fixes004/` | `page0/inter-procedurals/2.dupairs.dot` | `a`、`b`、`c`、`log`、`Counter`、`p`、`q`、`g` 列 | 原為 `bump` 環模型的 pair；現為頁面 pair（原 `1.dupairs.dot`），差異與 `page0/intra-pages/0.dupairs.dot` 相同（下列） | `2a3b853d5805` → `f4bbfec1faec` | FR-006、FR-007、FR-008 |
| `expected-fixes004/` | `page0/inter-procedurals/3.{hierarchy,graph,dupairs}.dot`（新增） | 全檔 | `bump` 環模型，與原 `2.*` 逐位元組相同（只因 `h` 模型先登記而序號 +1） | 新增 → `c039426dfc3e`／`f9edebfc6ee8`／`2a3b853d5805` | — |
| `expected-fixes004/` | `page0/intra-pages/0.graph.dot` | `h` 段節點及其後全部節點與邊 | 同 `page0/inter-procedurals/2.graph.dot` 的變更（68 → 74 節點） | `2c49191ebc8f` → `e0ceea19a82e` | FR-006、FR-008 |
| `expected-fixes004/` | `page0/intra-pages/0.dupairs.dot` | `g`、`q` 列與 `a`、`b`、`c`、`log` 的標籤（§10）；`Counter` 列（§11）；`p` 列與 `a` 的 `43`（§17） | §10：`g`：`(47,49)` → `(47,call_m)`（L48 `g();` 成為 CALL）；`q`：新增 `(45,48)`（箭頭函式本體讀 `q = p`）、`(45,entry_l)`（§18 殘留）；`b`／`c`／`log` 的 `call_m` → `call_n`（標籤順延）。§11、§17 見各節 | `41037642281e` → `f4bbfec1faec` | FR-006、FR-007、FR-008 |
| `expected-fixes004/` | `inter-page/0.graph.dot` | 同 intra-page graph | 同上（inter-page 展開圖，69 → 75 節點） | `472b7bc163d1` → `f60746548436` | FR-006、FR-008 |
| `expected-fixes004/` | `inter-page/0.dupairs.dot` | 同 intra-page dupairs | 同上（與 `page0/intra-pages/0.dupairs.dot` 逐位元組相同） | `41037642281e` → `f4bbfec1faec` | FR-006、FR-007、FR-008 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/paramsandnew.js` 約 144–163 行 | 「should not analyze a default value which is an arrow function again」→「should make a default value which is an arrow function a child scope」（註解同步）；`scopeNames()` 由 `[PAGE, PAGE.f]` 改為 `[PAGE, PAGE.f, PAGE.f.$ANONYMOUS_FUN_0]`，新增斷言 `f` 的子 scope 為該箭頭函式；其餘斷言（合成本體不可列舉、`g: L3 -> L5`、`d` 無 pair）不變 | FR-006 |
| `tests/dujs/paramdefaults.js`（新增） | acceptance US4 #1、#1'、#2、#5、#5'、#6 與 data-model §6 巢狀預設值順序 | FR-006、FR-008 |
| `tests/dujs/hierarchy.js`、`tests/dujs/expansion.js`（新增測試，既有斷言不變） | `addCallEdge` 的 `keepGenerateAtCallSite` 欄位（預設 false）；展開時呼叫點（CALL）保留 GEN、CALL RETURN 的 GEN／KILL 為空 | FR-007 |

## §11（US4，FR-007）

fixture L10–L14 `class Counter { static self = Counter; static { y = Counter; } ... }`：class 名稱改在 static 成員之前定義（class 節點 `call_b`
保留 GEN），`$A0`（L11）、`$A1`（L13）讀到它。只影響 dupairs，graph／hierarchy 結構不變。

| case | 結果 |
|------|------|
| `expected/` | 無差異（既有 fixture 沒有 static 成員，R4） |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | 4 檔的 `Counter` 列（頁面 pair），雜湊見 §10 表 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|
| `expected-fixes004/` | `page0/intra-pages/0.dupairs.dot`、`inter-page/0.dupairs.dot`、`page0/inter-procedurals/2.dupairs.dot`（原 `1.dupairs.dot`） | `Counter` 列 | 新增 `(call_b,12)`（L11 `static self = Counter;`）、`(call_b,14)`（L13 `y = Counter;`）、`(call_b,entry_c)`、`(call_b,entry_d)`（§18 殘留：兩個 static 成員的 entry）；原 `(call_b,call_d)`、`(call_b,37)`、`(call_b,call_j)` 不變 | 見 §10 表 | FR-007 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/classfields.js` 檔頭 1–12 行與約 111 行（原 94 行）測試 | 標題「should chain static members in source order and define the class after them」→「…define the class before them」，註解改為 class 名稱在 static 成員之前定義（R4）；斷言（`D: L2 -> L8`）不變；檔頭說明加一句 class 宣告名稱在 static 成員前定義、class 運算式的變數則否 | FR-007 |
| `tests/dujs/classfields.js`（新增測試） | acceptance US4 #3、#4；Edge cases `var B = class { static s = B; }`（無 `B: L1 -> …`）、`var B = class Q { static s = Q; }`（無 `Q`／`B` pair） | FR-007 |

## §17（US4，FR-008）

fixture L42–L45 `function h({ p = a, q = p } = {}, ...)`：外層預設值 `{}`（L45）只求值一次，`p = a`（L43）、`q = p`（L44）各定義一次。

| case | 結果 |
|------|------|
| `expected/` | 無差異（既有 fixture 沒有帶外層預設值的解構參數） |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | `h` 的 intra-procedural（`10.*`）與含 `h` 的各模型的 `p`、`a` 列及 `h` 段節點，雜湊見 §10 表 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|
| `expected-fixes004/` | `page0/intra-procedurals/10.dupairs.dot` | `p` 列 | `(entry,43)` → `(44,45)`：`q = p` 讀到 `p = a` 的定義（原為整個解構賦值一個節點，`p` 只讀到 entry 的參數定義） | 見 §10 表 | FR-008 |
| `expected-fixes004/` | `page0/intra-procedurals/10.graph.dot`、`page0/inter-procedurals/{1,2}.graph.dot`、`page0/intra-pages/0.graph.dot`、`inter-page/0.graph.dot` | `h` 段 | 一個 `43` 節點（`{p = a, q = p} = {}`）→ `46`（求值 `{}`，GEN 空）、`44`、`45` 三個節點，依原始碼前序 | 見 §10 表 | FR-008 |
| `expected-fixes004/` | `page0/intra-pages/0.dupairs.dot`、`inter-page/0.dupairs.dot`、`page0/inter-procedurals/2.dupairs.dot` | `p`、`a` 列 | `p`：`(entry_k,43)` → `(44,45)`；`a`：`(4,43)`、`(2,43)` → `(4,44)`、`(2,44)`（`a` 由 `p = a` 節點讀） | 見 §10 表 | FR-008 |

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/dujs/paramdefaults.js`（新增） | acceptance US4 #5、#5'、#6、data-model §6（見 §10 表）；既有 `tests/dujs/paramsandnew.js`「should initialize both the default of a pattern parameter and the defaults inside it」（`x: L2 -> L3`）不變、仍通過 | FR-008 |

## §12（US5，FR-009、FR-010）

CLI 只改參數解析、exit status 與輸出目錄名稱，分析與 .dot 內容不變；golden 比對的是 `out-*` 目錄內的 .dot（目錄名稱不參與比對），四個 case 零差異（US5-5），manifest 不動。

目錄名稱規則：基本名稱沿用 `out-<YYYY>-<MM>-<DD>-<H>-<M>-<S>`（執行開始時計算），以 `fs.mkdirSync`（非 recursive）建立；名稱已存在（`EEXIST`，含同秒並行的另一次執行）時依序改用 `<名稱>_1`、`<名稱>_2`……，不覆寫、不重用既有目錄。`OutputWriter.ROOT_OUTPUT_DIR` 改為 getter，回傳本次建立的名稱（建立前讀取拋錯），`report.html` 與其 `<img src="../<目錄>/...">` 都用實際名稱（contracts/cli.md §3）。

| case | 結果 |
|------|------|
| `expected/` | 無差異 |
| `expected-es2015/` | 無差異 |
| `expected-interprocedural/` | 無差異 |
| `expected-fixes004/` | 無差異 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|
| `tests/golden/golden.js` 約 145 行註解 | 「the CLI reports failures on stderr but still exits with 0」→「the CLI exits with a non-zero status on failure (2: usage, 1: read or analysis error) and reports it on stderr」（T070）；其前後斷言 `run.status.should.eql(0)`、`run.stderr.should.eql('')` 不變、仍成立（golden case 皆為成功執行） | FR-009 |
| `tests/dujs/cli.js`（新增） | contracts/cli.md §1 #1–#7（`cli.run` 單元層級，#7 以 stub 讓 `defuseAnalysisExecutor.initialize` 拋錯）、§3（`ROOT_OUTPUT_DIR` getter、`_1`／`_2`、`report.html` 引用實際目錄）、§4 US5-1…US5-5、SC-004、SC-005（子行程執行 `bin/dujs.js`） | FR-009、FR-010 |

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
