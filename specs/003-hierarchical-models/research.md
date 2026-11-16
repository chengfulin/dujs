# Research：階層式模型結構（重構 stage 1）

**Feature**: `003-hierarchical-models` | **Date**: 2026-11-16 | **Plan**: [plan.md](./plan.md)

本檔記錄 Phase 0 的設計決策。每項以「Decision／Rationale／Alternatives considered」記錄；現況描述皆以
`develop` merge `bf07818`（= 本分支 `03bc6a5` 的 `lib/`、`bin/`、`tests/`，`git diff bf07818 HEAD -- lib bin tests package.json` 為空）為準。

## 現況要點（設計的前提）

1. **worklist 只沿邊走**：`lib/analyses/index.js` 從 `cfg[0]` 出發、以 `node.prev`／`node.next` 取前驅與後繼，**不看**
   `graph[2]`；`findDUPairs` 只走 `graph[2]`。所以模型的分析結果由「從 entry 可達的邊」決定，節點陣列只決定輸出與 pair 的範圍。
2. **dot 以物件身分與陣列位置輸出**：節點編號＝`graph[0].cfgId`＋陣列位置；單一連線邊以 `nodes.indexOf(target)` 取端點（不過濾）；
   多重連線（return、onEvent、loadStorage）只輸出目標在陣列內者。已以腳本確認：golden 與新 fixture 的每個 `graph.dot` 都沒有指向陣列外
   節點的邊。
3. **共用節點被逐層改動**：inter-procedural 建模把非決策呼叫點改型為 CALL、GEN／KILL 搬到 CALL RETURN、出邊搬移，或在決策節點前插入
   CALL／CALL RETURN 並改接前驅的邊；intra-page 把走向頁面 exit 的邊改接到 LOOP；inter-page 加 loadStorage／saveStorage 邊。
4. **改動的全域次序會決定鄰接順序**：同一被呼叫函式的 exit 的 `return` 陣列與 `next` 陣列，順序是「各呼叫邊被套用的全域次序」；
   `moveOutgoingEdges`／`redirectEdges` 以 disconnect＋connect 實作，會改變目標節點 `prev` 的順序。這些順序影響 dot 的多重連線輸出順序
   與 worklist 的處理順序（Set 以插入順序迭代）。
5. **輸出時機**：`bin/dujs.js` 每階段「建模→分析→寫檔」。intra-procedural 的 .dot 在任何改動前寫出；inter-procedural 的 .dot 在所有
   inter-procedural 模型建完並分析後寫出（此時只多了被呼叫函式 exit 指向其他模型 CALL RETURN 的 `return` 邊，dot 會過濾）；intra-page
   的 .dot 在 inter-page 加 storage 邊之前寫出。
6. **reach-in 的讀取**：建 inter-procedural 時（`getInterProceduralModelStartFromTheScope`）所有 inter-procedural 模型都尚未分析，讀到的
   `node.reachIns` 一律是 intra-procedural 結果；建 intra-page 找事件處理器時（`getRegisteredEventHandlerCallback`）讀到的是「最後一個
   走訪到該節點的分析」——inter-procedural 模型依加入次序分析，被呼叫者的模型先於呼叫者加入（遞迴先返回），所以是「包含該節點、最後
   分析的 inter-procedural 模型」，沒有則是 intra-procedural。
7. **`scope.lastReachIns`**：`doAnalysis` 每次轉移函式呼叫都覆寫；`lib/`、`tests/`、`bin/` 皆無讀取者。
8. **`findKILLSet`**：`lib/` 與 `tests/` 皆無呼叫者（known-issues §9 所說的「留給舊測試」已不成立）。

---

## R1 扁平圖的產生方式：複本＋依全域序重播操作

- **Decision**：上層模型的扁平圖由 `expand(model)` 純函式從階層產生：
  1. 依階層以現況的串列演算法（見 R4）算出節點陣列，元素是**原件**（intra-procedural 節點或結構節點樣板，見 R3）；
  2. 為陣列中每個相異原件建立一個**複本**（R2），複本先照抄原件在 intra-procedural 圖中的邊（樣板沒有邊）；
  3. 蒐集此模型子樹內的全部**操作**（呼叫邊、LOOP 掛接、事件邊、storage 邊；去重），依建立時取得的**全域序號 `seq`** 排序，在複本上
     依序套用與現況相同的改動程式（`redirectEdges`、`moveOutgoingEdges`、`connect`、改型、GEN／KILL 搬移）；
  4. 扁平圖＝`[entry 複本, exit 複本, 陣列.map(複本)]`。
  intra-procedural 模型不展開，扁平圖就是它自己的圖（原件）。
