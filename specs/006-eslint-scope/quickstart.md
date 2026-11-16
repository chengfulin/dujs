# Quickstart：006 的驗證與執行指南

**Feature**: `006-eslint-scope` | 所有指令在 repo 根目錄執行。格式與判準見 [contracts/](./contracts/)，資料結構見 [data-model.md](./data-model.md)。

## 0. 基準

- `develop`＝`584e17d`；本 branch 的 `lib/` 與之相同。`npm test` 1102 passing；`npm run lint` 0 錯誤；`eslint-suppressions.json` 118 筆。
- Setup commit（golden 與 MDN 的「修正前」）在動 lib 前建立，其 hash 記入 `golden-diff.md` 檔頭，作為 `diffcheck.js --base` 的預設值。

## 1. Setup（任何 `lib/` 變更前）

```sh
npm install eslint-scope@^9.1.2 --save            # dependencies；package-lock 鎖定實際版本
node -e "console.log(require('eslint-scope/package.json').version)"
mkdir -p tests/dujs/cases/probes006 && cp specs/006-eslint-scope/probes/*.js tests/dujs/cases/probes006/
node specs/004-fix-remaining-issues/probes/run.js specs/006-eslint-scope/probes/*.js > specs/006-eslint-scope/probes/develop.txt
```

- 以 develop 記錄 33 個 probes 的 scope 名稱清單與各層模型數 → `tests/dujs/cases/probes006/scopenames.json`（US4-2 的基準）。
- MDN 範例集：先自 validation-004 工作目錄複製並核對附錄 A 雜湊（重新抽取為備援，[contracts/diff-check.md §5](./contracts/diff-check.md) 步驟 1–2）：

```sh
SRC=/private/tmp/claude-501/-Users-chengfulin-Documents-Personal-dujs/cbaaf31a-c3b2-4a55-9ff4-356dc509edf6/scratchpad/mdncheck/ex
mkdir -p specs/006-eslint-scope/mdn/corpus && cp "$SRC"/*.js specs/006-eslint-scope/mdn/corpus/
(cd specs/006-eslint-scope/mdn/corpus && shasum -a 256 *.js | awk '{print substr($1,1,16)"  "$2}') \
  | diff <(sed -n '/^## 附錄 A/,/^## 附錄 B/p' docs/research/mdn-baseline/validation-004.md | grep -E '^[0-9a-f]{16}  ') -   # 無輸出＝33 檔全符
```

- 其餘 develop 快照依 §5 步驟 3–6；完成後檢查：

```sh
ls specs/006-eslint-scope/mdn/corpus | wc -l                       # 33 個檔案（32 個 id，s09 兩檔）
node specs/006-eslint-scope/tools/diffcheck.js mdn --report         # 動 lib 前：應輸出「無差異」
node specs/006-eslint-scope/tools/diffcheck.js golden --report      # 動 lib 前：應輸出「無差異」
node specs/006-eslint-scope/tools/perf.js .                         # develop 時間，寫入 perf.md
```

- `diffcheck.js` 自我測試：`node specs/006-eslint-scope/tools/diffcheck.test.js`（以合成的 dot 目錄驗證正規化、multiset 比對、五類判準與釘選筆數；不進 npm test）。

## 2. 每個 story 的驗證

| 階段 | 指令 | 預期 |
|------|------|------|
| Foundational | `npx mocha tests/dujs/scopebinding.js tests/dujs/scope.js tests/dujs/var.js tests/dujs/scopeguards.js` | 全過；US4-2…5、8…11 與 Q1／Q3／F9 守門通過（F6：Foundational 完成條件） |
| Foundational | `for f in shadow-block shadow-param shadow-loop with evalouter op mod classdecl vis3 plan-bi plan-pf link-n5; do node specs/004-fix-remaining-issues/probes/run.js specs/006-eslint-scope/probes/$f.js; done` | 與 `probes/develop.txt` 的對應段落逐行相同 |
| US1 | `npx mocha tests/dujs/catchclause.js tests/dujs/usedexpressions.js` | US1-1…6 通過 |
| US2 | `npx mocha tests/dujs/scoperesolution.js` | US2-1…5 通過 |
| US3 | `npx mocha tests/dujs/globals.js tests/dujs/def.js tests/dujs/deffactory.js` | US3-1…8 通過 |
| US4 | `npx mocha tests/dujs/scopesource.js tests/dujs/scopeguards.js` | US4-6 通過；Foundational 的守門仍全過；golden `--verify` 最終核對 |
| 每個階段結束 | `npm test && npm run lint` | 全綠；不新增 lint 抑制 |

探測程式的人工對照：`node specs/004-fix-remaining-issues/probes/run.js specs/006-eslint-scope/probes/<檔名>`，與 `probes/develop.txt` 及 spec「探測結果」比對（SC-004）。

## 3. Golden 更新（只在改 golden 的階段：Foundational、US1、US3、US4 收尾；**依序**進行，不並行）

```sh
UPDATE_GOLDEN=1 npm test                                                     # 只重建 expected*，不碰 manifest
node specs/006-eslint-scope/tools/diffcheck.js golden --report > /tmp/g.md    # 產生淨差異表骨架
#   人工：把骨架貼入 golden-diff.md「淨差異」，補「說明」；連結類填「呼叫連結簽核」；各階段敘述節與單元測試期望表
node specs/006-eslint-scope/tools/diffcheck.js golden --verify specs/006-eslint-scope/golden-diff.md   # exit 0
node -e "const c=require('crypto'),fs=require('fs'),p=require('path');(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);if(e.isDirectory())w(f);else if(f.endsWith('.dot'))console.log(c.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),p.relative('tests/golden',f))}})('tests/golden')" | sort -k2
#   人工：把有變化的鍵更新到 tests/golden/manifest.json（004 contracts/golden-verification.md §3 規則），舊→新 sha256 前 12 碼記入 golden-diff 雜湊表
npm test                                                                      # golden 與 manifest 斷言通過
```

## 4. Polish：MDN 範例集與效能（SC-003、US4-7）

```sh
node specs/006-eslint-scope/tools/diffcheck.js mdn --report > /tmp/m.md      # 32 個 id（33 檔）皆完成、不拋錯（報告列出 CLI exit code，全部 0；s09 以兩頁執行）
node specs/006-eslint-scope/tools/diffcheck.js mdn --verify specs/006-eslint-scope/mdn-diff.md         # exit 0
node specs/006-eslint-scope/tools/perf.js .                                   # 3 次中位數；與 develop 基準相比 ≤ 1.5 倍，結果寫入 perf.md
```

## 5. 文件（Polish，FR-011）

- `docs/known-issues.md`：§22 (2)、§24 標「已修正（006）」；新增 catch 參數／catch 節點讀取一節、參數預設值錯誤解析一節（修正前行為＋重現程式＝probes）；
  本輪其他發現另立節，至少含：Var 名放寬為 IdentifierName 後可與 scope 保留名稱（`$ANONYMOUS_FUN_n` 等）同字（U1）；函式名以 `$` 開頭仍拋
  `Invalid value for a FunctionScope`（develop 既有，scope 命名不在範圍）；§18 註明 entry 節點只認從函式 scope 可見的變數（Q3），其餘留給 005。
- `README.md`：Limits 中 scope、全域物件（未宣告讀取＝頁面 entry 的全域；`undefined`／`NaN`／`Infinity`／`arguments` 排除）、Annex B（block 內函式只在 block 可見，
  外部呼叫不連結）的說明。
