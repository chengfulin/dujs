# Feature Specification: 修正已知問題（#1–#6、#8）

**Feature Branch**: `001-fix-known-issues`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "在新 branch 上，基於目前已知的 issue（PR #2 code review 確認的已知問題）與使用者討論並修正"

## 規格來源

| 簡稱 | 路徑 | 權威範圍 |
|------|------|----------|
| KI | `docs/known-issues.md` | 各問題的重現輸入與目前錯誤結果（§1–§9 對應檔內問題編號） |
| USR | 本 feature 的需求討論（2026-11-11、2026-11-15，記錄於本 spec 的「範圍決策」） | 修正範圍與各問題的建模方向 |

範圍對照：

| User Story | 來源 |
|------------|------|
| US1 | KI §1；USR D2 |
| US2 | KI §2、§3；USR D4、D10、D11、D12 |
| US3 | KI §4；USR D5、D7 |
| US4 | KI §5 |
| US5 | KI §6；USR D3、D8、D9、D12、D13；G-1 |
| US6 | KI §8；USR D6 |

### 範圍決策（USR）

- **D1**：本輪修正 KI §1–§6 與 §8；§7（class 方法呼叫連結）與 §9（程式風格與紀錄）不在本輪範圍。
- **D2**：KI §1 採完整建模：labeled `break`／`continue` 跳到對應的敘述；`debugger` 視為一般敘述；
  `with` 本體內的名稱照一般規則解析（不推斷物件屬性），並於 README 註明此限制。
- **D3**：KI §6 不在既有分支節點中的條件運算式，在控制流程圖中拆出分支；範圍涵蓋 `?:`（含巢狀）
  與短路運算子 `&&`、`||`、`??`。
- **D4**：KI §2 帶預設值的參數（含參數解構中的預設值）在函式 entry 之後依參數順序各自有一個初始化節點，
  預設值運算式的 use 與該參數的 def 都在此節點；沒有預設值的參數維持在 entry 定義。（原議 use 歸屬
  entry，clarify 前改為此案：entry 上的 def 與 use 無法配對，前面的參數會漏報。）
- **D7**：KI §4 static 欄位初始化式與 static block 的 scope 接在 class 宣告節點（class 定義時執行）；
  實例欄位初始化式的 scope 不接入外層流程（屬 KI §7 範圍），README 註明。
- **D8**：D3 的短路運算一併包含邏輯指派 `||=`、`&&=`、`??=`。
- **D9**：測試輔助工具的 p-use 記法加上分支標記（`L<決策行>>L<目標行>:T`／`:F`），以區分同一行內的
  true／false 分支。（目標節點帶分支路徑時的省略規則見 D13。）
- **D10**：預設值運算式本身含 `?:` 或短路運算時，比照 D3 拆出分支；依 D12，該參數在每個葉分支各自定義。
- **D11**：參數解構中每個帶預設值的名稱各有一個初始化節點，依出現順序。
- **D5**：KI §4 每個 class 欄位初始化式與 static block 各自成為一個 scope。
- **D6**：KI §8 同一個父 scope 下的同名 scope，第一個保留原名，之後依原始碼出現順序加 `_1`、`_2`…
  後綴（同 TypeScript 降轉的衝突改名方式）。
- **D12**（2026-11-15）：D3／D8 的拆分一律採「等效 if/else 轉換」：`a = c ? x : y` 等效為
  `if (c) { a = x; } else { a = y; }`；`x = a && b` 等效為 `if (a) { x = b; } else { x = a; }`（`||`、`??`
  依短路條件比照）。條件或短路運算包在較大的運算式中時（`x = 1 + (c ? a : b)`、`f(c ? a : b)`），
  分支之後的剩餘運算與定義在每個葉分支各複製一份（`if (c) { x = 1 + a; } else { x = 1 + b; }`）；
  每個葉分支各有自己的 def，不設匯合後才定義的節點；在條件之前已求值的部分留在決策節點之前，維持求值
  順序；不引入暫存變數。同一敘述有多個並列的條件時，複製數為各條件葉分支數的乘積。
  （取代原「拆出分支後匯合再定義」的建模：匯合只留下一個 def，會遺失「哪個分支的值流到哪裡」的 pair。）
  短路運算的左運算元只在決策節點求值一次，葉分支取用其值時不重讀、不重算（`x = a && b` 的 false 葉只
  定義 `x`）；剩餘運算中的呼叫隨葉分支複製（每個葉都是呼叫點），函式／class 運算式只有一個 scope、不隨
  葉複製；不設複製上限。條件出現在既有決策節點的條件中時（`if (a && b)`），條件之後只剩分支、沒有 def，
  不複製本體，內層決策的分支直接接到原敘述的 true／false 目標。沒有任何運算的分支（`a ||= b` 的 true
  分支）不建節點，直接接到後繼。（細節見 Clarifications 2026-11-16）