- **Rationale**：
  - 改動程式原封不動地作用在複本上，因此「節點種類、邊種類、每個節點前驅／後繼的鄰接順序、節點陣列順序」逐一與現況相同；原件從
    不被上層碰到（FR-001、FR-002）。
  - 一律從原件展開（而不是複製子模型的扁平圖）才能讓同一扁平圖中「同一原件只有一個複本」：例如根模型同時經 `f` 的子模型與直接呼叫
    到達 `g` 時，兩條路徑必須接到同一份 `g` 的節點（context-insensitive，spec Edge Cases）。
  - 必須用全域序而不是「逐模型遞迴」的次序：若函式 `m` 先呼叫 `a` 再呼叫 `b`，`b` 宣告在 `m` 之前（`buildInterProceduralModels` 依 scope
    次序掃描，`b` 的子模型因此比 `m` 的模型更早建立），且 `a`、`b` 都呼叫 `g`，現況 `g` 的 exit 的 `return` 陣列是
    `[b→g 的 CALL RETURN, a→g 的 CALL RETURN]`；逐模型遞迴會得到相反順序，使 `m` 模型 dot 的 return 邊行序改變。全域序等於現況的套用次序，限制在子樹內只會去掉子樹外的項目，不改變子樹內項目的相對順序。
  - 子樹外的操作只會碰到子樹外的節點，或在子樹內節點的多重連線陣列與 `prev` 陣列加入子樹外的項目（例如其他模型的 CALL RETURN），
    不改變子樹內項目的相對順序；dot 會過濾這些項目（現況要點 2），因此限制在子樹內的重播得到逐位元組相同的 dot。分析方面，這些
    子樹外的項目正是外漏的通道（R6）。
- **Alternatives considered**：
  - **共用工作圖＋建好時快照**（在一份私有複本上跑現有改動程式、每個模型建好時快照）：實作最少，但扁平圖不是「由階層展開」，違反
    FR-005 與 D2（spec 明定 FR-005 不放寬）。
  - **逐模型遞迴展開**（不記全域序）：見上例，會改變鄰接順序。
  - **複製子模型的扁平圖再接邊**：同一原件在扁平圖中會有多個複本，破壞 context-insensitive 結構與 dot 的物件身分語意。

## R2 複本：不消耗計數器、沿用屬性、GEN 重指

- **Decision**：在 `lib/esgraph/flownode.js`（MIT）新增 `FlowNode.copyNodes(originals)`，回傳 `Map(原件 → 複本)`：
  - 以 `new FlowNode(type, astNode, parent)` 建立（**不經** `flownodefactory`，不動 `_counter`），`cfgId` 直接設為原件的值；
  - 沿用：`type`、`astNode`、`parent`、`line`、`col`、`scope`、`split`（凍結物件可共用）、`labelPath`、`isWithObject`、`loopRightSplit`、
    `discriminantSplit`；
  - 連線：逐連線種類（單一連線槽與多重連線陣列）與 `prev`／`next` 陣列**逐項**經 Map 轉成複本，保留原順序（直接寫內部陣列，不經
    `connect`，否則 `prev` 順序會變）；目標不在 Map 中者略去（intra-procedural 圖的邊都在同一圖內，實際不會發生）；
  - 清空：`kill`、`cuse`、`puse`、`reachIns`、`reachOuts`、`extraReachIns`、`extraReachOuts`、`label`（寫檔時由 converter 重設）、`nextSibling`；
  - 新增唯讀屬性 `original`（原件為 `null`，複本指向原件；複本只由原件產生，不會有「複本的複本」）。
  GEN 重指在 `lib/dujs/`（esgraph 不得 require dujs 的 Def）：展開時、重播操作之前，對原件 `generate` 不為 `null` 的**所有**複本，逐項以
  `varDefFactory.create(variable, defFactory.create(複本, def.type, range))` 建立新 VarDef（`range` 由原 `Def.range` 還原為陣列；實作時以
  `Range` 的欄位確認），保留原集合順序；複本的 VarDef 物件在整個分析中身分固定。
