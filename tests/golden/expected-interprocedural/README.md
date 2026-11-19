# dujs analysis results

Each model is a Markdown file with its graphs in Mermaid; the `.dot` files next to it are the same graphs. View the files with a Markdown viewer that renders Mermaid (for example GitHub or VS Code).

## Page 0

### Source code

[`page0/src.js`](page0/src.js)

```js
/// --- start fixtures/interprocedural/app.js ---
var total = 0;
var limit = 3;
function addTo(value) {
  function scale() {
    return value * 2;
  }
  total = total + value;
  scale();
  return total;
}
function isReady() {
  return total > limit;
}
addTo(1);
if (isReady()) {
  total = 0;
}
function onClick() {
  function log() {
    console.log(total);
  }
  log();
}
function onLoad() {
  limit = 5;
}
window.addEventListener('click', onClick);
window.addEventListener('load', onLoad);
localStorage.total = total;

/// --- end fixtures/interprocedural/app.js ---
```

### Intra-procedural

- [`intra-procedural: $DOMAIN.$PAGE_0`](page0/intra-procedurals/0.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.addTo`](page0/intra-procedurals/1.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.addTo.scale`](page0/intra-procedurals/2.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.isReady`](page0/intra-procedurals/3.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.onClick`](page0/intra-procedurals/4.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.onClick.log`](page0/intra-procedurals/5.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.onLoad`](page0/intra-procedurals/6.md)

### Inter-procedural

- [`inter-procedural: $DOMAIN.$PAGE_0.addTo`](page0/inter-procedurals/0.md)
- [`inter-procedural: $DOMAIN.$PAGE_0`](page0/inter-procedurals/1.md)
- [`inter-procedural: $DOMAIN.$PAGE_0.onClick`](page0/inter-procedurals/2.md)

### Intra-page

- [`intra-page: $DOMAIN.$PAGE_0`](page0/intra-pages/0.md)

## Inter-page

- [`inter-page`](inter-page/0.md)
