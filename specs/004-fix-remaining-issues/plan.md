# Implementation Plan: 修正其餘已知問題（§7、§10–§12、§14、§15、§17、§20、§21）

**Branch**: `004-fix-remaining-issues` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-fix-remaining-issues/spec.md`

## Summary

九個已知問題的修正，全部在既有架構（003 的階層＋展開）上做局部改動：決策條件改以「條件模式」判定 p-use（引數為 c-use）；新模組
`callresolver.js` 依靜態結構把 `f()`、`new` 敘述與四種方法呼叫解析成被呼叫 scope 陣列（統一的嚴格規則，callee 為 class 時放寬到全頁唯一的
class 定義，FR-018），沿用既有的被呼叫端串接；呼叫環以階層的**回邊**表示
（建模以 DFS 堆疊判定、開放模型不登記），取代「遇環丟錯」；繞過規則在分析時把被呼叫端看不到（或屬於其活動紀錄）的定義從 CALL 送到
CALL RETURN；class 宣告的名稱定義留在 class 節點；參數預設值中的函式成為 scope、外層預設值只求值一次；CLI 以 `util.parseArgs` 重寫並保證
輸出目錄唯一；CALL RETURN 標籤帶分支路徑；for-in／for-of 無 range 前驅改以支配關係判定。新增修正前產生的 golden fixture，逐項記錄差異。
設計理由見 [research.md](./research.md) R0–R13，驗收預期見 [contracts/acceptance.md](./contracts/acceptance.md)。

## Technical Context

**Language/Version**: JavaScript（CommonJS，`lib/` 維持 ES5 風格），Node.js ≥ 24

**Primary Dependencies**: espree ^11.2.0、walkes ^0.2.1；**無新增依賴**。CLI 參數解析改用 Node 內建 `util.parseArgs`（使用者選擇）。
LGPL 衍生檔（`lib/esgraph/index.js`、`dot.js`、`lib/analyses/index.js`）不修改；新模組 `lib/dujs/cli.js`、`lib/dujs/callresolver.js` 為 MIT。

**Storage**: N/A（CLI 輸出 `.dot`／`.png`／`report.html`）

**Testing**: mocha ^12＋should ^13；fast-check ^4.10.2；golden 回歸 `tests/golden/golden.js`＋`manifest.json`（新增 case `expected-fixes004/`）；eslint ^10；c8。
**基線**（`ff45928`）：`npm test` **933 passing**、`npm run lint` 0 錯誤、`eslint-suppressions.json` **119** 筆（36 檔）。

**Target Platform**: Node.js ≥ 24（macOS／Linux）

**Project Type**: library＋CLI（`bin/dujs.js`）

**Performance Goals**: 無新目標；有環時每個環上 scope 多建一個模型（線性於環長），`npm test` 維持秒級

**Constraints**: 既有三個 golden case 預測零差異，任何差異須對應到某項修正並記入 `golden-diff.md`；不新增 lint 抑制；不改 LGPL 檔；既有測試只在
golden-diff「單元測試期望」列出的範圍內修改。已知會改的既有測試：`tests/dujs/usedexpressions.js` 約 139、145 行（`findUSESet` characterization，
`o`、`i` 由 c-use 變 p-use，US1）與約 273、279 行（read `'walk'` → `'p-use'`，US1）；`tests/dujs/es2015.js` 約 407 行（`o?.a?.b ?? t` 的
`o: L4 -> L5` 變 p-use，US1）；`tests/dujs/paramsandnew.js` 約 148 行（斷言預設值箭頭函式不是 scope，R7 後多出 `f.$ANONYMOUS_FUN_0`，US4）；
`call cycle` 測試改斷言 `model cycle`（US3）；`tests/dujs/classfields.js` 檔頭 001 D7 說明（US2）與 92 行測試標題（US4）；`tests/golden/golden.js`
約 145 行註解（US5，「exits with 0」）

**Scale/Scope**: 6 個 user story、18 條 FR；新增 2 個 lib 模組，修改約 12 個 lib 檔與 `bin/dujs.js`，刪除 `lib/dujs/inputreader.js`

**tech-standards**：`.specify/memory/baseline/tech-standards.md` 針對服務後端／前端，對本 CLI／函式庫屬「不適用」，非偏離；無需 §CP-6 例外。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 條款 | 檢查 | Phase 0 前 | Phase 1 後 |
|------|------|-----------|-----------|
| §CP-1 可追溯 | 每項設計對應 FR／USR／Clarifications；探針發現與 spec 不一致的兩處（U1、U2）與仲裁發現的 U3 交使用者裁決，不自行改 spec | PASS | PASS（U1–U3 已裁決（A／A／(a)）；analyze 裁決 1、2 取代 U2 並新增 FR-018，已更新 spec／plan） |
| §CP-2 機密 | 不涉及 | PASS | PASS |
| §CP-3 設定不硬編碼 | 輸出目錄仍為 cwd 下自動命名（既有行為）；`UPDATE_GOLDEN`、`FC_*` 沿用環境變數 | PASS | PASS |
| §CP-4 核心邏輯測試 | 每個驗收情境一個自動化測試（acceptance.md）；回邊、開放模型、bypass、解析器、CLI 各有單元測試；新 golden case | PASS | PASS |
| §CP-5 審查 | PR 目標 `develop`，人為核准 | PASS | PASS |
| §CP-6 例外 | 無例外；`util.parseArgs` 為內建、非新依賴 | PASS | PASS |
| §GV 最小審查 | golden-diff 100% 對應（SC-003） | PASS | PASS |
| 【參考】§TR-7 ISP | 呼叫解析依「形式（7 種）× 解析結果（函式／class／無）× 位置（頁面／函式內／class 成員）」各取代表；CLI 依 cli.md §1 的 8 類參數 | — | 採用 |
| 【參考】§TR-8 影響範圍 | 見下節 | — | 已宣告 |

無未說明的違規，Complexity Tracking 不需填寫。

## spec 指定 plan 必答事項

| 項目 | 回答 | 詳見 |
|------|------|------|
| 1. 驗收情境的分行程式與完整預期（M2） | 50 個探針程式（含 golden fixture 草稿）＋修正前實跑輸出；每個情境的修正後完整 pair 清單；US4-5 以節點數（3→5）與 GEN 斷言 | `probes/`、`probes/current-output.txt`、[acceptance.md](./contracts/acceptance.md) |
| 2. FR-015 呼叫環 | 階層加**回邊**（`back: true`，目標為 intra-procedural 模型，只取 entry／exit 原件）；建模以 DFS 堆疊＋本次 `built` 判定，跨根只重用無回邊模型；開放模型不登記不展開；`hierarchy.dot` 以 `recursive call`／`recursive return` 畫回邊；003 的「遇環丟錯」改為「開放階層／模型物件環才丟錯」；m↔n 時 `m`、`n`、頁面各一個封閉模型，完整預期見 acceptance FR-015 | research R5、[model-api.md](./contracts/model-api.md) §1–§2、[output.md](./contracts/output.md) §2 |
| 3. FR-016 繞過規則 | 展開時每條呼叫邊記 bypass（CALL 複本→CALL RETURN 複本＋被呼叫 scope）；分析時 CALL RETURN 的有效輸入另加「被呼叫端看不到或屬於其自身」的定義；不加圖邊、不改 LGPL worklist；既有 golden 預測零差異，連帶修正 KI §16 後果段 | research R6、model-api §3–§4 |
| 4a. FR-007 static 順序 | 呼叫邊旗標 `keepGenerateAtCallSite`：class 宣告節點的 GEN 留在 class 節點（CALL），再進 static 成員 | research R4 |
| 4b. FR-001 p-use／引數 c-use | 決策條件以 `read: 'p-use'` 交給 `findUSESet` 的條件模式：全部 p-use，呼叫與 `new` 的引數子樹 c-use；case discriminant 同規則；其他節點規則不動（保留 §18） | research R1 |
| 4c. FR-012 支配關係 | 無 range 的前驅：從 entry 不經 loop 節點不可達才算本體內；有 range 不變 | research R11 |
| 4d. FR-011 標籤 | line 版 `callReturn (<line>:<path>)`、loc 版 `callReturn (L<line>:C<col>:<path>)`；未拆分不變 | [output.md](./contracts/output.md) §1 |
| 4e. FR-009／FR-010 CLI | 參數文法表（help 優先、未知選項、`-js` 前有檔、`-js` 後無檔、`-js -js`）；exit 0／2（用法）／1（執行）；先讀完檔才建目錄；`mkdirSync`＋`_<n>` 唯一化；失敗刪目錄 | [cli.md](./contracts/cli.md) |
| 5. FR-013 golden | 新 fixture `fixes004/app.js`（§7、§10、§11、§15、§17、§20、§21、FR-015、FR-016）於 Setup 以修正前程式產生 expected 與 manifest；各 story 明確更新雜湊；`golden-diff.md` 依 KI 節次分節、每節列四個 case | [golden-verification.md](./contracts/golden-verification.md) |
| 6. 實作順序與相依 | 見下「實作順序」 | — |

## 關鍵設計

1. **條件模式**（R1）：`usedexpressions` 標示決策條件為 `'p-use'`；`findUSESet` 在此模式下以引數深度決定 c-use，不再在 handler 結束時把 `isPUse` 歸零。
2. **呼叫解析與建模分離**（R2）：`callresolver.calleeScopesOf` 回傳依序的被呼叫 scope（含 `f()`，`findFunctionDefinitionFromReachInSet` 的邏輯搬入並改為
   嚴格規則）；`modelbuilder` 不知道語法形式，只串接。「解析變數」要求至少一筆且全部指向同一函式／class（FR-018）；reachIns 沒有定義時，callee 為 class
   且全頁只有一筆 class 定義才連（analyze 裁決 1），函式維持不連（H3）。
3. **回邊而非複製**（R5）：flat graph 每個原件一份，遞迴只多 CALL／CALL RETURN；每個 DFS 的 `built` 保證每個呼叫點原件在一個扁平圖中只有一條呼叫邊。
4. **繞過在分析層**（R6）：bypass 記錄存在模型、由 `doAnalysis` 使用；被呼叫端會改寫的定義照常經由被呼叫端。
5. **golden 先鎖修正前**（R12）：新 fixture 的每一處差異都能對到一項修正。

## 變更影響範圍（§TR-8，參考）

| Story | 檔案 | 變更 | FR |
|-------|------|------|----|
| Setup | `tests/golden/fixtures/fixes004/app.js`、`tests/golden/expected-fixes004/`（新）、`tests/golden/golden.js`、`manifest.json`、`golden-diff.md`（新） | 修正前 golden | FR-013 |
| Foundational | `lib/dujs/expansion.js`（bypasses）、`lib/dujs/model.js`（`setCallBypasses`／`callBypassOf`）、`lib/dujs/modelbuilder.js`（`setFlatGraphFromHierarchy`）、`lib/dujs/defuseanalyzer.js`（`doAnalysis`、`_bypassFilter`）；測試 `tests/dujs/bypass.js`（新） | 繞過規則 | FR-016 |
| US1 | `lib/dujs/usedexpressions.js`、`lib/dujs/defuseanalyzer.js`（`findUSESet`）；`tests/dujs/usedexpressions.js`（read 期望約 273、279 行；`findUSESet` characterization 約 139、145 行 `o`、`i` 改 p-use）、`tests/dujs/es2015.js`（約 407 行 `o: L4 -> L5` 改 p-use）、`tests/dujs/conditionpuse.js`（新） | 條件模式 | FR-001 |
| US2 | `lib/dujs/callresolver.js`（新：class 索引、`new`、`f()` 的嚴格規則與 class 放寬）、`lib/dujs/scopetree.js`（欄位合成 return 的 `dujsFieldInitializer` 標記）、`lib/dujs/modelbuilder.js`（改用 resolver，`findFunctionDefinitionFromReachInSet` 移除或改為委派、登記條件）；`tests/dujs/newcallsite.js`（新）、`tests/dujs/classfields.js`（檔頭 D7 說明） | `new` call-site、呼叫解析規則 | FR-002、FR-003、FR-017、FR-018 |
| US3 | `lib/dujs/callresolver.js`（方法呼叫）、`lib/dujs/hierarchy.js`（回邊、`openTargetsOf`、`hasBackEdge`）、`lib/dujs/expansion.js`（回邊順序、錯誤訊息）、`lib/dujs/modelbuilder.js`（DFS 守衛、`reachInsForHandlerLookup` 優先採頁面為根的模型）、`lib/dujs/hierarchydot.js`（回邊）；`tests/dujs/{methodcalls,callcycles}.js`（新）、`tests/dujs/{expansion,hierarchy,hierarchydot}.js`（新增案例；`call cycle` 測試改斷言 `model cycle`）、`tests/dujs/modelbuilder.js`（handler 查找既有測試確認） | 方法呼叫、呼叫環、環上 handler | FR-004、FR-005、FR-015、FR-016（US3 情境）、FR-017、FR-018 |
| US4 | `lib/dujs/scopetree.js`（走訪 params）、`lib/dujs/modelbuilder.js`（`collectParameterDefaults`、FR-007 旗標）、`lib/dujs/hierarchy.js`／`expansion.js`（`keepGenerateAtCallSite`）；`tests/dujs/paramdefaults.js`（新）、`tests/dujs/classfields.js`（static 測試標題）、`tests/dujs/paramsandnew.js`（約 148 行：預設值箭頭函式改為 scope `f.$ANONYMOUS_FUN_0`） | 參數與 class 名稱 | FR-006、FR-007、FR-008 |
| US5 | `lib/dujs/cli.js`（新）、`bin/dujs.js`、`lib/dujs/outputwriter.js`（`createRootOutputDirectory`、`ROOT_OUTPUT_DIR` getter）、`lib/dujs/reportgenerator.js`、刪除 `lib/dujs/inputreader.js`；`tests/dujs/cli.js`（新）、`tests/golden/golden.js`（註解「exits with 0」更新） | CLI | FR-009、FR-010 |
| US6 | `lib/dujs/cfggraphconverter.js`、`lib/esgraph/branchsplitter.js`；`tests/dujs/cfggraphconverter.js`（新或既有檔加案例）、`tests/esgraph/branchsplitlooppred.js`（新） | 標籤、支配關係 | FR-011、FR-012 |
| Polish | `docs/known-issues.md`、`README.md`、`specs/003-hierarchical-models/{contracts/model-api.md,data-model.md}`（修訂註記）、`golden-diff.md` 定稿 | 文件 | FR-013、FR-014 |

**明確不受影響**：LGPL 衍生檔（`lib/esgraph/index.js`、`dot.js`、`lib/analyses/`）；只有一筆函式定義到達時 `f()` 的連結結果（解析搬到 `callresolver`
並改為嚴格規則，只有混合定義的 `f()` 改為不連，FR-018）；intra-page／inter-page 的建模（LOOP、storage；事件 handler 的查找依 U3＝(a) 優先採頁面為根的
模型，US3）；`findGENSet`（除 R8 的初始化節點輸入外）與 §18 的 entry 走訪；`branchsplitter` 的有 range 判定；
§16 的「呼叫在決策前」順序與 §18（stage 2）。

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-remaining-issues/
├── plan.md              # 本檔
├── research.md          # Phase 0：R0（探針與發現）–R13
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1：Setup（新 golden）、各 story 驗證、CLI 手動檢查
├── contracts/
│   ├── acceptance.md          # 每個驗收情境的程式、修正前、修正後完整預期
│   ├── model-api.md           # hierarchy／expansion／model／analyzer／resolver 介面（修訂 003）
│   ├── cli.md                 # 參數文法、exit status、輸出目錄、US5 情境
│   ├── output.md              # CALL RETURN 標籤、hierarchy.dot 回邊
│   └── golden-verification.md # 新 golden case、manifest 更新規則、golden-diff 格式
├── probes/              # 探針程式（run.js、50 個 .js、current-output.txt）
├── golden-diff.md       # implement 期間建立（Setup 起）
└── tasks.md             # Phase 2（/speckit-tasks）
```

