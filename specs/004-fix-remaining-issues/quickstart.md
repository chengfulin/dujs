# Quickstart：驗證步驟

**Feature**: `004-fix-remaining-issues` | 前置：Node ≥ 24、`npm ci`；在專案根執行。設計見 [plan.md](./plan.md)，預期見
[contracts/acceptance.md](./contracts/acceptance.md)。

## 0. 基準

```sh
npm test            # 933 passing（ff45928）
npm run lint        # 0 錯誤；eslint-suppressions.json 119 筆，不得增加
node specs/004-fix-remaining-issues/probes/run.js > /tmp/probes-now.txt
diff specs/004-fix-remaining-issues/probes/current-output.txt /tmp/probes-now.txt   # 修正前應無差異
```

## 1. Setup：新 golden fixture（任何 `lib/` 變更前）

1. `tests/golden/fixtures/fixes004/app.js` 內容＝`specs/004-fix-remaining-issues/probes/golden-fixes004.js`（涵蓋 §20 L2、§21 L8、§11 L11–L14、
   實例欄位與 constructor L15–L18、FR-016 L19–L23、FR-015 `add`↔`bump` L21／L27、§7 L35–L38、§15 L41、§17 L42–L45、§10 L46–L48）。
2. `tests/golden/golden.js` 加入：

   ```js
   /// regression of the fixes of feature 004 (§7, §10, §11, §15, §17, §20, §21, FR-015, FR-016); created before the fixes
   goldenCase('Golden outputs (004 fixes fixture)',
   	[['fixes004/app.js']], path.join(__dirname, 'expected-fixes004'));
   ```
3. `UPDATE_GOLDEN=1 npx mocha tests/golden/golden.js -g "004 fixes"` 產生 `tests/golden/expected-fixes004/`（修正前輸出，預期 31 個 .dot）。
4. 計算雜湊並貼入 `manifest.json` 的 `"expected-fixes004": {"baseline": {...}, "added": []}`：

   ```sh
   node -e "var c=require('crypto'),f=require('fs'),p=require('path'),d='tests/golden/expected-fixes004',o={};(function w(x){f.readdirSync(x,{withFileTypes:true}).forEach(function(e){var q=p.join(x,e.name);if(e.isDirectory())w(q);else if(/\.dot$/.test(e.name))o[p.relative(d,q).split(p.sep).join('/')]=c.createHash('sha256').update(f.readFileSync(q)).digest('hex');});})(d);console.log(JSON.stringify(Object.keys(o).sort().reduce(function(r,k){r[k]=o[k];return r;},{}),null,'\t'))"
   ```
5. `npm test` 全綠；建立 `specs/004-fix-remaining-issues/golden-diff.md`（格式見 [contracts/golden-verification.md](./contracts/golden-verification.md) §4），
   記下 Setup commit。

之後每個 story 改到 golden 時：`UPDATE_GOLDEN=1 npm test` → `git diff tests/golden/expected*` 逐處判讀 → 以步驟 4 的指令（換目錄）重算 → 只更新變更的鍵 →
golden-diff 加列 → `npm test` 全綠。

## 2. 各 story 的驗證

