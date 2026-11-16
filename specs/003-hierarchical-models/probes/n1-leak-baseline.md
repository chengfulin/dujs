# N1 外漏基準（重構前）

**Feature**: `003-hierarchical-models` | 產生於 Setup（T008），供 T043、T060 使用

以重構前程式（lib／bin 與 `bf07818` 相同）分析 `tests/dujs/cases/probes/` 的 n1、n1b、n1c，記錄每個 inter-procedural
模型（依 `pageModels.interProceduralModels` 順序）的 def-use pair，記法同 `tests/helpers/analyze.js`（`pairsOfModel`）。
**這不是測試斷言**：重構後子模型的扁平圖只含自己子樹的節點與邊，標為「外漏」的 pair 預期消失（research R6）；其餘 pair 預期不變。

外漏判定：pair 的定義點不在該模型相關 scope 的程式範圍內（子模型呼叫鏈上有函式被呼叫兩次以上，worklist 經共用 exit 的
`return` 邊走出子樹、再經另一條呼叫走回）。

intra-page 與 inter-page 模型的 pair 三個探針皆與最頂端 inter-procedural 模型（含 `$DOMAIN.$PAGE_0`）相同，故不另列。

## n1

```js
var a = 1;
function f() {
  function h() { return a; }
  h();
}
f();
a = 2;
f();
```

| # | 相關 scope | pairs | 外漏 |
|---|-----------|-------|------|
| 0 | `f`, `f.h` | `a: L7 -> L3`、`a: L7 -> entry`、`h: entry -> L4` | `a: L7 -> L3`、`a: L7 -> entry`（L7 `a = 2` 在主程式） |
| 1 | `$PAGE_0`, `f`, `f.h` | `a: L1 -> L3`、`a: L1 -> entry`、`a: L7 -> L3`、`a: L7 -> entry`、`f: entry -> L6`、`f: entry -> L8`、`h: entry -> L4` | 無 |

## n1b

```js
var a = 1;
function p() {
  function r() {
    function c() { return a; }
    c();
  }
  r();
}
p();
a = 2;
p();
```

| # | 相關 scope | pairs | 外漏 |
|---|-----------|-------|------|
| 0 | `p.r`, `p.r.c` | `a: L10 -> L4`、`a: L10 -> entry`、`c: entry -> L5` | `a: L10 -> L4`、`a: L10 -> entry`（L10 `a = 2` 在主程式；根函式 `r` 只被呼叫一次，祖先 `p` 被呼叫兩次） |
| 1 | `p`, `p.r`, `p.r.c` | `a: L10 -> L4`、`a: L10 -> entry`、`c: entry -> L5`、`r: entry -> L7` | `a: L10 -> L4`、`a: L10 -> entry` |
| 2 | `$PAGE_0`, `p`, `p.r`, `p.r.c` | `a: L1 -> L4`、`a: L1 -> entry`、`a: L10 -> L4`、`a: L10 -> entry`、`c: entry -> L5`、`p: entry -> L11`、`p: entry -> L9`、`r: entry -> L7` | 無 |

## n1c

```js
var a = 1;
function p() {
  function r() {
    function c() { return a; }
    c();
  }
  r();
  a = 3;
  r();
}
p();
```

| # | 相關 scope | pairs | 外漏 |
|---|-----------|-------|------|
| 0 | `p.r`, `p.r.c` | `a: L8 -> L4`、`a: L8 -> entry`、`c: entry -> L5` | `a: L8 -> L4`、`a: L8 -> entry`（L8 `a = 3` 在 `p`，`r` 被呼叫兩次） |
| 1 | `p`, `p.r`, `p.r.c` | `a: L8 -> L4`、`a: L8 -> entry`、`c: entry -> L5`、`r: entry -> L7`、`r: entry -> L9` | 無（L8 在 `p` 內） |
| 2 | `$PAGE_0`, `p`, `p.r`, `p.r.c` | `a: L1 -> L4`、`a: L1 -> entry`、`a: L8 -> L4`、`a: L8 -> entry`、`c: entry -> L5`、`p: entry -> L11`、`r: entry -> L7`、`r: entry -> L9` | 無 |

scope 欄省略前綴 `$DOMAIN.$PAGE_0.`（`$PAGE_0` 即 `$DOMAIN.$PAGE_0`）。
