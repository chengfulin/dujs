# Feature Specification: 修正其餘已知問題（§7、§10–§12、§14、§15、§17、§20、§21）

**Feature Branch**: `004-fix-remaining-issues`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "修正 docs/known-issues.md 中尚未修的項目 §7、§10、§11、§12、§14、§15、§17、§20、§21，另開一個修 bug 的 feature。這些修正會改變分析結果，golden 差異需記錄。PR 目標分支為 develop。"

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| KI | `docs/known-issues.md` | 各問題的重現輸入與目前錯誤結果（§n 對應檔內問題編號） |
| USR | 本 feature 的需求討論（2026-11-16，記錄於本 spec 的「範圍決策」） | 修正範圍與各問題的建模方向 |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | KI §20 |
| US2 | KI §21；USR D3 |
| US3 | KI §7；USR D2、D6 |
| US4 | KI §10、§11、§17 |
| US5 | KI §12；USR D4、D5 |
| US6 | KI §14、§15 |

### 範圍決策（USR）

- **D1**：本輪修正 KI 中尚未修的 §7、§10、§11、§12、§14、§15、§17、§20、§21；§18 與 §16 的「呼叫與決策
  節點的先後」屬階層模型 stage 2，不在本輪範圍。這些修正會改變分析結果，golden 差異逐項記錄。[SRC USR D1]
- **D2**：KI §7 只連結可靜態判定被呼叫方法的呼叫敘述：`new A().m();`、`A.s();`（static 方法）、在 class A
  的方法內的 `this.m();`、以及 `o.m();` 且 `o` 的所有到達定義都是 `new A(...)`（同一個 class）。其他形式
  （`o` 的來源不明或混合、經由屬性取得的物件、動態屬性名）維持不連結，寫入 README 限制。[SRC USR D2]
- **D3**：KI §21 `new` 敘述一律是 call-site：`new F();` 連到建構函式 `F`；`new A();` 依執行順序連到 class A
  的實例欄位初始化式與 constructor（取代 001 D7「實例欄位初始化式不接入流程」）；有 `extends` 時不追
  super 鏈，寫入 README 限制。[SRC USR D3]
- **D4**：KI §12 CLI 加上 usage／help、錯誤時非零 exit status；沒有任何頁面時直接報錯並印 usage；每次執行
  的輸出目錄保證唯一，兩次執行不共用目錄。[SRC USR D4]
- **D5**（spec review）：多個頁面中任一頁的檔案不存在或分析失敗時立即中止，不輸出半套結果，exit status 非零。[SRC USR D5]
- **D6**（spec review）：class 的 constructor 與欄位初始化式內的 `this.m();` 與方法內相同，連到同一 class 的 `m`。[SRC USR D6]
- **D7**（spec review）：golden 差異紀錄放在 feature 目錄的獨立檔（`specs/004-fix-remaining-issues/golden-diff.md`），
  每處差異對應到 KI 節次。[SRC USR D7]

## Clarifications

### Session 2026-11-16

- Q: 決策條件中呼叫的引數（`if (f(a))`、`while (f(a) < c)` 的 `a`）是 p-use 還是 c-use？ → A: c-use。
  p-use 應是「函式回傳值」參與判斷，目前沒有回傳值的定義可對應，不在本輪範圍。（clarifier H1；範圍見下方 A5）
- Q: 方法呼叫產生的呼叫環（`m(){ this.m(); }`、m↔n 互相呼叫）怎麼處理？ → A: 不報錯，以迴圈路徑表示：形成環的
  那個呼叫以 call 邊接回已展開的同一個被呼叫端的 entry，該被呼叫端的 exit 再多一條 return 邊回到這個呼叫的 CALL
  RETURN 節點。（使用者提問「為何會失敗、應可建成迴圈路徑」——更正：flat graph 每個原始節點本來就只有一份，
  遞迴並不會無限巢狀複製；失敗的原因是 (1) 建 callee model 的遞迴在註冊前就再次進入自己、(2) 003 契約的
  `checkCycle` 遇環即丟錯、(3) 階層由下而上建立並凍結，m↔n 時需要尚未完成的 model。改以回邊表示可行，但須
  修訂這三處，見 FR-015。）（clarifier H2；Fable A4）

