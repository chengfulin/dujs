# 文件核對（feature 008，SC-007；T068）

核對對象：`docs/known-issues.md`（KI）與 `README.md` 的 FR-011 (a)–(g)、FR-012 條目。行號為本檔建立時（T066、T067 完成後、未 commit）的工作樹行號。

| 項目 | 檔案位置 | 核對結果 |
|------|----------|----------|
| FR-011 (a)：§22 (1) 加「部分修正」說明（不標完全修正）；後續 KI 記選項 B、成本（`var.js:48`、`defuseanalyzer.js:77`／`:600`、`outputwriter.js:394-432`）與 all-uses 損失例 P25 | KI:789（§22 標題「(1) partly fixed」）、KI:837-850（§22 (1) **Partly fixed**…「This is not a full fix」）、KI:1855-1889（§51：選項 B、三處成本、P25 `o: L2 -> L3`／`o: L4 -> L5` 消失、損失分類） | 符合 |
| FR-011 (b)：§23 標為已修正（保留原描述、前加修正說明），記 `var` 不放寬（D002） | KI:1003（§23 標題「fixed by `008-…`」）、KI:1005-1030（**Fixed** 說明、P5、MDN `evilBall`、限制清單；KI:1019 `var` is not relaxed (decision D002)）、KI:1032 起「The original description follows」保留原文 | 符合 |
| FR-011 (c)：§22 (5) 寫成「除 §38 的 `finally` 情形外已修」，附查核範圍與 FR-013 修正（P38–P40）；§38 補 P21、P23、P24 三種形態與窄修候選 | KI:939-962（§22 (5)：查核範圍 probes 56＋golden 4＋MDN 32，四層模型，92 程式、569 模型；允許清單 18 項；FR-013 `findDUPairs`，P38／P40 `f: entry -> L5>L6:T`／`L5>L8:F`、P39 `g: entry -> L8>L9:T`／`L8>L11:F` 消失）、KI:789（§22 標題補「(5) fixed except for §38」）、KI:1432-1467（§38 Note：P21／P23／P24 形態、pair、模型、見證 `nonExceptionalEntries: 0`，與 `tests/dujs/cases/reachability-allowlist.json` 18 項一致；KI:1465-1467 窄修候選） | 符合 |
| FR-011 (d)：測試 helper 對無行號節點標 `Lnull`（P18） | KI:2008-2019（§56：`nodeLabel`、LOOP 節點無行號；P18 intra-page `c: L1 -> L8>Lnull:F`、inter-procedural `c: L1 -> L8>exit:F`；`tests/dujs/expansion.js:127`、`tests/dujs/splitcallnodes.js:251`、`tests/dujs/reachability.js` 釘住） | 符合 |
| FR-011 (e)：§22 (4) 補 D004 凍結的 `localStorage` 缺口 | KI:918-936（§22 (4) Note D004：`localStorage[k]` 不讀 `k`（s4）；`=`（s1）、`.a.b`（s8）、解構（s5）不讀 `localStorage`；解構（s5）與 `for…in`（s6）有定義卻不是儲存定義節點；`x = (localStorage.k = 1)`（s9）不是儲存定義節點；另記 D013 呼叫根的鏈不豁免） | 符合 |
| FR-011 (f)-1：§22 標題與開頭 feature 摘要段落補上本 feature | KI:789（§22 標題）、KI:65-74（開頭摘要 Feature `008-…` 段）、KI:1849-1853（「Found by feature `008-…`」章首） | 符合 |
| FR-011 (f)-2：本 feature 的行為變更、限制與新發現新增章節 | KI:1904-1949（§53：外溢 P29–P32、007 防護解除 `o.p = 1, o.m()`、D013 新讀取 P33／P42；golden 68 筆、MDN 547 筆與類別分布；限制：`var` 不放寬、宣告與賦值分開不放寬、忽略執行順序 P34）、KI:1950-1984（§54：D014 虛擬例外邊實測無可到達效果、D022 模型編號位移、D023／D024 摘要與列消失、T026 字面錯誤 `if (h(a))` 的 `a` 是 c-use）、KI:1890-1903（§52：008 差異工具限制，D025 集合語意） | 符合 |
| FR-011 (g)：巢狀賦值通用缺口（D012），形態 8 種與實例 `tests/golden/fixtures/es2015/app.js:22` | KI:1985-2007（§55：GEN 只在右側直接是賦值／更新且 develop 定義左側時遞迴（develop `defuseanalyzer.js:608-611`、008 `:643-647`）；`y = (x = 5, 3)`、`y = [x = 6]`、`y = f(x = 7)`、`[y] = x = [8]`、`o.t = [n++]`、`this.p = x = 1`、`f().p = x = 2`、`o.a.b = x++`；`nextId++` 實例；008 維持 `o.p = x = 1`、`o.p = x++` 仍定義 `x`） | 符合（形態另以 `tests/helpers/analyze.js` 實跑確認不定義內層變數） |
| FR-012-1：Limits 段「assigning to `a.b` defines `a`」改寫為成員賦值是物件變數的使用、不追蹤屬性層級資料流 | README.md:188 | 符合 |
| FR-012-2：解析規則加入函式中 `o.m()` 放寬與限制（只 `const`／`let`、宣告與賦值分開不放寬、忽略執行順序） | README.md:176 | 符合 |
| FR-012-3：L173 兩句過期敘述（`o.p = 1` defines `o`；`o.m()` in a function … (known-issues §23)）刪除或改寫 | README.md:168（`o.m()` 解析規則，無 property assignment 句）、README.md:173（Not connected：改為「mixed」與「the rule for instances (below) does not apply」） | 符合 |
| SC-007 過期敘述 grep：`grep -n "defines <code>a</code>\|defines <code>o</code>\|known-issues §23)" README.md` | README.md | 無輸出（grep exit 1），符合 |

## 附：008 工具修改紀錄（T069）

`git log --oneline e3fe77f..HEAD -- specs/008-property-defs-method-calls/tools`（`e3fe77f` 為 T011 首次 commit）只有 `70f2214`（US2），改 `tools/diffcheck.js`、`tools/diffcheck.test.js`，即 D025（使用者同意，記於 tasks.md「analyze 裁決」）；工作樹中 tools/ 無未 commit 修改。
