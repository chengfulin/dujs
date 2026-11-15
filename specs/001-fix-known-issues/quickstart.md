# Quickstart: 驗證修正已知問題（#1–#6、#8）

**Feature**: `001-fix-known-issues` | 記法見 [contracts/analyze-helper-notation.md](./contracts/analyze-helper-notation.md)

## 前置

- Node.js ≥ 24；於專案根執行 `npm install`（含新增的 devDependency `fast-check`）。

## 1. 全套回歸（SC-005）

```bash
npm test          # mocha：單元、ES2015、golden、esgraph 上游 fixture、fast-check 性質測試
npm run lint
```

預期：全部通過、lint 無錯誤。

## 2. 驗收情境（SC-001）

各 User Story 的驗收情境以 `tests/helpers/analyze.js` 寫成自動化測試（每個 spec 情境一個 `it`，標題註明
`US<n>-<情境號>`）。執行單一 story：

```bash
npx mocha tests/dujs/<該 story 的測試檔>.js
```

預期：KI §1–§6、§8 的重現輸入全數通過（0 個仍重現）。

## 3. CLI 煙霧測試（SC-002）

```bash
mkdir -p /tmp/dujs-qs && cd /tmp/dujs-qs
printf 'var a = 1;\nl: a = 2;\nconsole.log(a);\n'            > labeled.js
printf 'var o = {}, x = 1;\nwith (o) {\n  console.log(x);\n  p = 1;\n}\n' > with.js
printf 'var a = 1;\ndebugger;\nconsole.log(a);\n'           > debugger.js
for f in labeled with debugger; do node <專案根>/bin/dujs.js -js $f.js; echo "$f exit=$?"; done
```

預期：三者 `exit=0`、stderr 為空，各產生一個 `out-*` 目錄，內含四層模型的 `.dot` 檔。

## 4. 不變量（SC-003）

```bash
npx mocha tests/dujs/branchsplit.property.js                 # 預設 100 runs
FC_NUM_RUNS=1000 npx mocha tests/dujs/branchsplit.property.js
```

預期：P1–P6 全部成立（性質定義見 [research.md](./research.md) R11）；失敗時輸出 seed 與縮小後的反例。

## 5. Golden 差異稽核（FR-013、SC-004）

```bash
UPDATE_GOLDEN=1 npm test
git diff --stat tests/golden tests/esgraph/tests
git diff tests/golden tests/esgraph/tests
```

預期：
- `tests/golden/expected/`（ES5 fixtures）**無差異**。
- `tests/golden/expected-es2015/` 的差異只出現在 fixture L11（`||`，FR-008）、L16（`new` 參數，FR-004）、
  L18（預設參數，FR-005）、L29（`??`，FR-008）相關的節點、邊、pair 與拆出節點的 `<行>:<路徑>` label。
- `tests/esgraph/tests/maythrow.js` 只有 `1 && call();` 相關變更（FR-008）。
- 每一處差異在 PR 說明中列出對應 FR。

## 6. 文件（FR-012）

- `docs/known-issues.md`：§1–§6、§8 移除或標為已修正；§7、§9 保留。
- `README.md` Limits：移除「Labeled break/continue」；新增 `with` 不推斷物件屬性、實例欄位初始化式不接入外層
  流程、並列條件使節點數以乘積成長。
- `lib/esgraph/index.js` 檔頭與 `THIRD_PARTY_NOTICES.md` 有本輪修改紀錄。