- **D13**（2026-11-15）：測試輔助工具的節點標記加上分支路徑：由 D12 拆出、位於某條件分支內的節點（葉
  節點與內層決策節點）標為 `L<行>:<路徑>`，行號為原敘述所在行，路徑為從該敘述第一個拆出的決策起、依求值
  順序沿途 `T`／`F` 的序列（如 `L1:T`、巢狀 `L1:TF`），def 與 use 皆適用；敘述的第一個決策、未拆分的
  節點與拆分後接回的原有節點（如 if 本體）維持 `L<行>`。p-use 的目標節點標記帶路徑時省略分支標記（路徑
  最後一碼即分支，如 `L3>L3:F`）；目標不帶路徑時維持 `:T`／`:F`（如 `L4>L5:T`）。

### 來源缺口（G）

- **G-1**：需求討論中以探針重現發現（KI 未記錄）：條件只有單一識別字時（`if (a)`、`while (a)`），
  `a` 的 use 完全沒有被記錄；`if (a && b)` 的 `a`、`b` 被記為 c-use 而非 p-use。因 D3 要把短路運算元
  拆成分支節點，單一識別字的分支節點必須能產生 p-use，故納入 US5。

## Clarifications

### Session 2026-11-16

- Q: 條件或短路運算出現在 if／while／for 的條件裡時（`if (a && b) { S }`），要不要把本體 S 複製到每個葉
  分支？ → A: 不複製；內層決策的分支直接接到原敘述的 true／false 目標（條件之後只剩分支、沒有 def，不會
  遺失定義）。
- Q: 短路運算的葉分支要不要再讀一次左運算元（`x = a && b` 的 false 葉、`x = f() && b`）？ → A: 不重讀；
  左運算元只在決策節點求值一次，葉節點只定義目標變數，識別字與非識別字同一規則（重讀產生的 c-use 必與
  決策的 p-use 同路徑，沒有額外測試意義）。
- Q: p-use 目標為拆出的葉節點時，`L3>L3:F:F` 的分支標記重複，記法怎麼定？ → A: 目標節點標記帶路徑時省略
  分支標記（`L3>L3:F`）；目標不帶路徑時維持 `:T`／`:F`（`L4>L5:T`）。
- Q: 邏輯指派中什麼都不做的分支（`a ||= b` 的 true 分支）的 p-use 指向哪裡？ → A: 不建空節點，直接指向
  後繼節點（最後一行時為 exit）。
- Q: 複製剩餘運算時遇到呼叫或函式運算式要怎麼處理、複製數是否設上限？ → A: 呼叫點隨葉複製，各自連到同一
  個被呼叫端；函式／class 運算式只有一個 scope；不設上限，README 註明並列條件會使節點數以乘積成長。
- Q: 條件或短路運算出現在 switch 的判斷式（`switch (c ? a : b)`）時怎麼拆？ → A: 比照既有決策節點：不複製
  case 本體，判斷式拆出的每個葉各自接到原 switch 的第一個 case 比對；case 節點不重讀判斷式中的變數。

#### 延後釐清

- 測試輔助工具以字串去重；同一行有多個敘述時（`var a = c ? 1 : 2, b = d ? 3 : 4;`），拆出的節點標記會
  碰撞，p-use 的省略記法也可能有歧義。暫定驗收情境一律一行一個敘述，碰撞列為輔助工具的已知限制；
  analyze 時重新評估是否需要序號。[clarifier M2]

## 表示法

驗收情境以測試輔助工具（`tests/helpers/analyze.js`）的格式描述 def-use pair：`<變數>: <def> -> <use>`。
`<def>` 為 `entry` 或節點標記；c-use 為節點標記；p-use 為 `<決策節點標記>><分支目標節點標記>`，目標不帶
路徑時再加 `:T` 或 `:F`（true／false 分支；USR D9、D13）。節點標記為 `L<行>`、`entry` 或 `exit`；由條件或
短路運算拆出、位於分支內的節點為 `L<行>:<路徑>`（如 `L2:T`、`L1:TF`；USR D13）。短路運算的 true／false
指等效 if 的條件結果：`&&`、`||`、`&&=`、`||=` 為 `if (a)`，`??`、`??=` 為 `if (a != null)`。範例：
`a: L1 -> L2>L2:F`（`a` 在 L2 判斷為 false，進入 L2 的 F 葉）、`a: L1 -> L2>L5:F`（進入 L5）。行號為被分析程式碼的
行號（1 起算）。「intra-procedural」「intra-page」指 dujs 產出的對應模型。