### Source Code (repository root)

```text
bin/dujs.js                      # 改：呼叫 lib/dujs/cli.js，設定 process.exitCode
lib/dujs/
├── cli.js                       # 新（US5）
├── callresolver.js              # 新（US2、US3）
├── modelbuilder.js              # 改（Foundational、US2、US3、US4）
├── hierarchy.js                 # 改（US3、US4）
├── expansion.js                 # 改（Foundational、US3、US4）
├── hierarchydot.js              # 改（US3）
├── model.js                     # 改（Foundational）
├── defuseanalyzer.js            # 改（Foundational、US1）
├── usedexpressions.js           # 改（US1）
├── scopetree.js                 # 改（US2、US4）
├── cfggraphconverter.js         # 改（US6）
├── outputwriter.js、reportgenerator.js  # 改（US5）
└── inputreader.js               # 刪（US5）
lib/esgraph/branchsplitter.js    # 改（US6，MIT）
tests/golden/{golden.js, manifest.json, fixtures/fixes004/, expected-fixes004/}
tests/dujs/{bypass,conditionpuse,newcallsite,methodcalls,callcycles,paramdefaults,cli,cfggraphconverter}.js   # 新（名稱 tasks 定案）
tests/esgraph/branchsplitlooppred.js                                                                       # 新
```

