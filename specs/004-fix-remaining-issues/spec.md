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

## 表示法

沿用 `specs/001-fix-known-issues/spec.md`「表示法」：def-use pair 寫成 `<變數>: <def> -> <use>`，`<def>` 為
`entry` 或節點標記；c-use 為節點標記；p-use 為 `<決策節點標記>><分支目標節點標記>`，目標不帶路徑時再加
`:T`／`:F`。節點標記為 `L<行>`、`entry` 或 `exit`。行號為被分析程式碼的行號（1 起算）。「intra-procedural」
「inter-procedural」「intra-page」指 dujs 產出的對應模型。驗收程式一行一個節點來源。

## User Scenarios & Testing *(mandatory)*

使用者為以 dujs 分析 client-side JavaScript 資料流程的研究者或工具開發者，透過 CLI 或函式庫 API
取得四層模型與 def-use pair。

### User Story 1 - 條件中巢狀運算式之後的 use 仍是 p-use (Priority: P1)

決策節點條件中的每個變數讀取都是 p-use，不受它前面是否有巢狀的二元、一元運算或呼叫影響。

**Why this priority**: 錯把 p-use 記成 c-use 會讓分支覆蓋相關的測試需求消失，影響範圍廣且修正面小。

**Independent Test**: 分析下列程式，比對 intra-procedural 的 pair。

**Acceptance Scenarios**:

1. **Given** `var a = 1, b = 2, c = 3;` / `if (a + b >= c) {` / `a = 0;` / `}`，**When** 分析，**Then** `c` 的
   pair 為 `c: L1 -> L2>L3:T` 與 `c: L1 -> L2>exit:F`，沒有 c-use `c: L1 -> L2`；`a`、`b` 維持 p-use。[SRC KI §20]
2. **Given** 條件為 `-a < c`，**When** 分析，**Then** `a` 與 `c` 都是 p-use。[SRC KI §20]
3. **Given** `while (f(a) < c)`，**When** 分析，**Then** `a` 與 `c` 都是 p-use。[SRC KI §20]
4. **Given** 非決策節點中的同類運算式（`x = a + b >= c;`），**When** 分析，**Then** 三者仍是 c-use（行為不變）。[SRC KI §20]

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

1. **Given** KI §10 的程式（`function f(g = () =>` / `d) {`），**When** 分析，**Then** 箭頭函式是 `f` 的子 scope，
   其本體被分析，`d` 在其中的 use 有 pair（同一般巢狀函式）。[SRC KI §10]
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

---

### Edge Cases

- `new A().m();` 中 A 沒有 constructor、沒有欄位：只連 `m`。[SRC USR D2]
- `o.m();` 中 `m` 是 getter／setter 或欄位中的箭頭函式：不連結（README 註明）。[SRC USR D2]
- `this.m();` 出現在 static 方法中：`this` 是 class 本身，只連 static 方法 `m`。[SRC USR D2]
- class 運算式（`var A = class { ... }`）的 `new A();`：依變數 `A` 的到達定義判定，與 class 宣告相同。[SRC USR D3]
- 遞迴的建構（constructor 中 `new A();`）：比照既有遞迴呼叫處理，不得無限展開。[SRC USR D3]
- 輸出目錄已存在（同名）時：改用另一個唯一名稱，不覆寫既有目錄。[SRC USR D4]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 決策節點條件中的每個變數讀取 MUST 記為 p-use，不受其前方巢狀的二元、一元運算或呼叫影響；非決策
  節點的 use 維持 c-use。[SRC KI §20]
- **FR-002**: 運算式為 `new <callee>(...)` 的敘述 MUST 是 call-site；callee 為函式時連到該函式。[SRC KI §21]
- **FR-003**: callee 為 class 時，`new` 敘述 MUST 依序連到該 class 的實例欄位初始化式（原始碼順序）與 constructor；
  有 `extends` 時不追 super class。[SRC USR D3]