| Story | 指令 | 預期 |
|-------|------|------|
| Foundational（FR-016） | `npx mocha tests/dujs/bypass.js`；`node specs/004-fix-remaining-issues/probes/run.js specs/004-fix-remaining-issues/probes/{byp-1,ki16,ki16b}.js` | acceptance「FR-016」表；golden 既有三個 case 零差異 |
| US1 | `npx mocha tests/dujs/conditionpuse.js tests/dujs/usedexpressions.js`；probes `us1-*` | acceptance US1；golden 只有 fixes004 的 §20 差異 |
| US2 | `npx mocha tests/dujs/newcallsite.js tests/dujs/classfields.js`；probes `us2-*`、`edge-classexpr`、`fn-new`、`fn-new-early`、`field-new`、`mix-f` | acceptance US2、「FR-017／FR-018」表 |
| US3 | `npx mocha tests/dujs/methodcalls.js tests/dujs/callcycles.js tests/dujs/expansion.js tests/dujs/hierarchy.js tests/dujs/hierarchydot.js`；probes `us3-*`、`cyc-*`（含 `cyc-handler*`、`cyc-uncond`）、`ctor-cycle`、`handler-new`、`byp-3`、`edge-static-this` | acceptance US3、FR-015、「FR-017／FR-018」表；`cyc-*`、`ctor-cycle` 不拋錯 |
| US4 | `npx mocha tests/dujs/paramdefaults.js tests/dujs/classfields.js`；probes `us4-*` | acceptance US4（`us4-5b` 的 `h` 為 5 節點） |
| US5 | `npx mocha tests/dujs/cli.js`；手動見 §3 | cli.md §4 |
| US6 | `npx mocha tests/dujs/cfggraphconverter.js tests/esgraph/branchsplitlooppred.js`；probes `us6-*` | acceptance US6 |
| 全部 | `npm test && npm run lint` | 全綠；suppressions 仍 119；`golden-diff.md` 每節四個 case 皆有記錄 |

（測試檔名為建議，tasks 階段定案；新測試檔放在 `tests/dujs/` 或 `tests/esgraph/` 以被 `npm test` 的 glob 收到。）

## 3. CLI 手動檢查

```sh
D=$(mktemp -d) && cd "$D"
node <repo>/bin/dujs.js --help; echo "exit=$?"            # usage 到 stdout，exit=0，無 out-*
node <repo>/bin/dujs.js; echo "exit=$?"                   # stderr: dujs: no page ... + usage，exit=2
node <repo>/bin/dujs.js -js -js a.js; echo "exit=$?"      # dujs: -js without files (page 0)，exit=2
node <repo>/bin/dujs.js -js missing.js; echo "exit=$?"    # dujs: cannot read missing.js ...，exit=1，無 out-*
printf 'var a = 1;\n' > ok.js
for i in 1 2 3; do node <repo>/bin/dujs.js -js ok.js & node <repo>/bin/dujs.js -js ok.js & wait; done
ls -d out-*                                               # 6 個不同目錄（同秒者帶 _1、_2…），每個都有 report.html
```

## 4. 文件（Polish）

- `docs/known-issues.md`：§7、§10、§11、§12、§14、§15、§17、§20、§21 標「Fixed by feature `004-fix-remaining-issues`」（保留原描述）；§16 後果段加註
  已由 FR-016 修正；新增一節（found by 004）記錄：屬性賦值 `o.p = 1` 當成 `o` 的 def、具名 class／函式運算式的內部名稱不是變數、`return f()` 等
  包在運算式中的呼叫（後續項目）、`f()` 改為嚴格規則的行為改變（混合定義的 `f()` 不再連結，`probes/mix-f.js`，FR-018）（FR-014）。
- `README.md` 限制：連結形式（`new`、四種方法呼叫、欄位中的 `this.m()`／`new B()`、函式內對全頁唯一 class 的 `new A()`／`A.s()`）、不連結形式
  （Clarifications 清單、`var A = class {}` 在函式內、函式內的 `f()`／`new F()`、混合定義的 `f()`）、FR-018 的 class 放寬不看執行順序（`g(); class A {...}`
  也連，`probes/fn-new-early.js`）與「函式內 `new A()` 會連而 `f()` 不連」的不對稱、`var o = new A()` 不連 constructor 而 `o.m()` 會連、不追 super 鏈、
  遞迴以迴圈路徑表示（並註明：無條件遞迴之後的節點從 entry 不可達——死碼，被呼叫端看得到的外層變數 pair 會消失，不可達環內的定義仍會流出（`x: L5 -> L9`，
  research P8）；被 bypass 的區域變數 pair 保留）、CLI 用法與 exit status。
- `specs/003-hierarchical-models/contracts/model-api.md` §2／§3 與 `data-model.md` §4 加修訂註記。