**Structure Decision**: 沿用既有單一專案結構。依賴方向：`modelbuilder → callresolver, hierarchy, expansion`；`callresolver → scopetree（只讀）`；
`defuseanalyzer → model`（讀 bypass）；`bin → cli → inputs／outputwriter／reportgenerator／defuseanalysisexecutor`。

## 實作順序與 story 相依（每階段結束 `npm test`、lint 全綠，golden 差異已記錄）

```
Setup ─► Foundational(FR-016) ─┬─► US1 ─────────────┐
                               ├─► US2 ─► US3 ───────┤
                               ├─► US4 ──────────────┼─► Polish
                               ├─► US5 ──────────────┤
                               └─► US6 ──────────────┘
```

1. **Setup**：新 fixture、golden case、修正前 expected 與 manifest、`golden-diff.md` 骨架；探針複本放 `tests/dujs/cases/probes004/`（測試讀取用）。
2. **Foundational（FR-016）**：bypass 的展開、模型、分析三處＋單元測試（`byp-1`、`ki16`、`ki16b`）。放在 US2／US3 之前，因為方法與 constructor 的連結
   一接上就需要它，否則 US3 的驗收（`byp-3`、`cyc-3`）與 SC-006 無法成立。
3. **US1**（P1，獨立）：只動 `usedexpressions`／`findUSESet`。
4. **US2**（P1）：`callresolver` 的 class 索引與 `new`；`f()` 解析搬入並改嚴格規則、class 放寬（FR-018）；FR-017 的 `new B()` 部分（依 analyze 裁決 1 會連）。
5. **US3**（P2，**依賴 US2**）：方法呼叫解析（`new A().m()` 需要 US2 的建構連結與 class 索引）→ 回邊與 DFS 守衛 → hierarchy.dot。
6. **US4**（P2，獨立；與 US3 都改 `modelbuilder`／`hierarchy`／`expansion`，同時進行時需協調檔案）：params scope → 參數預設值 → FR-007 旗標。
7. **US5**（P2，獨立，檔案不重疊）。
8. **US6**（P3，獨立，檔案不重疊）。
9. **Polish**：known-issues、README、003 文件註記、golden-diff 定稿與 manifest 核對。