- **Rationale**：
  - dot 編號＝entry 的 `cfgId`＋位置，複本沿用 `cfgId` 即得到相同編號；不經 factory 才不會讓 inter-page 的 domain 節點（`cfgId`＝之前建立
    的節點總數）編號後移（spec Edge Cases）。
  - `lib/dujs/defuseanalyzer.js` 的 `findGENSet` 結尾會 `cfgNode.generate = generatedVarDef` 快取，所以 intra-procedural 分析後**每個走訪過的
    原件** `generate` 都非 null，且其 Def 的 `fromNode` 是原件（entry 另含內建物件、區域變數預設值、函式宣告的定義）；`modelbuilder.js` 的
    `callReturnNode.generate = callSite.generate` 搬的正是這份快取。因此所有非 null 的 `generate` 都必須在**重播之前**以複本為 `fromNode`
    重建；若只重建 entry，`f(x = 1);` 這類非決策呼叫點搬到 CALL RETURN 的 GEN 會沿用原件的 Def（失去複本上的定義），`dupairs.dot` 也會印出
    原件（intra-procedural 寫檔時設定）的舊標籤（spec Edge Cases）。單元測試檢查每個複本的 GEN（每個 `fromNode` 都是複本），並含 `f(x = 1);` 案例。
  - `kill`、`cuse`、`puse` 每次轉移都重算；`reachIns`／`reachOuts` 由該模型的 worklist 設定。清空可確保每個模型的結果只來自自己的分析。
- **Alternatives considered**：在 `lib/dujs/` 以公開 setter 重建複本——`prev`／`next` 沒有 setter，只能 `connect`，無法保留 `prev` 順序；
  為此開放內部陣列的 setter 會讓「唯讀」的 FlowNode 介面變寬，不採用。

## R3 結構節點樣板：只建一次、順序同現況

- **Decision**：上層新增的 CALL、CALL RETURN、LOOP、LOOP RETURN 與 domain（localStorage）節點，在**建階層**時以 `flownodefactory` 建立
  一次（消耗計數器），時點與順序與現況完全相同：每條呼叫邊先建 CALL RETURN、決策前插入時再建 CALL；每頁先 LOOP 再 LOOP RETURN；
  inter-page 建模時由 `cfgBuilder.getDomainScopeGraph()` 建 domain。建立當下設定的屬性也相同（CALL RETURN／CALL 的 `line`、`col`、
  `labelPath`、`scope`；LOOP／LOOP RETURN 的 `scope`；domain 的 `scope`）。其餘改動（`generate`／`kill` 設為空集合、改型等）屬於操作，展開時
  在複本上執行。樣板本身**從不連邊**，任何扁平圖（含最先建立的模型）放的都是樣板的複本。
- **Rationale**：建階層的走訪程式（`getInterProceduralModelStartFromTheScope`、`buildIntraPageModel`、`buildInterPageModel` 的迴圈與遞迴）
  保持原樣，只把「改接邊」換成「記錄操作＋建樣板」，建立次序因此自然與現況相同；樣板不連邊使所有模型的扁平圖地位一致，原件與樣板
  都可作為查詢鍵（R7）。
- **Alternatives considered**：讓第一個模型直接使用樣板、之後的模型才用複本——第一個模型會在之後被重播改動，回到共用節點的問題。

## R4 節點陣列順序（含重複）

- **Decision**：把現況組陣列的邏輯改寫為只作用在原件串列上的純函式，與改邊分開：
  - inter-procedural：從呼叫端 intra-procedural 圖的陣列開始，對每條呼叫邊（模型自己的邊，依 `seq`）：以「目前串列中呼叫點的位置」切成前後
    兩段；決策前插入時前段最後一個換成 CALL 樣板、後段前面補回決策節點；被呼叫者串列（遞迴算出）中尚未出現者依序加入；加 CALL RETURN
    樣板；接後段。鏈接呼叫（同一節點多個被呼叫者）時下一條邊的呼叫點是上一條的 CALL RETURN 樣板——記在呼叫邊的 `callSite` 上。
  - intra-page：主程式串列在 exit 前插入 LOOP；依處理器清單（**保留重複**）逐一串接處理器模型的串列，第一個之後加 LOOP RETURN；
    沒有處理器時直接加 LOOP RETURN。
  - inter-page：`[domain]` 串接各頁 intra-page 串列。
  同一扁平圖中重複出現的原件對應**同一個複本物件**（R1 的 Map）。
- **Rationale**：陣列與現況逐項相同（含 `concat` 的重複），dot 以 `indexOf` 取第一個位置、`labelWithLineNumber` 對重複物件重複加後綴的
  現象都原樣重現（spec FR-005、Edge Cases）。
- **Alternatives considered**：在展開時去重——會改變節點編號與標籤，違反 FR-006。

## R5 全域序號 `seq`