## User Scenarios & Testing *(mandatory)*

使用者為以 dujs 分析 client-side JavaScript 資料流程的研究者或工具開發者，透過 CLI 或函式庫 API
取得四層模型與 def-use pair。

### User Story 1 - 含 labeled／with／debugger 的程式可以完成分析 (Priority: P1)

使用者分析含有 labeled statement、`with` 或 `debugger` 的程式時，分析不再拋出錯誤，CLI 正常產出結果，
且 labeled `break`／`continue` 的控制流程正確。[SRC KI §1] [SRC USR D2]

**Why this priority**: 目前這些語法會讓整個分析中止、沒有任何輸出，是唯一會讓工具完全不可用的問題。

**Independent Test**: 以 KI §1 的三段重現輸入與下列情境執行分析，確認無例外且 pair 符合預期。

**Acceptance Scenarios**:

1. **Given** 程式 `var a = 1;` / `l: a = 2;` / `console.log(a);`，**When** 分析，**Then** 不拋錯，且
   intra-procedural 含 `a: L2 -> L3`、不含 `a: L1 -> L3`。[SRC KI §1]
2. **Given** 程式
   ```js
   var a = 0;
   outer: for (var i = 0; i < 2; i++) {
     for (var j = 0; j < 2; j++) {
       if (j) break outer;
       a = 1;
     }
   }
   console.log(a);
   ```
   **When** 分析，**Then** `break outer` 的下一步是 L8（外層迴圈之後），因此 intra-procedural 同時含
   `a: L1 -> L8` 與 `a: L5 -> L8`。[SRC USR D2]
3. **Given** 把情境 2 的 `break outer` 改為 `continue outer`，**When** 分析，**Then** `continue outer`
   的下一步是外層迴圈的更新式 `i++`（L2），而非內層迴圈。[SRC USR D2]
4. **Given** 程式 `var a = 0, c = 1;` / `l: {` / `  if (c) break l;` / `  a = 1;` / `}` / `console.log(a);`，
   **When** 分析，**Then** intra-procedural 同時含 `a: L1 -> L6` 與 `a: L4 -> L6`。[SRC USR D2]
5. **Given** 程式 `var o = {}, x = 1;` / `with (o) {` / `  console.log(x);` / `  p = 1;` / `}`，**When**
   分析，**Then** 不拋錯，含 `o: L1 -> L2` 與 `x: L1 -> L3`。[SRC KI §1] [SRC USR D2]
6. **Given** 程式 `var a = 1;` / `debugger;` / `console.log(a);`，**When** 分析，**Then** 不拋錯，且含
   `a: L1 -> L3`。[SRC KI §1]
7. **Given** 上述任一程式存成檔案，**When** 以 CLI 執行 `dujs -js <檔案>`，**Then** 結束碼為 0 並產出四層
   模型的輸出檔。[SRC KI §1]

---

### User Story 2 - 預設參數與 `new` 的參數被記為 use (Priority: P1)

使用者分析使用預設參數或 `new` 運算式的程式時，這些運算式讀取的變數會出現在 def-use pair 中。
[SRC KI §2] [SRC KI §3] [SRC USR D4]

**Why this priority**: 遺漏 use 會讓資料流分析結果漏報，`new X(a)` 與 `throw new Error(a)` 是極常見寫法。

**Independent Test**: 以 KI §2、§3 的重現輸入（必要時加上呼叫敘述）執行分析，確認新增的 pair。

**Acceptance Scenarios**:

1. **Given** 程式 `var a = 1;` / `var o = new X(a);` / `throw new Error(a);`，**When** 分析，**Then**
   intra-procedural 含 `a: L1 -> L2` 與 `a: L1 -> L3`。[SRC KI §3]
2. **Given** 程式 `var a = [1];` / `var o = new X(...a);`，**When** 分析，**Then** 含 `a: L1 -> L2`。
   [SRC KI §3]
3. **Given** 程式
   ```js
   var d = 1;
   function f(a, b = a + d) {
     return b;
   }
   f(1);
   ```
   **When** 分析，**Then** f 在 entry 之後有 `b` 的初始化節點（L2）；intra-page 含 `d: L1 -> L2`
   （目前沒有這筆）與 `b: L2 -> L3`，不再有 `b: entry -> L3`。[SRC KI §2] [SRC USR D4]