- Q: 要不要擴大呼叫解析範圍（函式內的 `new A()`／`A.s()`、`var o = new A(); o.p = 1; o.m();`）？ → A: 維持現行：
  與既有 `f()` 同一規則，只連結在所在 scope 內看得到 function／class 定義的呼叫；函式內的這類呼叫與中間有屬性賦值的
  `o.m()` 不連結，寫入 README。使用者指出 `o.p = 1` 的正確建模應是「`o.p` 的 def、`o` 的 use」、`o.m()` 是 `o` 的
  use，但差異過大，另開 feature，本輪記入 known-issues 新節。（clarifier H3、H4）
- Q: §11 調整 static 成員的執行順序時，class 運算式是否適用？ → A:（已由 Fable A7 縮為只對 class 宣告） 只對 class 宣告與 class 運算式自己的具名內部名稱
  （`var B = class Q {...}` 的 `Q`）生效；順序為 superclass 與 computed key → 定義 class 名稱 → static 成員；
  `var B = class { static s = B; }` 的外層 `B` 依 JS 語意此時尚未定義，不產生 pair。（clarifier H5）
- Q: D5「不輸出半套結果」怎麼做？ → A: 先讀完所有頁面檔案才建立輸出目錄（任一檔案不存在時不留下任何輸出）；分析或
  寫出中途失敗時刪除本次執行的輸出目錄。（clarifier M1）
- 依 §CP-4（可驗證）自行決定：§14 沒有重現程式，SC-002 排除 §14，以 US6 情境 3 的單元測試為準；FR-012 的判定依據
  改為圖結構（前驅節點能否從迴圈本體的第一個節點不經過迴圈節點到達）。（clarifier M3）
- 依 §CP-1（可追溯）自行決定：golden baseline 的雜湊允許改變，但每一處改變都必須在 `golden-diff.md` 有對應的 KI
  節次，且 `tests/golden/manifest.json` 隨之明確更新；編碼舊行為的既有測試（如 001 D7 的實例欄位不接入流程）可更新，
  逐項列入 golden-diff。（clarifier M4）
- 依 D2 的「其他形式不連結」自行決定：私有方法 `this.#m()`、optional call `o?.m()`／`f?.()`、字串或 computed 方法名、
  `new ns.A()`、`new (f())()`、箭頭函式與一般 `function` 內的 `this.m()` 皆不連結並列入 README；方法 `n` 中的
  `this.m()` 一律連到同一 class 的 `m`（不考慮子類覆寫）；`var o = new A();` 是宣告而非 `new` 敘述，不連
  constructor（只作為 `o.m()` 的判定依據），列入 README。（clarifier M5）

#### 延後釐清（步驟 7 analyze 重新評估）

- clarifier M2：多數驗收情境（US2-2、US2-3、US3-2～7、US4-1～4、US6-1）尚未寫出完整分行程式與預期 pair／標籤
  字串。plan 階段須以探針程式實跑目前行為，於 plan 的驗收對照中為每個情境補上分行程式與修正後的完整預期，
  US4-5 改以分行程式並以節點數與定義數斷言。

### Session 2026-11-16（Fable 仲裁）

- Q: 被呼叫端的 entry／exit 會 kill 呼叫端的區域變數與參數，連結方法內的 `this.m()` 或遞迴回邊後，呼叫端自己的
  pair 反而消失（既有 `{ let t = 1; f(); console.log(t); }` 也有此問題），怎麼處理？ → A: 新增繞過規則（FR-016）：
  被呼叫端看不到的呼叫端定義繞過被呼叫端，到達 CALL RETURN 之後；一併修正既有情形。（Fable A1）