- **Decision**：`lib/dujs/hierarchy.js` 持有單調遞增的模組層級計數器；每條呼叫邊、LOOP 掛接、LOOP RETURN 掛接、事件邊、load／save storage
  邊建立時取號。展開時以 `seq` 排序。計數器不需要重設（只用到相對順序），也與 `flownodefactory` 的節點計數器無關。
- **Rationale**：見 R1；以建立次序（＝現況套用次序）定序最直接。
- **Alternatives considered**：以 CALL RETURN 樣板的 `cfgId` 當序號——事件邊與 storage 邊沒有樣板，需要另一套序號，不如統一。

## R6 外漏（仲裁 N1）與同類現象

- **Decision**：新設計中每個模型的扁平圖只含自己子樹的節點與邊，分析不可能走出自己的圖，因此 N1 自然不重現（依仲裁視為缺陷）。
  外漏型態統一定義為（spec Clarifications，plan 仲裁 2026-11-16）：**子模型呼叫鏈上任一函式（根函式或其任一祖先）被呼叫兩次以上或在迴圈內呼叫**。機制：子樹外的模型把邊加到子樹內的共用節點（被呼叫函式的
  exit 多出指向其他 CALL RETURN 的 `return` 邊），worklist 沿此走出、再經另一條呼叫走回子樹。例：page 呼叫 `p` 兩次、`p` 呼叫 `r` 一次、
  `r` 呼叫 `c` → `r→c` 子模型多出外層定義的 pair（根函式 `r` 只被呼叫一次，但祖先 `p` 被呼叫兩次）。
  **已決**：視為 N1 同一缺陷、不重現。既有測試與 golden 不依賴外漏（仲裁實測：濾掉模型外的邊後 786 個測試全過）。
- **Rationale**：現況要點 1、3、4。dot 不受影響（現況要點 2）；只有 pair 與 reach-in 可能不同。
- **新 fixture 的對應**：不含外漏型態（子模型呼叫鏈上任一函式（根函式或其任一祖先）被呼叫兩次以上或在迴圈內呼叫；fixture 中每個函式都只被呼叫一次、不在迴圈內）。
- **known-issues**：FR-012 要求新增一節記錄 N1，以上述統一定義描述條件（子模型呼叫鏈上任一函式（根函式或其任一祖先）被呼叫兩次以上或在迴圈內呼叫），標為本 feature 已修正，並**附重現程式**（如上例 page→p×2→r→c）。

## R7 每模型分析結果與唯讀查詢

- **Decision**：
  - `Model` 新增內部 `_results`（`Map(扁平圖節點 → 凍結的結果紀錄)`）與 `_flatNodeOf`（`Map(原件 → 扁平圖節點)`；intra-procedural 模型為恆等）。
  - `doAnalysis(model)` 在轉移函式中記下每個節點最後一次使用的 GEN（`currentNode.generate || findGENSet(...)` 的值）；分析結束後以 worklist 的
    `inputs`／`outputs` 與節點上的 `kill`、`cuse`、`puse` 組成紀錄，交給 `model` 保存（同時照舊寫回節點欄位，`findDUPairs` 與既有測試不變）。
  - 唯讀查詢 `model.analysisResultOf(node)`：`node` 可為此模型扁平圖的節點或其原件；回傳 `{reachIns, reachOuts, generate, kill, cuse, puse}`，
    每個欄位都是新的 `Set`（或 `null`），呼叫端改動不影響模型；節點不在模型中、或模型尚未分析時回傳 `null`。形狀見
    [contracts/model-api.md](./contracts/model-api.md)。
  - 移除 `scope.lastReachIns`：刪除 `doAnalysis` 中的寫入與 `lib/dujs/scope.js` 的 `_lastReachIns` 與 `lastReachIns` 屬性（無讀取者；它是跨模型
    共用的全域狀態，與 FR-003 相悖）。
- **Rationale**：每個上層模型的複本只屬於自己，結果天然分開；把結果另存在 Model 上，查詢不必依賴可寫的節點欄位，且能回答 GEN（一般節點
  的 GEN 不存在節點上）。intra-procedural 模型的結果存在原件上，上層從不改原件，因此四層建完後仍與建好當下相同（SC-003）。
- **Alternatives considered**：另在 `doAnalysis` 外自行把 GEN 存回節點——不需要：`findGENSet` 本來就把 GEN 快取在節點上（R2），轉移函式
  讀 `currentNode.generate || findGENSet(...)`，複本的快取由展開時重建，`doAnalysis` 只需把該值記進模型的結果；不另改快取行為，以免改變
  收斂過程與 Set 插入順序。