4. **Given** 情境 3 中預設值讀取前面的參數 `a`，**When** 分析，**Then** f 的 intra-procedural 含
   `a: entry -> L2`（`a` 無預設值，仍在 entry 定義）。[SRC KI §2] [SRC USR D4]
5. **Given** 箭頭函式 `const g = (x = d) => x;` 與參數解構預設 `function h({x = d}) {}`，且兩者皆被呼叫，
   **When** 分析，**Then** 兩者各有參數初始化節點，`d` 的外層定義被記為該節點的 use；`h` 的 `x` 定義在
   該節點。[SRC KI §2] [SRC USR D4]
6. **Given** 沒有任何預設值的函式（含既有 ES5 golden fixtures），**When** 分析，**Then** 不產生參數初始化
   節點；除 FR-001、FR-004、FR-007、FR-008、FR-009、FR-014 造成的差異外，輸出與現在相同。[SRC USR D4]
7. **Given** `function h({x = d, y = x}) {}` 被呼叫，**When** 分析，**Then** `x`、`y` 依序各有初始化節點，
   `y` 的預設值讀到 `x` 在其初始化節點的 def。[SRC USR D11]
8. **Given** 程式 `var a = 0, d = 1;` / `function k(b = a || d) {` / `  return b;` / `}` / `k();`，**When**
   分析，**Then** `b` 的初始化節點（L2）是判斷 `a` 的決策：true 葉 `L2:T` 只定義 `b`（取 `a` 的值，不重讀），
   false 葉 `L2:F` 讀 `d` 並定義 `b`；intra-page 含 `a: L1 -> L2>L2:T`、`a: L1 -> L2>L2:F`、`d: L1 -> L2:F`、
   `b: L2:T -> L3`、`b: L2:F -> L3`，不含 `d: L1 -> L2:T`。[SRC USR D10] [SRC USR D12]

---

### User Story 3 - class 欄位初始化式與 static block 成為 scope (Priority: P2)

使用者分析含 class 欄位與 static block 的程式時，其中讀取的外層變數與區域變數會出現在 def-use pair 中。
[SRC KI §4] [SRC USR D5]

**Why this priority**: 屬遺漏 use，但 class 欄位與 static block 的使用頻率低於 US2。

**Independent Test**: 以 KI §4 的重現輸入執行分析，確認新 scope 存在且 pair 正確。

**Acceptance Scenarios**:

1. **Given** KI §4 的程式（`var v = 1;` / `class A {` / `  f = v;` / `  static {` / `    console.log(v);` /
   `  }` / `}`），**When** 分析，**Then** scope 清單中有欄位 `f` 初始化式與 static block 各自的 scope。
   [SRC KI §4] [SRC USR D5]
2. **Given** 同上程式，**When** 分析，**Then** static block 的 scope 接在 class 宣告節點，intra-page 含
   `v: L1 -> L5`；實例欄位 `f` 的 scope 不接入外層流程，intra-page 不含 `v: L1 -> L3`（README 註明）。
   [SRC KI §4] [SRC USR D7]
3. **Given** 程式 `var v = 1;` / `class C {` / `  static s = v;` / `}`，**When** 分析，**Then** intra-page 含
   `v: L1 -> L3`。[SRC USR D7]
4. **Given** 程式 `class B {` / `  static {` / `    let t = 1;` / `    console.log(t);` / `  }` / `}`，
   **When** 分析，**Then** 該 static block 的 intra-procedural 含 `t: L3 -> L4`。[SRC USR D5]
5. **Given** 欄位初始化式與 static block 之外的 class 成員（方法、computed key、`extends`），**When**
   分析，**Then** 既有行為不變。[SRC KI §4]

---

### User Story 4 - 連鎖指派不把內層目標當成 use (Priority: P2)

使用者分析 `a = b = 1` 這類連鎖指派時，不再得到內層目標 `b` 的錯誤 pair。[SRC KI §5]

**Why this priority**: 錯誤 pair 會誤導分析結果，修正範圍小。

**Independent Test**: 以 KI §5 的重現輸入執行分析。

**Acceptance Scenarios**:

1. **Given** 程式 `var a, b;` / `a = b = 1;` / `console.log(a);`，**When** 分析，**Then** 不含
   `b: L1 -> L2`，含 `a: L2 -> L3`。[SRC KI §5]
2. **Given** 程式 `var a, b;` / `var c = a = b = 1;` / `console.log(a, b);`，**When** 分析，**Then** 不含
   `a: L1 -> L2` 與 `b: L1 -> L2`，含 `a: L2 -> L3` 與 `b: L2 -> L3`。[SRC KI §5]
