# dujs analysis results

Each model is a Markdown file with its graphs in Mermaid; the `.dot` files next to it are the same graphs. View the files with a Markdown viewer that renders Mermaid (for example GitHub or VS Code).

## Page 0

### Source code

[`page0/src.js`](page0/src.js)

```js
/// --- start fixtures/fixes004/app.js ---
var a = 1, b = 2, c = 3, x = 0, y;
if (a + b >= c) {
  a = 0;
}
function P(v) {
  x = v;
}
new P(1);
y = x;
class Counter {
  static self = Counter;
  static {
    y = Counter;
  }
  count = x;
  constructor() {
    x = 2;
  }
  add(n) {
    var t = n;
    this.bump();
    y = t;
  }
  bump() {
    if (c) {
      c = 0;
      this.add(1);
    }
    x = 3;
  }
  static reset() {
    x = 0;
  }
}
new Counter().add(2);
var counter = new Counter();
counter.bump();
Counter.reset();
function log(value) {
}
log(c ? a : b);
function h({
  p = a,
  q = p
} = {},
g = () =>
  q) {
  g();
}
h();
console.log(x, y);

/// --- end fixtures/fixes004/app.js ---
```

### Intra-procedural

- [`intra-procedural: $DOMAIN.$PAGE_0`](page0/intra-procedurals/0.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.P`](page0/intra-procedurals/1.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_0`](page0/intra-procedurals/2.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_1`](page0/intra-procedurals/3.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_2`](page0/intra-procedurals/4.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_3`](page0/intra-procedurals/5.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_4`](page0/intra-procedurals/6.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_5`](page0/intra-procedurals/7.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_6`](page0/intra-procedurals/8.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.log`](page0/intra-procedurals/9.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.h`](page0/intra-procedurals/10.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.h.$ANONYMOUS_FUN_7`](page0/intra-procedurals/11.md)

### Inter-procedural

- [`inter-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_4`](page0/inter-procedurals/0.md)
- [`inter-procedural: $DOMAIN.$PAGE_0.h`](page0/inter-procedurals/1.md)
- [`inter-procedural: $DOMAIN.$PAGE_0`](page0/inter-procedurals/2.md)
- [`inter-procedural: $DOMAIN.$PAGE_0.$ANONYMOUS_FUN_5`](page0/inter-procedurals/3.md)

### Intra-page

- [`intra-page: $DOMAIN.$PAGE_0`](page0/intra-pages/0.md)

## Inter-page

- [`inter-page`](inter-page/0.md)