## R8 建模時 reach-in 的讀法

- **Decision**：
  - **解析被呼叫函式**：沿用現況，走訪呼叫端 intra-procedural 模型的原件並讀 `node.reachIns`（原件只被 intra-procedural 分析設定）。
  - **找事件處理器**：`findEventHandlerModelsFromAModel` 走訪搜尋中模型的扁平圖節點 `n`，以 `reachInsForHandlerLookup(n)` 取 reach-in：
    `o = n.original || n`；在該頁的 inter-procedural 模型中**由後往前**（分析次序的反向）找第一個 `analysisResultOf(o)` 不為 `null` 者，回傳其
    `reachIns`；都沒有則回傳 `o.reachIns`（intra-procedural 結果）。
- **前提**：被呼叫者的定義必須在呼叫端自己的 intra-procedural reach-in 內（`modelbuilder.js` 約 471 行），被呼叫者必為呼叫端的語彙子函式，
  所以 inter-procedural 模型之間只有巢狀或互斥關係；在此前提下「該頁最近一次分析、且對該節點有結果的 inter-procedural 模型」與 spec 的
  「包含該節點的最頂端 inter-procedural 模型」等價。stage 2 若放寬呼叫解析（被呼叫者不必是語彙子函式），一個節點可能被多個互不包含的
  模型包含，「最頂端」可能不唯一，屆時須重新定義。
- **Rationale**：這正是 spec「包含該節點的最頂端 inter-procedural 模型（沒有則 intra-procedural）」的可操作定義，與現況「最後一次走訪到
  該節點的分析」在沒有外漏時完全相同（現況要點 6）；尚未分析的模型（例如 `tests/dujs/modelbuilder.js` 只建不分析的情境）沒有結果，自動
  退回 intra-procedural，與現況相同。被呼叫函式與處理器同時成立時（仲裁 H4 的情境）也重現現況。
- **Alternatives considered**：讀「正在搜尋的模型」——仲裁已否決（會改變 H4 情境的輸出）。

## R9 輸出時機與既有 .dot

- **Decision**：`bin/dujs.js` 的階段順序與寫檔時機不變；各階段的 writer 另外寫階層圖（R12）。
- **Rationale**：新設計下每個模型的扁平圖在建好後只被自己的分析與寫檔碰到（寫檔會設定節點 `label`，對象是該模型自己的複本），之後任何
  階段都不再改動它，因此 .dot 內容與寫檔時機無關。逐檔比對現況：intra-procedural 寫的是原件（從未被改）；inter-procedural 寫的是子樹重播
  結果，與現況寫檔時的狀態只差子樹外加入的 `return` 項目（dot 過濾）；intra-page 寫的是重播到 intra-page 操作為止的結果（現況寫檔時
  inter-page 尚未建）；inter-page 相同。`dupairs.dot` 的標籤來自同一模型剛寫完 graph.dot 時設定的複本標籤，與現況相同（R2 的 GEN 重指保證
  定義節點也是本模型的複本）。
- **Alternatives considered**：改成全部建完再一次寫檔——不必要，且讓 bin 的變更混入本 feature。

## R10 golden：分開驗證「既有檔不變」與「新增檔清單」

- **Decision**：新增 `tests/golden/manifest.json`，對每個 golden case（以 expected 目錄名為鍵）記錄：
  - `baseline`：`{相對路徑: sha256}`——**重構前**（`bf07818` 的程式）產生的每個 .dot 檔的雜湊，在任何 `lib/` 變更前產生並提交；
  - `added`：本 feature 新增的 .dot 檔相對路徑清單（排序），US2 完成時填入。
  `tests/golden/golden.js` 的每個 case 在既有兩個 `it`（檔案集合與內容與 expected 目錄相同）之外新增：
  1. `keeps every baseline .dot file byte-identical`：對 `baseline` 的每一項，實際輸出存在且 sha256 相同；
  2. `adds exactly the listed new .dot files`：實際輸出的檔案集合減去 `baseline` 的鍵，等於 `added`；
  3. `references the hierarchy graphs before the flat graphs in the report`（US2）：見 R12。
  `UPDATE_GOLDEN` 的行為不變（重建 expected 目錄），但它**不會**改 manifest：即使有人以 `UPDATE_GOLDEN=1` 放行，第 1 項仍以重構前的雜湊
  擋下既有檔的任何差異。manifest 的 `baseline` 只在刻意改變分析結果的 feature（stage 2）中更新，並在該 feature 記錄理由。