可並行：US1、US5、US6 與 US2→US3 鏈的檔案不重疊；但 `expected-fixes004/` 與 `manifest.json` 是共用資源，golden 更新須序列化（每次只有一個 story 寫入）。

## 使用者裁決紀錄

| # | 事項 | 選項 | 建議 |
|---|------|------|------|
| U1 | US4-1 以 KI §10 原程式（本體 `return g();`）驗收，但 `return g();` 依既有規則不是呼叫敘述，「`d` 有 pair」「`g();` 被連結」不可能成立（research P1） | A：US4-1 程式改為本體 `g();`（`probes/us4-1b.js`），原程式另列一條只斷言「箭頭函式是 scope」；B：保留原程式，刪除 d 的 pair 與連結的敘述；C：把 `return f();` 也納入 call-site（超出範圍，影響既有 golden） | **A**（使用者裁決：A；另把 `return f()` 當 call-site 記入 known-issues 後續項目） |
| U2 | FR-017 的 `f = new B();`：欄位初始化式的 scope 看不到外層 `B`，依 H3 永遠不連，FR-017 的 `new B()` 部分形同無效（research P2） | A：保留 FR-017 文字、補一句「依 H3 實際不會連結」，README 註明，測試斷言不連；B：對欄位初始化式例外地以 scope 鏈找 class 宣告（偏離 H3）；C：FR-017 刪除 `new B()` | **A**（使用者裁決：A）；**已由 analyze 裁決 1 取代**：callee 為 class 時放寬，`f = new B();` 會連結，測試斷言連結 |
| U3 | （仲裁 F1）互遞迴／自我遞迴時，環上 scope（如 N）以自己為根的模型登記在頁面模型**之後**；`reachInsForHandlerLookup`（`lib/dujs/modelbuilder.js` 401–409 行）取「最後一個有結果的 inter-procedural 模型」，因而拿到非頁面為根的模型，環上方法內註冊的事件 handler 接不上 intra-page。仲裁實驗（scratchpad `exp/h1.js` 等）：有 `this.m()` 時 intra-page 21 節點、handler 未接上；無環版 23 節點接上；查找改為優先採頁面為根的模型後 24 節點接上 | (a) handler 查找優先採以頁面為根的 inter-procedural 模型（原型已驗證，不影響模型清單順序與 golden）；(b) 調整環上 scope 額外根模型的登記順序（會改 `interProceduralScopes()` 順序與 acceptance FR-015 的 inter 索引）；(c) 接受現狀並列入 README 限制 | **(a)**（使用者裁決：(a)） |
| A1（analyze H1） | 函式／方法／constructor／欄位／handler 內的 class 呼叫依 H3 一律不連 | 只對 class 放寬（全頁唯一定義是 class 宣告或 `const`／`let` 綁定的 class）；維持 H3 | **放寬**（使用者裁決）；Fable 原型 `RELAX=i`：只改 callresolver 約 20 行，三個 golden 零差異 |
| A2（analyze F1） | `f()` 與 `new F()`／方法呼叫的解析規則不一致 | 統一為嚴格規則；維持現狀 | **統一**（使用者裁決）；Fable 原型 `FSTRICT`：既有測試與三個 golden 無變化，混合定義的 `f()` 改為不連 |