3. **Given** 內層為複合或邏輯指派（`a = b += 1`、`a ||= b ||= 1`），**When** 分析，**Then** 內層目標
   `b` 因被其運算子讀取而保留 `b: L<def> -> L<該行>` 的 pair（這是正確的 use，不是本問題）。[SRC KI §5]

---

### User Story 5 - 條件運算式與短路運算子拆出分支 (Priority: P2)

使用者分析含 `?:`、`&&`、`||`、`??` 的程式時，這些運算子的左運算元（或條件）成為具 true／false
分支的決策點，產生正確的 p-use，且不再出現沒有目標的 p-use。[SRC KI §6] [SRC USR D3] [G-1]

**Why this priority**: 錯誤 pair 會讓測試輔助工具拋錯；拆分支會改變控制流程圖與既有輸出，影響面最大，
排在較小的修正之後。

**Independent Test**: 以 KI §6 的重現輸入與下列情境執行分析，確認 p-use 的分支目標都存在。

**Acceptance Scenarios**:

1. **Given** KI §6 的程式（`var a = 1, b = 2;` / `var c = a ? b : 3;` / `console.log(c);`），**When** 分析，
   **Then** 不再有 `a (2,(3,null))` 這類目標為空的 p-use；依等效 if/else，L2 的決策之後是 `c = b`（`L2:T`）
   與 `c = 3`（`L2:F`）兩個葉節點；intra-procedural 含 `a: L1 -> L2>L2:T`、`a: L1 -> L2>L2:F`、
   `b: L1 -> L2:T`、`c: L2:T -> L3`、`c: L2:F -> L3`，不含 `b: L1 -> L2:F`。
   [SRC KI §6] [SRC USR D3] [SRC USR D12] [SRC USR D13]
2. **Given** `var a = 1, b = 2;` / `var c = a ? (b ? 1 : 2) : 3;` / `console.log(c);`，**When** 分析，
   **Then** `b` 的決策節點為 `L2:T`（只在 `a` 的 true 分支上）；含 `a: L1 -> L2>L2:T`、`a: L1 -> L2>L2:F`、
   `b: L1 -> L2:T>L2:TT`、`b: L1 -> L2:T>L2:TF`、`c: L2:TT -> L3`、`c: L2:TF -> L3`、`c: L2:F -> L3`。
   [SRC USR D3] [SRC USR D12] [SRC USR D13]
3. **Given** `var a = 1, b = 2;` / `var c = a && b;` / `console.log(c);`，**When** 分析，**Then** 依等效
   `if (a) { c = b; } else { c = a 的值; }`：含 `a: L1 -> L2>L2:T`、`a: L1 -> L2>L2:F`、`b: L1 -> L2:T`、
   `c: L2:T -> L3`、`c: L2:F -> L3`，不含 `a: L1 -> L2:F`（左運算元不重讀）。把 `&&` 換成 `||` 時 `b` 的
   use 改在 `L2:F`；換成 `??` 時以「`a` 不是 null／undefined」為 true，`b` 的 use 也在 `L2:F`。
   [SRC USR D3] [SRC USR D12]
4. **Given** `var a = 1, b = 2;` / `if (a && b) {` / `  b = 3;` / `}`，**When** 分析，**Then** `a`、`b` 都是
   p-use（不是 c-use），`b` 的決策節點為 `L2:T`，if 本體不複製：含 `a: L1 -> L2>L2:T`、`a: L1 -> L2>exit:F`、
   `b: L1 -> L2:T>L3:T`、`b: L1 -> L2:T>exit:F`。[SRC USR D3] [SRC USR D12] [G-1]
5. **Given** `var a = 1, b;` / `if (a) {` / `  b = 3;` / `}` / `console.log(b);`，**When** 分析，
   **Then** 含 `a: L1 -> L2>L3:T` 與 `a: L1 -> L2>L5:F` 兩筆 p-use。`while (a)` 等其他以單一識別字為條件的
   敘述同樣產生 p-use。[G-1]
6. **Given** `var a = 0, b = 1;` / `a ||= b;` / `console.log(a);`，**When** 分析，**Then** 依等效
   `if (a) {} else { a = b; }`，true 分支不建節點、直接接到 L3：含 `a: L1 -> L2>L3:T`、`a: L1 -> L2>L2:F`、
   `b: L1 -> L2:F`、`a: L1 -> L3`、`a: L2:F -> L3`。`&&=` 的 `a = b` 葉在 true 分支（`L2:T`），false 分支直接
   接到 L3；`??=` 以「`a` 不是 null／undefined」為 true，同 `||=`。[SRC USR D8] [SRC USR D12]