- **Rationale**：「既有檔逐位元組不變」需要一個不會被 `UPDATE_GOLDEN` 改寫的基準；雜湊不重複存檔、可審閱；新增檔清單明列，多出或缺少
  任何檔都會失敗（FR-010、SC-001）。只用 Node 內建 `crypto`，不新增依賴。
- **Alternatives considered**：把新增檔放到獨立目錄（如 `expected-hierarchy/`）——要改 `listDotFiles` 與輸出目錄對應，且無法防止
  `UPDATE_GOLDEN` 改寫既有檔；以 `git diff` 驗證——不在 `npm test` 內，無法自動把關。

## R11 新增的 ES5 fixture 與「先產生扁平 golden」

- **Decision**：新增 `tests/golden/fixtures/interprocedural/app.js`（內容見 [quickstart.md](./quickstart.md) §1；每行一個敘述，便於以行號核對）
  與 golden case `Golden outputs (inter-procedural fixture)`，expected 目錄 `tests/golden/expected-interprocedural/`。程式要點：
  - 主程式以 `addTo(1);`（陳述式，非決策呼叫點）呼叫 `addTo`，`addTo` 以 `scale();` 呼叫在它內部宣告的 `scale`（巢狀子模型）；
  - 主程式以 `if (isReady()) {...}` 在決策節點呼叫 `isReady`（§16 決策前插入）；
  - 兩個事件處理器 `onClick`、`onLoad` 以識別字註冊；`onClick` 以 `log();` 呼叫內部宣告的 `log`（處理器自己的 inter-procedural 模型）；
  - `localStorage.total = total;`（inter-page 的 saveStorage 邊）。
  - 避開：N1 外漏型態（子模型呼叫鏈上任一函式（根函式或其任一祖先）被呼叫兩次以上或在迴圈內呼叫；`addTo`、`scale`、`isReady`、`log` 及其祖先都只被呼叫一次、不在迴圈內）、H4（處理器不是被呼叫的函式）；
    所有呼叫都是現況可解析的寫法（仲裁 H5）。
  - 不涵蓋：鏈接呼叫、重複處理器、R8「搜尋的模型不是最頂端模型」的路徑——由 expansion／hierarchy 單元測試補（可參考仲裁探針
    `specs/003-hierarchical-models/probes/`（仲裁探針程式複本：a1–a4 對抗案例、n1／n1b／n1c 外漏型態、r6a–c），唯讀）。
  已以現況程式試跑：產生 inter-procedurals `0`（addTo→scale）、`1`（主程式→addTo→scale、主程式→isReady）、`2`（onClick→log）三個模型、
  intra-page 有兩個處理器、inter-page 有 saveStorage 邊，stderr 為空。
- **產生順序**（最早的任務，任何 `lib/` 變更之前）：
  1. 確認 `git -C <root> diff --quiet bf07818 HEAD -- lib bin package.json`（程式即重構前版本）；
  2. 加入 fixture 與 golden case，以 `UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js --grep "inter-procedural fixture"` 只產生新 case 的
     expected 目錄（mocha 的 `--grep` 讓其他 case 的 `before` 不執行）；`git status` 只應出現新目錄；
  3. 以腳本計算三個 expected 目錄（含新目錄）所有 .dot 的 sha256，寫入 `manifest.json` 的 `baseline`，`added` 皆為 `[]`；
  4. 加入 R10 的第 1、2 項測試，`npm test` 全綠；提交（此 commit 是之後每個 story 的比對基準）。
  5. **必做**交叉驗證：`git worktree add <scratch>/base bf07818` 後在該處執行 CLI，比對新 expected 目錄逐位元組相同（manifest 可手改，
     靠此步驟與之後的 `git diff --exit-code` 把關；見 quickstart §1 步驟 7）。
- **Alternatives considered**：擴充既有 fixture——會改變既有 golden（clarifier H5 已否決）；兩頁的 fixture——inter-procedural 建模與頁數無關，
  單頁足夠，inter-page 層已由既有 ES5 兩頁 fixture 覆蓋。

## R12 階層圖輸出與 HTML 報告