其餘 plan 自行決定、無需裁決但請 review：case discriminant 一併套用條件模式（R1）；`--help` 優先於其他參數錯誤、用法錯誤 exit 2（R10）；
§16 後果段由 FR-016 修正並在 known-issues 加註（P4）；`new F().m()`（F 為函式）只連 `F`（R2）。

## 已知風險

| # | 風險 | 影響 | 緩解 |
|---|------|------|------|
| 1 | 手推的修正後預期有誤（exception 邊、§18 entry 殘留） | 測試與實作互相遷就 | acceptance 開頭的規則：先查推導再決定改誰，改預期須 PR 說明 |
| 2 | DFS 重建造成同一呼叫點兩條邊 | 重播重複、圖錯亂 | `built` 不變條件＋單元測試：頁面同時呼叫環上的 `m` 與 `n`；展開時斷言每個呼叫點原件至多一條邊 |
| 3 | bypass 與 worklist 收斂互動（CALL RETURN 不是 CALL 的後繼） | 少算或不收斂 | 轉移函式以 `list` 推入；單元測試含遞迴（`cyc-3`）與串接呼叫；比對有／無 bypass 時其他 pair 不變 |
| 4 | 既有 golden 出現未預測差異 | SC-003 | 每個 story 結束即跑 golden；差異逐項判讀，非修正必然結果即回頭修實作 |
| 5 | `ROOT_OUTPUT_DIR` 改為建立後才有值 | 依賴載入時常數的程式或測試失敗 | 只有 `outputwriter`／`reportgenerator` 使用（已查）；建立前讀取拋錯，測試鎖定 |
| 6 | 條件模式改到 for-in／for-of head 或 entry 走訪 | 既有 golden 變動 | 條件模式只由 `'p-use'` 啟動，`'walk'` 規則不變；golden 零差異把關 |
| 7 | class 放寬不看執行順序（呼叫在 class 宣告之前也連）、`f()` 與 `new A()` 在函式內不對稱 | 使用者誤讀 | README 明載；`probes/fn-new-early.js` 鎖定行為 |

## Complexity Tracking

無違規需說明。