7. **Given** 所有拆出分支後的模型，**When** 以測試輔助工具取得 pair，**Then** 每一筆 p-use 的分支目標
   都存在（輔助工具不拋錯）。[SRC KI §6]
8. **Given** `var a = 1, b = 2, c = 1, y = 0;` / `var x = y + (c ? a : b);` / `console.log(x);`，**When**
   分析，**Then** `y` 在判斷 `c` 之前求值，其 use 是 L2 決策節點的 c-use；葉節點 `L2:T`（`x = y 的值 + a`）與
   `L2:F`（`x = y 的值 + b`）不重讀 `y`：含 `y: L1 -> L2`、`c: L1 -> L2>L2:T`、`c: L1 -> L2>L2:F`、
   `a: L1 -> L2:T`、`b: L1 -> L2:F`、`x: L2:T -> L3`、`x: L2:F -> L3`，沒有匯合後的單一 def。
   [SRC USR D12] [SRC USR D13]
9. **Given** `var a = 1, b = 0;` / `var x = (a ? 1 : 2) + (b ? 3 : 4);` / `console.log(x);`，**When** 分析，
   **Then** `b` 的決策在 `a` 的兩個分支各有一份（`L2:T`、`L2:F`）：含 `b: L1 -> L2:T>L2:TT`、
   `b: L1 -> L2:T>L2:TF`、`b: L1 -> L2:F>L2:FT`、`b: L1 -> L2:F>L2:FF`，以及 `x: L2:TT -> L3`、
   `x: L2:TF -> L3`、`x: L2:FT -> L3`、`x: L2:FF -> L3`。[SRC USR D12]
10. **Given** `var c = 1, a = 1, b = 2;` / `log(c ? a : b);` / `function log(v) { return v; }`，**When** 分析，
    **Then** `L2:T`（`log(a);`）與 `L2:F`（`log(b);`）都是 `log` 的呼叫點，inter-procedural 模型中兩者各自
    連到同一個 `log` scope；含 `a: L1 -> L2:T`、`b: L1 -> L2:F`。[SRC USR D12]
10b. **Given** `var c = 1, a = 1, b = 2;` / `var x = log(c ? a : b);` / `console.log(x);` /
    `function log(v) { return v; }`，**When** 分析，**Then** 含 `a: L1 -> L2:T`、`b: L1 -> L2:F`、
    `x: L2:T -> L3`、`x: L2:F -> L3`（宣告右側的呼叫依 README 既有限制不連為呼叫點，本情境不驗呼叫連結）。
    [SRC USR D12]
11. **Given** `var c = 1, a = 1;` / `var x = (c ? 1 : 2) + run(function () { return a; });`，**When** 分析，
    **Then** 匿名函式只有一個 scope（不因複製成為兩個），其中 `a` 的 pair 不重複。[SRC USR D12]
12. **Given** `function f(c, a, b) {` / `  return c ? a : b;` / `}` / `f(1, 2, 3);`，**When** 分析，**Then** f 的
    intra-procedural 含 `c: entry -> L2>L2:T`、`c: entry -> L2>L2:F`、`a: entry -> L2:T`、`b: entry -> L2:F`，
    `L2:T`、`L2:F` 兩個 return 葉都接到 exit。[SRC USR D12]
13. **Given** `var c = 1, a = 1, b = 2;` / `switch (c ? a : b) {` / `  case 1:` / `    console.log(a);` / `}`，
    **When** 分析，**Then** case 本體不複製，`L2:T`（取 `a`）與 `L2:F`（取 `b`）都接到 L3 的 case 比對：含
    `c: L1 -> L2>L2:T`、`c: L1 -> L2>L2:F`、`a: L1 -> L2:T`、`b: L1 -> L2:F`，且每筆 p-use 的分支目標都存在。
    [SRC USR D12]

---

### User Story 6 - block 內同名函式的 scope 名稱唯一 (Priority: P3)

使用者以名稱查詢 scope 時，兩個 block 內各自宣告的同名函式可以分別查到。[SRC KI §8] [SRC USR D6]

**Why this priority**: 只影響以名稱查詢 scope 的情境，不影響 pair 本身。

**Independent Test**: 以 KI §8 的重現輸入執行分析，確認 scope 名稱清單。

**Acceptance Scenarios**:

1. **Given** KI §8 的程式（兩個 block 各宣告 `function f() {}`），**When** 分析，**Then** scope 名稱為
   `$DOMAIN.$PAGE_0.f` 與 `$DOMAIN.$PAGE_0.f_1`，且以這兩個名稱各自查到不同的 scope。
   [SRC KI §8] [SRC USR D6]