- **Decision**（完整格式見 [contracts/hierarchy-output.md](./contracts/hierarchy-output.md)）：
  - 檔名：`<模型索引>.hierarchy.dot`，與該模型的 `graph.dot` 同目錄（`page<i>/inter-procedurals/`、`page<i>/intra-pages/`、`inter-page/`）。
  - 節點 id 為 `h0, h1, ...`（不用 `cfgId`，階層節點不消耗計數器）；標籤：函式／主程式／處理器為 scope 全名（`String(scope)`，如
    `$DOMAIN.$PAGE_0.addTo`）、LOOP 為 `loop`、頁面為 `page<i>`、domain 為 `$DOMAIN`；LOOP 與 domain 沿用扁平圖的形狀與顏色。
  - 邊：`call`（藍）、`return`（藍、虛線）、`onEvent`（綠）、`loadStorage`／`saveStorage`（點線）、主程式→LOOP（無標籤）；同一對單位同一種邊
    只輸出一次（第一次出現的位置）。不含 CALL、CALL RETURN、LOOP RETURN 節點（D8）。
  - HTML：`outputWriter` 新增 `interProceduralHierarchyImageFilePaths`、`intraPageHierarchyImageFilePaths`、`interPageHierarchyImageFilePaths`；
    `reportGenerator` 在三段的每個模型區塊中，於扁平圖 `<img>` 之前插入一個 `<div class="col-lg-8 col-lg-offset-2 col-sm-12"><img src="../<階層圖 png>" class="center-block"></div>`。
  - 驗證不依賴 Graphviz：`writeImageFileFromDotFile` 不論 `dot` 是否安裝都回傳 png 路徑，報告只引用路徑；golden case 讀
    `report.html` 的文字內容，檢查每個階層圖路徑都出現、且位置在同一模型的扁平圖路徑之前，原有 graph／dupairs 路徑的相對順序不變。
- **Rationale**：檔名與既有 `<i>.graph.dot`／`<i>.dupairs.dot` 同一模式，golden 的 `listDotFiles` 自動納入；scope 全名在巢狀同名函式時仍
  可區分。
- **Alternatives considered**：用 `dot.js`（LGPL）輸出階層圖——它只認 FlowNode 陣列，硬套需修改 LGPL 檔；新模組 `lib/dujs/hierarchydot.js`（MIT）較乾淨。

## R13 測試改寫的邊界（FR-006、FR-007）

- **Decision**：只有下列改寫，且預期值一字不動：
  | 檔案 | 改寫 | 原因 |
  |------|------|------|
  | `tests/helpers/analyze.js` | 刪除 `branch()` 的兩個繞路（LOOP 當 exit、`dujsDecisionCalledBefore`）與說明；加入 R14 的不變性檢查 | FR-007、SC-002、SC-003 |
  | `tests/dujs/branchsplit.js`（`call before decision` 測試） | `found.nodes[1].dujsDecisionCalledBefore === found.nodes[3]` 改為以階層查詢：找出 `callNode` 的複本是 `found.nodes[1]` 的呼叫邊，斷言其 `beforeDecision === true` 且 `model.flatNodeOf(edge.callSite) === found.nodes[3]` | FR-007（標記移除） |
  | `tests/dujs/branchsplit.property.js` P1 | `isTargetOf` 刪除 `|| target.type === LOOP_NODE_TYPE`（目標一律在模型扁平圖內） | SC-002（共用節點繞路 0 處） |
  | `tests/dujs/modelbuilder.js` private methods | `_connectCallerCalleeScopeRelatedModelsAtCallSite`、`_connectLoopNodeToPageGraph`、`_connectPageAndEventHandlers` 改以手動建立階層＋`expand` 驗證；`should.eql(原圖節點)` 改為比對 `node.original`；位置、長度、種類等預期值不變 | 私有函式被階層＋展開取代 |
  | `tests/dujs/modelbuilder.js` buildInterPageModel | `page1IntraPageModel.graph[2][2].saveStorage.should.eql(graph[0])` 改為斷言 inter-page 扁平圖中同一原件的複本（`interPageModel.flatNodeOf(page1IntraPageModel.graph[2][2].original)`）的 `saveStorage === graph[0]`；`loadStorage[i]` 改比對 `.original` | FR-001（intra-page 不得再有 storage 邊；US1 情境 6） |
  | `tests/dujs/branchsplit.js`（約 476 行 `node.call === logEntry`） | 以原件與上層節點比身分的斷言改為比對 `model.flatNodeOf(原件)`；預期值不動 | FR-001（上層節點為複本） |
  | `tests/dujs/reviewfixes.js`（約 113、149、220 行） | `callersOf(page, 原件 entry)` 之類以原件與上層節點比身分的斷言改為比對 `flatNodeOf(原件)`；預期值不動。約 82–91 行的斷言改後可能空轉（例如永遠找不到節點而跳過檢查），須確認仍有效 | FR-001 |
  其餘既有測試不改。實作時另以 grep 找出所有「原件與上層節點比身分」的斷言（`===`／`should.equal`／`indexOf`／`callersOf` 等以 intra-procedural
  節點查上層圖者），逐條確認改寫後未變成空轉。`tests/dujs/modelbuilder.js` 私有測試改為「手建階層＋`expand`」已超出「只改取值方式」，
  PR 需逐條附改寫前後對照。若有其他測試因 FR-001 而失敗（它斷言了被上層改動後的下層狀態），停下請使用者裁決（N1 外漏消失不應造成差異：仲裁實測既有測試不依賴外漏；若仍出現，同樣停下）。
  `specs/001-fix-known-issues/contracts/analyze-helper-notation.md` 同步刪除兩個繞路的說明。