- Q: constructor 內的 `new A()` 算不算呼叫環？ → A: 依 H3 函式內看不到 class 定義，不連結、不成環，從呼叫環清單
  移除。實際會成環的只有依 class 結構判定的 `this.m()`。（Fable A3，依使用者 H3 裁決推得）
- Q: §20 要修到哪？（現況 `if (o.p)`、`if (o[a])`、`if (x = a)`、`if (a++)`、template、`if (new F(a))` 的讀取都是
  c-use；`if (f(a))` 的 `a` 是 c-use 而 `if (f(a + 1))` 的 `a` 是 p-use） → A: 決策節點條件內的讀取一律 p-use，
  呼叫（含 `new`）的引數一律 c-use（`f(a + 1)` 的 `a` 會由 p-use 改為 c-use）。（Fable A5）
- Q: 實例欄位初始化式只有一個節點，`f = this.m();`、`f = new B();` 算不算呼叫敘述？ → A: 初始值本身就是該呼叫
  （`this.m()` 或 `new B()`）時視為 call-site；呼叫包在其他運算式中則不連。（Fable A6）
- Q: class 運算式的具名內部名稱（`var B = class Q {...}` 的 `Q`）目前不是變數，§11 要不要新增內部名稱綁定？ →
  A: 不做，§11 縮到 class 宣告；具名 class／函式運算式的內部名稱記入 known-issues 新節。（Fable A7，取代 H5 的
  「具名內部名稱」部分）
- 自行決定（修正 M3）：FR-012 的圖結構準則會把外層迴圈中經 break 繞回的前驅誤判為本體內（Fable A2）；改為：有原始碼
  範圍時維持範圍判定，沒有時以支配關係判定（從 entry 不經過迴圈節點就到不了的前驅才算本體內）；US6 加外層迴圈＋
  break 的回歸情境。
- 自行決定（補 M4）：既有 golden fixture 幾乎碰不到本輪行為（Fable A8），新增涵蓋 §7、§11、§20、§21 的 golden
  fixture；golden-diff 對沒有差異的節次明載「無差異」。
- 自行決定：`var o = new A(); o.m();` 連 `m` 但不連 constructor 的不對稱列入 README（Fable A9）；US4-1 修正後
  `g = () => d` 成為函式定義，本體的 `g();` 依既有規則被連結，屬預期連帶變化，寫入情境。
### Session 2026-11-16（plan review）

- Q: US4-1 的 KI §10 程式本體是 `return g();`，不是呼叫敘述，「d 有 pair」不可能成立，怎麼處理？ → A: 驗收改用本體
  `g();` 的程式，原程式只斷言箭頭函式是 scope；另把「`return f()` 也當 call-site」記錄為後續項目（known-issues）。（plan U1）
- Q: FR-017 的 `f = new B();` 依 H3 永遠不連，怎麼處理？ → A: 保留文字並註明實際不連，README 註明，測試斷言不連。（plan U2）
- Q: 環上方法內註冊的事件 handler 接不上頁面流程，怎麼修？ → A: handler 查找優先採以頁面為根的 inter-procedural 模型。（plan U3）

## 表示法

沿用 `specs/001-fix-known-issues/spec.md`「表示法」：def-use pair 寫成 `<變數>: <def> -> <use>`，`<def>` 為
`entry` 或節點標記；c-use 為節點標記；p-use 為 `<決策節點標記>><分支目標節點標記>`，目標不帶路徑時再加
`:T`／`:F`。節點標記為 `L<行>`、`entry` 或 `exit`。行號為被分析程式碼的行號（1 起算）。「intra-procedural」
「inter-procedural」「intra-page」指 dujs 產出的對應模型。驗收程式一行一個節點來源。

## User Scenarios & Testing *(mandatory)*

使用者為以 dujs 分析 client-side JavaScript 資料流程的研究者或工具開發者，透過 CLI 或函式庫 API
取得四層模型與 def-use pair。

### User Story 1 - 決策條件中的讀取一律是 p-use (Priority: P1)

