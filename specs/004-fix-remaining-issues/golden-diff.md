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
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

| case | 檔案 | 差異位置 | 內容 | 舊 sha256（前 12 碼）→ 新 | FR |
|------|------|----------|------|---------------------------|----|

### 單元測試期望

| 檔案 | 變更 | FR |
|------|------|----|

### FR-018（呼叫規則統一與 class 放寬，analyze 裁決 1、2）

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

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

| case | 結果 |
|------|------|
| `expected/` | 待填 |
| `expected-es2015/` | 待填 |
| `expected-interprocedural/` | 待填 |
| `expected-fixes004/` | 待填 |

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