2. **Given** 三個同名函式，**When** 分析，**Then** 名稱依原始碼順序為 `f`、`f_1`、`f_2`。[SRC USR D6]
3. **Given** 沒有重名的程式（含既有 golden 測試的 fixtures），**When** 分析，**Then** scope 名稱與現在完全
   相同。[SRC USR D6]
4. **Given** 原始碼本身就有名為 `f_1` 的函式與兩個同名 `f`，**When** 分析，**Then** 所有 scope 名稱仍然
   唯一（後綴跳過已被使用的名稱）。[SRC USR D6]
5. **Given** 宣告在含 `let`／`const` 的 block 中的函式，**When** 分析，**Then** 名稱仍以該 block scope 為
   父（如 `$DOMAIN.$PAGE_0.$BLOCK_0.f`），只有同一個父 scope 下重名時才加後綴。[SRC KI §8]

---

### Edge Cases

- labeled 敘述標記的不是迴圈或 block（如 `l: a = 2;`）：label 不影響流程。[SRC KI §1]
- 未加 label 的 `break`／`continue` 在 labeled 迴圈內：行為與現在相同。[SRC USR D2]
- `with` 本體內未宣告的名稱（KI §1 的 `p = 1`）：照一般規則解析，不視為 `o` 的屬性；README 註明此限制。
  [SRC USR D2]
- 條件運算式與短路運算子出現在既有決策節點中（`if (a ? b : c)`、`while (a || b)`、`switch (c ? a : b)`）：
  不複製本體（switch 時判斷式的每個葉接到第一個 case 比對）；內層決策
  節點依 D13 標路徑，最後一層決策的分支接到原敘述的 true／false 目標。[SRC USR D3] [SRC USR D12]
- 同一敘述有很多並列條件時，葉節點數為各條件葉數的乘積（不設上限）；README 註明。[SRC USR D12]
- 可選鏈 `a?.b` 雖然也是短路，不在本輪拆分範圍（維持現狀）。[SRC USR D3]
- 既有 ES5 golden fixtures：只會因 FR-001（labeled／`with`／`debugger`）、FR-004（`new` 的參數）、FR-007
  （連鎖指派）、FR-008（`?:`、`&&`、`||`）、FR-009（單一識別字條件）與 FR-014（記法）改變；ES5 沒有預設
  參數、class 欄位、`??` 與邏輯指派。[SRC KI §6] [G-1]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 分析 MUST 能處理 labeled statement、`with`、`debugger`，不拋出例外。[SRC KI §1]
- **FR-002**: labeled `break` MUST 跳到被標記敘述之後；labeled `continue` MUST 跳到被標記迴圈的下一次
  迭代（for 的更新式、while／do-while 的條件、for-in／for-of 的迴圈節點）。[SRC USR D2]
- **FR-003**: `with` 的物件運算式 MUST 記為 use；本體內的名稱 MUST 照一般 scope 規則解析；README MUST
  註明不推斷物件屬性。[SRC USR D2]
- **FR-004**: `new` 運算式的參數（含 spread）MUST 記為所在節點的 use。[SRC KI §3]
- **FR-005**: 帶預設值的參數（函式、箭頭函式、參數解構）MUST 在 entry 之後依參數順序各有一個初始化節點；
  預設值運算式讀取的變數 MUST 記為該節點的 use，該參數（或解構出的名稱）MUST 在該節點定義；沒有預設值的
  參數 MUST 維持在 entry 定義；參數解構中每個帶預設值的名稱 MUST 各有一個初始化節點，依出現順序；預設值
  運算式中的條件與短路運算 MUST 依 FR-008 拆出分支，該參數 MUST 在每個葉分支各自定義。[SRC KI §2] [SRC USR D4]
  [SRC USR D10] [SRC USR D11]
- **FR-006**: 每個 class 欄位初始化式（實例與 static）與 static block MUST 各自成為一個 scope，其中的
  use 與區域 def MUST 依一般規則分析；static 者 MUST 接在 class 宣告節點；實例欄位 MUST NOT 接入外層流程，
  README MUST 註明。[SRC KI §4] [SRC USR D5] [SRC USR D7]
- **FR-007**: 連鎖的單純指派（`=`）中，內層指派的目標 MUST NOT 被記為 use；內層為複合或邏輯指派時，
  其目標依該運算子語意記為 use。[SRC KI §5]