決策節點條件中的變數讀取都是 p-use，不受運算式形狀影響；呼叫（含 `new`）的引數一律是 c-use。

**Why this priority**: 錯把 p-use 記成 c-use 會讓分支覆蓋相關的測試需求消失，影響範圍廣且修正面小。

**Independent Test**: 分析下列程式，比對 intra-procedural 的 pair。

**Acceptance Scenarios**:

1. **Given** `var a = 1, b = 2, c = 3;` / `if (a + b >= c) {` / `a = 0;` / `}`，**When** 分析，**Then** `c` 的
   pair 為 `c: L1 -> L2>L3:T` 與 `c: L1 -> L2>exit:F`，沒有 c-use `c: L1 -> L2`；`a`、`b` 維持 p-use。[SRC KI §20]
2. **Given** 條件為 `-a < c`，**When** 分析，**Then** `a` 與 `c` 都是 p-use。[SRC KI §20]
3. **Given** `while (f(a) < c)`，**When** 分析，**Then** `c` 是 p-use；呼叫的引數 `a` 維持 c-use（Clarifications
   H1）。[SRC KI §20]
4. **Given** 非決策節點中的同類運算式（`x = a + b >= c;`），**When** 分析，**Then** 三者仍是 c-use（行為不變）。[SRC KI §20]
5. **Given** 條件分別為 `o.p`、`o[a]`、`x = a`、`a++`、`` `${a}` ``，**When** 分析，**Then** 其中讀取的 `o`、`a` 都是 p-use。[SRC USR Fable A5]
6. **Given** 條件為 `f(a + 1)`、`new F(a)`，**When** 分析，**Then** 引數中的 `a` 是 c-use（`f(a + 1)` 由 p-use 改為 c-use），
   callee `f`／`F` 是 p-use。[SRC USR Fable A5]

---

### User Story 2 - `new` 敘述是 call-site (Priority: P1)

`new F();` 與 `new A();` 這樣的敘述，和 `F();` 一樣連到被執行的程式碼。

**Why this priority**: 建構函式中對外層變數的定義完全遺失，產生錯誤的 pair；也是 US3 連結 `new A().m();` 的前提。

**Independent Test**: 分析下列程式，比對 inter-procedural 與 intra-page 的 pair。

**Acceptance Scenarios**:

1. **Given** `var x = 0;` / `function P(a) {` / `x = a;` / `}` / `new P(1);` / `console.log(x);`，**When** 分析，
   **Then** 建出含 `P` 的 inter-procedural 模型，intra-page 的 pair 為 `x: L3 -> L6`，沒有 `x: L1 -> L6`。[SRC KI §21]
2. **Given** class A 有實例欄位 `f = x;` 與 constructor 中的 `x = 1;`，且頁面有 `new A();`，**When** 分析，**Then**
   欄位初始化式與 constructor 依「先欄位、後 constructor 本體」接在該敘述上，欄位初始化式讀到的是 `new` 之前
   的 `x` 定義，`new` 之後的 use 讀到 constructor 中的定義。[SRC USR D3]
3. **Given** `class B extends A { constructor() { super(); x = 2; } }` 與 `new B();`，**When** 分析，**Then** 連到 B
   的欄位初始化式與 constructor，不追到 A（README 註明）。[SRC USR D3]
4. **Given** class 沒有 constructor 也沒有實例欄位，**When** `new A();`，**Then** 沒有任何連結，結果與修正前相同。[SRC USR D3]
5. **Given** `x = new F();`（`new` 在其他運算式中），**When** 分析，**Then** 維持不連結（同既有「只有呼叫敘述
   會連結」限制）。[SRC KI §21]

---

### User Story 3 - class 方法呼叫連到方法本體 (Priority: P2)

可靜態判定被呼叫方法的方法呼叫敘述，連到該方法的 scope。

**Why this priority**: 以 class 撰寫的程式（如 MDN bouncing balls）其方法內的定義目前全部遺失；但需要 US2 的
建構連結，且判定規則較多，排在 US2 之後。