- **FR-004**: 方法呼叫敘述 MUST 依 D2 的四種形式判定被呼叫的方法並連到其 scope；無法判定時不連結、不報錯。[SRC USR D2]
- **FR-005**: `new A().m();` MUST 先連建構（FR-003），再連方法 `m`。[SRC USR D2、D3]
- **FR-006**: 參數（含解構中）預設值裡的函式與箭頭函式 MUST 是所屬函式的子 scope，並如其他巢狀函式被分析。[SRC KI §10]
- **FR-007**: class 名稱在其 static 欄位初始化式與 static block 中的 use MUST 有 pair。[SRC KI §11]
- **FR-008**: 有外層預設值的解構參數，其內層預設值之間的讀取 MUST 有 pair；外層預設值只求值一次、內層名稱只定義一次。[SRC KI §17]
- **FR-009**: CLI MUST 支援 `--help`／`-h` 印出 usage 並以 0 結束；參數錯誤、沒有頁面、任何執行錯誤 MUST 印出訊息到
  stderr 並以非零結束；沒有頁面時不建立輸出目錄。[SRC KI §12；USR D4]
- **FR-010**: 每次 CLI 執行 MUST 使用唯一的輸出目錄，不與其他執行共用。[SRC USR D4]
- **FR-011**: 拆分呼叫點的 CALL RETURN 節點在 dot 輸出中的標籤 MUST 帶所屬呼叫點的分支路徑；未拆分者不變。[SRC KI §15]
- **FR-012**: for-in／for-of 右側拆分時，判定前驅節點是否在迴圈本體內 MUST 不依賴該節點是否有原始碼範圍。[SRC KI §14]
- **FR-013**: golden 的每一處差異 MUST 對應到本 feature 的某一項修正並記錄於 `golden-diff.md`；沒有對應修正的
  差異視為回歸。[SRC USR D1、D7]
- **FR-014**: `docs/known-issues.md` 對應各節 MUST 標為已由本 feature 修正（保留原始描述）；README 的限制 MUST 更新
  （新增的連結形式、未連結的形式、不追 super 鏈、CLI 用法）。[SRC USR D1、D2、D3]

### Key Entities

- **Call-site**：連到被呼叫程式碼的節點；本輪擴充為函式呼叫敘述、`new` 敘述與可判定的方法呼叫敘述。
- **被呼叫端（callee）**：函式、方法、constructor 或實例欄位初始化式的 scope；同一 call-site 的多個被呼叫端依執行
  順序串接。
- **Golden 差異紀錄**：每項修正造成的 golden 變化及其對應的 KI 節次。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 本 spec 的全部驗收情境都有對應的自動化測試且通過。
- **SC-002**: KI §7、§10、§11、§12、§14、§15、§17、§20、§21 的重現程式全部得到修正後的預期結果。
- **SC-003**: 既有測試全部通過；golden 差異 100% 有對應的修正記錄，沒有未說明的差異。
- **SC-004**: CLI 的 4 種失敗情形（無參數、無頁面、檔案不存在、分析錯誤）exit status 皆非零；help 與成功執行皆為 0。
- **SC-005**: 同一秒內並行啟動的兩次 CLI 執行，輸出完整且不互相覆寫（重複 10 次皆成立）。

## Assumptions

- `new A().m();`、`o.m();` 等方法呼叫只在「呼叫敘述」形式下連結；在其他運算式中（`x = o.m()`）維持既有限制不連結。
- 方法查找只看該 class 本身定義的方法，不沿 `extends` 鏈查找（與 D3 不追 super 鏈一致）。
- 有 `extends` 的 class，欄位初始化式實際在 `super()` 返回後才執行；本輪近似為「先欄位、後 constructor 本體」，
  README 註明。
- 輸出目錄的唯一化方式（例如名稱衝突時加序號）由 plan 決定，只要不與既有目錄重複即可。
- §14 目前沒有已知程式會產生沒有原始碼範圍的本體節點，驗收以單元層級建構情境進行。