- **Rationale**：spec FR-006「只允許改寫取值方式」。

## R14 不變性驗證（US1 情境 3、SC-003）

- **Decision**：`tests/helpers/analyze.js` 在每個建模階段分析完後，對該階段新建的模型取快照（扁平圖的節點陣列、每個節點的 `cfgId`／種類／
  各連線種類的目標（以陣列位置表示）／`prev`／`next` 順序，與 `analysisResultOf` 的六個集合的成員陣列，以物件身分比較）；四層都完成後
  重取一次並比對，有差異即拋出指名模型與節點的 Error。所有使用 helper 的既有測試因此自動驗證 SC-003；`tests/dujs/hierarchy.js` 另對
  三個 golden fixture（以 executor 逐段執行）做同樣比對。
- **Rationale**：SC-003 要求「所有 fixture 與既有測試程式」；放在 helper 是最小改動、最大覆蓋。

## R15 呼叫環防護

- **Decision**：`expand` 以「展開中的模型堆疊」偵測環：遇到堆疊中的模型時拋出 `Error('call cycle in hierarchy: <scope 名稱鏈>')`，不無窮遞迴。
  `lib/dujs/hierarchy.js` 提供手動建立階層的入口（`createCallHierarchyModel`、`addCallEdge`），單元測試以兩個互相呼叫的手工模型驗證
  `expand` 會終止（拋出該 Error）。
- **Rationale**：現況的呼叫解析不形成環（spec Clarifications），環只會來自手工或未來的程式；明確失敗比靜默產生不完整的圖安全。
- **Alternatives considered**：遇到環時不再展開、只接到已存在的複本——現況沒有對應語意可比對，stage 2 的 summary 分析再定。

## R16 known-issues §9 的處理（US3）

- **Decision**：
  - (a) `lib/esgraph/index.js` 檔頭「Modified by」新增兩行（`2026-11-16: expressionThrows returns false for a null expression`、
    `2026-11-16: a ClassDeclaration is a leaf in createNodes`；措辭在實作時對照程式），`THIRD_PARTY_NOTICES.md` §1 Modifications 新增對應兩點；
    這是修改紀錄，不改程式。
  - (b) `defuseanalyzer.js`：把被插入的 helper 移到各自 JSDoc 之外，使每段 JSDoc 緊接其函式；`isFunctionExpression`、`getDefinedVariables`、
    `computeKILLSet`、`useClassHead`、`useNestedLoopHead`（§9 列的 `useLoopHead` 已於 002 由 `usedexpressions.js` 取代而移除，現存的是 `useNestedLoopHead`）
    各有自己的 JSDoc；同時清掉 `analyzeBuiltInObjects`、`findVariableAndItsDefinitionsFromASet` 等前方的錯位 JSDoc。
  - (c) 刪除 `DefUseAnalyzer.prototype.findKILLSet`（無呼叫者、無測試）。
  - (d) `jsparser.js` 改為有綁定的 catch；`no-unused-vars` 預設 `caughtErrors: "all"` 會對未使用的綁定報錯（已實測），且不得新增抑制。
    **已決**（spec Clarifications，plan 仲裁 2026-11-16）：`eslint.config.js` 的 `no-unused-vars` 加 `caughtErrorsIgnorePattern: '^ignored'`，
    綁定命名 `ignoredModuleError`；PR 與 known-issues §9 各記一筆。
- **Rationale**：FR-011、FR-013、FR-014。

## R17 tech-standards

- **Decision**：`.specify/memory/baseline/tech-standards.md` 針對服務後端／前端，對本 CLI／函式庫屬「不適用」而非偏離，不需 §CP-6 例外。
  技術選型沿用現況：JavaScript（CommonJS，`lib/` ES5 風格）、Node.js ≥ 24、espree＋walkes、mocha＋should＋fast-check、golden、eslint、c8；不新增依賴。