**Independent Test**: 分析下列程式，比對 intra-page 的 pair。

**Acceptance Scenarios**:

1. **Given** KI §7 的程式（`new A().m();` 後 `console.log(x);`），**When** 分析，**Then** intra-page 的 pair 為
   `x: L4 -> L8`，沒有 `x: L1 -> L8`。[SRC KI §7]
2. **Given** `var o = new A();` / `o.m();` / `console.log(x);`，**When** 分析，**Then** `o.m();` 連到 `A` 的 `m`，
   `console.log(x)` 讀到 `m` 中的定義。[SRC USR D2]
3. **Given** `o` 在兩個分支分別被賦值為 `new A()` 與其他值，**When** `o.m();`，**Then** 不連結（README 註明）。[SRC USR D2]
4. **Given** class A 有 `static s() { x = 1; }`，**When** `A.s();`，**Then** 連到 `s`。[SRC USR D2]
5. **Given** A 的方法 `n()`、constructor 或欄位初始化式內有 `this.m();`，且該處已被連結，**When** 分析，**Then**
   `this.m();` 連到 A 的 `m`。[SRC USR D2、D6]
6. **Given** 呼叫的方法名稱在 class 中不存在（或只在 super class 中），**When** 分析，**Then** 不連結、不報錯。[SRC USR D2]
7. **Given** `new A().m();`，**When** 分析，**Then** 依執行順序先連 A 的欄位初始化式與 constructor，再連 `m`。[SRC USR D3]

---

### User Story 4 - 參數、解構預設值與 class 名稱的 use 不再漏掉 (Priority: P2)

參數預設值中的函式是 scope；class 名稱在自己的 static 成員中的 use 有 pair；有外層預設值的解構參數，其內層
預設值之間的讀取有 pair。

**Why this priority**: 三者都是漏報（missing pairs），範圍明確、彼此獨立。

**Independent Test**: 分析下列程式，比對 scope 清單與 pair。

**Acceptance Scenarios**:

1. **Given** KI §10 的程式（`function f(g = () =>` / `d) {` / `return g();`），**When** 分析，**Then** 箭頭函式是 `f` 的子
   scope；本體的 `return g();` 依既有規則不是呼叫敘述，不連結（plan U1）。[SRC KI §10；USR plan U1]
1b. **Given** 同上但本體為 `g();`（`probes/us4-1b.js`），**When** 分析，**Then** `g();` 連到該箭頭函式，`d` 有 pair
   `d: L1 -> L3`（預期的連帶變化）。[SRC KI §10；USR plan U1]
2. **Given** 參數解構中的預設值是函式（`function f({g = function () { return d; }}) {}`），**When** 分析，
   **Then** 該函式同樣是 scope。[SRC KI §10]
3. **Given** KI §11 的 `class Q { static { console.log(Q); } }`，**When** 分析，**Then** 有 `Q` 的 pair：class 名稱
   的定義到達 static block 中的 use。[SRC KI §11]
4. **Given** static 欄位 `static s = Q;`，**When** 分析，**Then** 同樣有 `Q` 的 pair。[SRC KI §11]
5. **Given** KI §17 的 `function h({x = d, y = x} = {}) {` / `}`，**When** 分析，**Then** 有 `x` 從其初始化節點到
   `y` 預設值的 pair；外層預設值 `{}` 只求值一次，內層名稱只定義一次。[SRC KI §17]
6. **Given** 沒有外層預設值的 `function h({x = d, y = x})`，**When** 分析，**Then** 結果與修正前相同。[SRC KI §17]

---

### User Story 5 - CLI 有 help，失敗時 exit status 非零 (Priority: P2)

使用者能查到用法，且能以 exit status 判斷執行成敗；同時啟動的多次執行不互相干擾。

**Why this priority**: 影響使用者與腳本整合，但不影響分析結果。

**Independent Test**: 以 CLI 執行下列命令，檢查輸出與 exit status。