- **FR-008**: `?:` 的條件與 `&&`、`||`、`??`、`&&=`、`||=`、`??=` 的左運算元 MUST 成為具 true 與 false 分支的決策點；只在某
  分支求值的運算式，其 use MUST 只出現在該分支上。拆分 MUST 與等效的 if/else 敘述一致：條件之後的剩餘
  運算與定義（含呼叫）在每個葉分支各有一份節點（各自的 def），MUST NOT 在匯合後才定義；條件之前已求值的
  部分 MUST 留在決策節點；短路運算的左運算元 MUST 只在決策節點求值一次，葉節點 MUST NOT 重讀；函式／class
  運算式 MUST 只有一個 scope；沒有運算的分支 MUST NOT 建節點、直接接到後繼；位於既有決策節點條件中時
  （含 switch 判斷式）MUST NOT 複製該敘述的本體；MUST NOT 引入原程式沒有的變數。呼叫點的認定沿用既有規則
  （只有呼叫敘述是呼叫點），拆分不改變此規則。[SRC KI §6] [SRC USR D3] [SRC USR D8]
  [SRC USR D12]
- **FR-009**: 決策節點的條件只有單一識別字時，該識別字 MUST 記為 p-use。[G-1]
- **FR-010**: 所有模型中的 p-use MUST 有存在的 true 與 false 分支目標。[SRC KI §6]
- **FR-011**: 同一個父 scope 下名稱相同的 scope，第一個 MUST 保留原名，之後 MUST 依原始碼出現順序加上
  `_1`、`_2`… 後綴並跳過已被使用的名稱；沒有重名時名稱 MUST 不變。[SRC KI §8] [SRC USR D6]
- **FR-012**: 修正後的問題 MUST 自 `docs/known-issues.md` 移除（或標為已修正），README 的限制段落 MUST
  依本輪結果更新（移除「Labeled break/continue」限制、加入 `with` 限制與並列條件使節點數以乘積成長的說明）。[SRC KI §1] [SRC USR D1]
- **FR-013**: 既有測試 MUST 全數通過；golden 期望輸出與測試期望字串只可因本 spec 的 FR（FR-001、FR-004、
  FR-005、FR-006、FR-007、FR-008、FR-009、FR-014）有意改變，且每一處差異 MUST 可對應到某條 FR。[SRC KI §6] [G-1]
- **FR-014**: 測試輔助工具 MUST 以 `L<行>:<路徑>` 標記由 FR-008 拆出、位於分支內的節點（def 與 use 皆適用），
  並在 p-use 目標不帶路徑時以 `:T`／`:F` 標記分支（記法見「表示法」），既有測試的 p-use 期望字串隨之更新。
  [SRC USR D9] [SRC USR D13]

### Key Entities

- **Scope**：分析的命名範圍（page、函式、block，新增欄位初始化式與 static block），名稱需唯一。
- **CFG 節點**：控制流程圖節點；決策節點具 true／false 分支。本輪新增由條件與短路運算子拆出的決策節點
  與各葉分支上的複製節點，
  以及帶預設值參數的初始化節點。
- **Def-use pair**：變數的定義節點與使用（c-use：節點；p-use：決策節點與分支目標）的配對。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: KI §1–§6、§8 的每段重現輸入都以自動化測試覆蓋，且全部通過（共 7 個問題，0 個仍重現）。
- **SC-002**: 含 labeled、`with`、`debugger` 的程式以 CLI 分析時 100% 產出結果（0 次中止）。
- **SC-003**: 任何測試輸入中，沒有分支目標的 p-use 數量為 0。
- **SC-004**: 不含受影響語法（labeled／`with`／`debugger`、帶參數的 `new`、連鎖指派、`?:`、`&&`、`||`、
  `??`、邏輯指派、單一識別字條件、預設參數、class 欄位與 static block、同名 scope）的既有 golden fixtures，
  輸出 100% 與現在相同；有變更的 golden 檔案每一處差異都能對應到本 spec 的某條 FR。
- **SC-005**: 既有測試套件與 lint 全數通過。

## Assumptions

- 只修正本輪範圍內的問題；KI §7（class 方法呼叫連結）與 §9 不處理。[SRC USR D1]
- 對外的 CLI 參數與輸出檔格式不變；只有輸出內容依上述需求改變。
- 函式被呼叫才會把外層定義接入（README 既有限制）；驗收情境中需要外層 pair 的都附上呼叫敘述。
- 可選鏈的短路、`with` 的屬性推斷不在範圍內。[SRC USR D2] [SRC USR D3]
- 帶預設值參數的初始化節點、新 scope（欄位初始化式、static block）的命名沿用匿名函式 scope 的命名方式，細節於 plan 決定。