**Acceptance Scenarios**:

1. **Given** `dujs --help`（或 `-h`），**When** 執行，**Then** 印出 usage（參數格式與範例），exit status 0，不建立
   輸出目錄。[SRC KI §12；USR D4]
2. **Given** 不帶任何參數，或參數中沒有任何頁面檔案，**When** 執行，**Then** 印出錯誤與 usage 到 stderr，exit
   status 非零，不建立輸出目錄。[SRC KI §12；USR D4]
3. **Given** 頁面檔案不存在或分析失敗（多個頁面時任一頁），**When** 執行，**Then** 立即中止、不輸出其餘頁面的
   結果，錯誤訊息印到 stderr，exit status 非零。[SRC KI §12；USR D5]
4. **Given** 同一目錄、同一秒內啟動兩次執行，**When** 兩者都完成，**Then** 兩次的輸出在不同目錄、內容完整。[SRC KI §12；USR D4]
5. **Given** 正常的分析，**When** 執行，**Then** exit status 0，輸出內容與修正前相同（目錄名稱規則除外）。[SRC KI §12]

---

### User Story 6 - 拆分節點的標籤與 for-in／for-of 邊界情形 (Priority: P3)

dot 輸出中拆分呼叫點的 CALL RETURN 節點可以區分；for-in／for-of 右側拆分時，迴圈本體的回邊不因節點缺少
原始碼範圍而被導向右側的決策。

**Why this priority**: §15 只影響標籤可讀性；§14 目前沒有已知程式會觸發，屬防禦性修正。

**Independent Test**: 分析 §15 的程式檢查 dot 標籤；§14 以單元層級建構沒有原始碼範圍的本體節點驗證。

**Acceptance Scenarios**:

1. **Given** KI §15 的 `log(c ? a : b);`，**When** 輸出 dot，**Then** 兩個 CALL RETURN 節點的標籤不同，各自帶
   所屬呼叫點的分支路徑。[SRC KI §15]
2. **Given** 未拆分的呼叫點，**When** 輸出 dot，**Then** CALL RETURN 標籤與修正前相同。[SRC KI §15]
3. **Given** for-of 右側被拆分且本體中有一個沒有原始碼範圍的前驅節點，**When** 重導進入迴圈的邊，**Then** 該
   節點的邊維持指向迴圈節點，不指向右側的決策。[SRC KI §14]
4. **Given** 外層 `while` 內的 for-of 右側被拆分、本體以 `break` 跳出（`while (c) {` / `k = 1;` / `for (var x of (s ?? [])) {` /
   `y = x;` / `break;` / `}` / `c = 0;` / `}`），**When** 分析，**Then** 結果與修正前相同（`s` 的 p-use 仍在）。[SRC USR Fable A2]

---

### Edge Cases

- `new A().m();` 中 A 沒有 constructor、沒有欄位：只連 `m`。[SRC USR D2]
- `o.m();` 中 `m` 是 getter／setter 或欄位中的箭頭函式：不連結（README 註明）。[SRC USR D2]
- `this.m();` 出現在 static 方法中：`this` 是 class 本身，只連 static 方法 `m`。[SRC USR D2]
- class 運算式（`var A = class { ... }`）的 `new A();`：依變數 `A` 的到達定義判定，與 class 宣告相同。[SRC USR D3]
- 呼叫環（`m(){ this.m(); }`、m↔n 互相呼叫）：不報錯，形成環的呼叫以 call 邊接回已展開的被呼叫端 entry，該被呼叫端
  exit 多一條 return 邊回到此呼叫的 CALL RETURN（FR-015）；呼叫前的區域定義依 FR-016 到達呼叫之後。[SRC USR D3]
- 函式內（含 constructor 內）的 `new A();`、`A.s();`，以及 `var o = new A(); o.p = 1; o.m();`：與既有 `f()` 同一規則，
  看不到定義即不連結、不成環，README 註明。[SRC USR D2]
- `var B = class { static s = B; }`、`var B = class Q { static s = Q; }`：本輪不產生 pair（§11 只修 class 宣告），
  具名運算式的內部名稱記入 known-issues 新節。[SRC KI §11]
- 方法 `n(p) { var t = 1; this.m(); x = t + p; }` 連結 `m` 後，`t: L? -> L?`、`p: entry -> L?` 仍在（FR-016）。[SRC USR Fable A1]
- 輸出目錄已存在（同名）時：改用另一個唯一名稱，不覆寫既有目錄。[SRC USR D4]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 決策節點條件中的變數讀取 MUST 一律記為 p-use，不受運算式形狀影響；呼叫（含 `new`）的引數 MUST 一律
  記為 c-use；非決策節點的 use 維持 c-use。[SRC KI §20；USR Fable A5]
- **FR-002**: 運算式為 `new <callee>(...)` 的敘述 MUST 是 call-site；callee 為函式時連到該函式。[SRC KI §21]
- **FR-003**: callee 為 class 時，`new` 敘述 MUST 依序連到該 class 的實例欄位初始化式（原始碼順序）與 constructor；
  有 `extends` 時不追 super class。[SRC USR D3]
- **FR-004**: 方法呼叫敘述 MUST 依 D2 的四種形式判定被呼叫的方法並連到其 scope；無法判定時不連結、不報錯。[SRC USR D2]
- **FR-005**: `new A().m();` MUST 先連建構（FR-003），再連方法 `m`。[SRC USR D2、D3]
- **FR-006**: 參數（含解構中）預設值裡的函式與箭頭函式 MUST 是所屬函式的子 scope，並如其他巢狀函式被分析。[SRC KI §10]
- **FR-007**: class 宣告的名稱在其 static 欄位初始化式與 static block 中的 use MUST 有 pair；執行順序為 superclass
  與 computed key → 定義 class 名稱 → static 成員（class 名稱的定義留在 class 節點，不移到 static 成員的 CALL RETURN）。
  [SRC KI §11]
- **FR-008**: 有外層預設值的解構參數，其內層預設值之間的讀取 MUST 有 pair；外層預設值只求值一次、內層名稱只定義一次。[SRC KI §17]
- **FR-009**: CLI MUST 支援 `--help`／`-h` 印出 usage 並以 0 結束；參數錯誤、沒有頁面、任何執行錯誤 MUST 印出訊息到
  stderr 並以非零結束；沒有頁面時不建立輸出目錄。[SRC KI §12；USR D4]
- **FR-010**: 每次 CLI 執行 MUST 使用唯一的輸出目錄，不與其他執行共用；MUST 先讀完所有頁面檔案才建立輸出目錄，
  分析或寫出中途失敗時 MUST 刪除本次執行的輸出目錄。[SRC USR D4、D5]
- **FR-011**: 拆分呼叫點的 CALL RETURN 節點在 dot 輸出中的標籤 MUST 帶所屬呼叫點的分支路徑；未拆分者不變。[SRC KI §15]
- **FR-012**: for-in／for-of 右側拆分時，前驅節點有原始碼範圍者 MUST 維持範圍判定；沒有範圍者 MUST 以支配關係判定
  （從 entry 不經過迴圈節點就到不了的前驅才算本體內），不得一律當成本體外。[SRC KI §14；USR Fable A2]
- **FR-013**: golden 的每一處差異（含 baseline 雜湊的改變）MUST 對應到本 feature 的某一項修正並記錄於
  `golden-diff.md`（沒有差異的節次明載「無差異」），`tests/golden/manifest.json` 隨之明確更新；沒有對應修正的差異視為
  回歸。MUST 新增涵蓋 §7、§11、§20、§21 的 golden fixture。[SRC USR D1、D7；Fable A8]
- **FR-014**: `docs/known-issues.md` 對應各節 MUST 標為已由本 feature 修正（保留原始描述），並新增一節記錄「屬性賦值
  `o.p = 1` 被當成 `o` 的 def」（應為 `o.p` 的 def 與 `o` 的 use，另開 feature）與「具名 class／函式運算式的內部名稱
  不是變數」，並記錄「`return f()` 等包在其他運算式中的呼叫也應視為 call-site」為後續項目（plan U1）；README 的限制 MUST 更新（新增的連結形式、Clarifications 列出的不連結形式、`var o = new A()` 不連
  constructor 而 `o.m()` 會連的不對稱、不追 super 鏈、遞迴以迴圈路徑表示、CLI 用法）。[SRC USR D1、D2、D3]
- **FR-015**: 形成呼叫環的呼叫 MUST NOT 讓分析失敗：以 call 邊接回已展開的同一被呼叫端的 entry，該被呼叫端的 exit
  加一條 return 邊回到此呼叫的 CALL RETURN 節點。階層資料與 `hierarchy.dot` MUST 能表示這條回邊；003 契約中「遇環
  丟錯」MUST 修訂；環中每個 scope 的 inter-procedural model 的內容 MUST 在 plan 中定義並以 m↔n 的完整預期驗收。
  [SRC USR D2、D3；Fable A4]
- **FR-016**: 呼叫端在被呼叫端看不到的變數（呼叫端的區域變數、參數、區塊 `let`／`const`）的定義 MUST 繞過被呼叫端，
  到達 CALL RETURN 之後，不被被呼叫端的 entry／exit kill；適用於所有連結的呼叫（含既有 `f()` 與遞迴回邊）。
  [SRC USR Fable A1]
- **FR-017**: 實例欄位的初始值本身就是 `this.m()` 或 `new B()` 時 MUST 視為 call-site（依 D2、D3 判定）；呼叫包在其他
  運算式中則不連結。[SRC USR D6；Fable A6]

### Key Entities
  依 H3，欄位初始化式的 scope 看不到外層 class，`f = new B();` 實際不會連結；README 註明，測試斷言不連（plan U2）。
- **Call-site**：連到被呼叫程式碼的節點；本輪擴充為函式呼叫敘述、`new` 敘述與可判定的方法呼叫敘述。
- **被呼叫端（callee）**：函式、方法、constructor 或實例欄位初始化式的 scope；同一 call-site 的多個被呼叫端依執行
  順序串接。
- **Golden 差異紀錄**：每項修正造成的 golden 變化及其對應的 KI 節次。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 本 spec 的全部驗收情境都有對應的自動化測試且通過。
- **SC-002**: KI §7、§10、§11、§12、§15、§17、§20、§21 的重現程式全部得到修正後的預期結果；§14 沒有重現程式，以
  US6 情境 3 的單元測試為準。
- **SC-003**: 既有測試全部通過；golden 差異 100% 有對應的修正記錄，沒有未說明的差異。
- **SC-004**: CLI 的 4 種失敗情形（無參數、無頁面、檔案不存在、分析錯誤）exit status 皆非零；help 與成功執行皆為 0。
- **SC-005**: 同一秒內並行啟動的兩次 CLI 執行，輸出完整且不互相覆寫（重複 10 次皆成立）。
- **SC-006**: 含直接遞迴與互相遞迴方法的程式都能完成分析（exit status 0），且呼叫端區域變數的 pair 不少於不連結時。

## Assumptions

- `new A().m();`、`o.m();` 等方法呼叫只在「呼叫敘述」形式下連結；在其他運算式中（`x = o.m()`）維持既有限制不連結。
- 方法查找只看該 class 本身定義的方法，不沿 `extends` 鏈查找（與 D3 不追 super 鏈一致）。
- 有 `extends` 的 class，欄位初始化式實際在 `super()` 返回後才執行；本輪近似為「先欄位、後 constructor 本體」，
  README 註明。
- 輸出目錄的唯一化方式（例如名稱衝突時加序號）由 plan 決定，只要不與既有目錄重複即可。
- §14 目前沒有已知程式會產生沒有原始碼範圍的本體節點，驗收以單元層級建構情境進行。
