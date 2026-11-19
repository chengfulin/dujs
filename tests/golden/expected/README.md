# dujs analysis results

Each model is a Markdown file with its graphs in Mermaid; the `.dot` files next to it are the same graphs. View the files with a Markdown viewer that renders Mermaid (for example GitHub or VS Code).

## Page 0

### Source code

[`page0/src.js`](page0/src.js)

```js
/// --- start fixtures/page0/app.js ---
var total = 0;
var items = [];
var mode = 'sum';

function add(value) {
    var result = 0;
    if (value > 10) {
        result = value - 10;
    } else {
        result = value;
    }
    return result;
}

function sumAll(list) {
    var sum = 0;
    for (var i = 0; i < list.length; i++) {
        sum = sum + add(list[i]);
    }
    return sum;
}

function countDown(n) {
    var steps = 0;
    while (n > 0) {
        n = n - 1;
        steps = steps + 1;
    }
    do {
        steps = steps - 1;
    } while (steps > 100);
    return steps;
}

function describeMode(m) {
    var text;
    switch (m) {
        case 'sum':
            text = 'Sum';
            break;
        case 'count':
            text = 'Count';
            break;
        default:
            text = 'Unknown';
    }
    return text;
}

function parseSaved(raw) {
    var parsed = null;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        parsed = [];
    } finally {
        total = 0;
    }
    return parsed;
}

function onLoad() {
    items = parseSaved(localStorage.getItem('items'));
    total = sumAll(items);
}

function onAdd() {
    items.push(countDown(5));
    total = sumAll(items);
    localStorage.setItem('items', JSON.stringify(items));
}

function onModeChange() {
    mode = describeMode(mode);
}

window.addEventListener('load', onLoad);
document.getElementById('add').addEventListener('click', onAdd);
document.getElementById('mode').addEventListener('change', onModeChange);

/// --- end fixtures/page0/app.js ---
```

### Intra-procedural

- [`intra-procedural: $DOMAIN.$PAGE_0`](page0/intra-procedurals/0.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.add`](page0/intra-procedurals/1.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.sumAll`](page0/intra-procedurals/2.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.countDown`](page0/intra-procedurals/3.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.describeMode`](page0/intra-procedurals/4.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.parseSaved`](page0/intra-procedurals/5.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.onLoad`](page0/intra-procedurals/6.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.onAdd`](page0/intra-procedurals/7.md)
- [`intra-procedural: $DOMAIN.$PAGE_0.onModeChange`](page0/intra-procedurals/8.md)

### Inter-procedural

- [`inter-procedural: $DOMAIN.$PAGE_0.sumAll`](page0/inter-procedurals/0.md)
- [`inter-procedural: $DOMAIN.$PAGE_0.onLoad`](page0/inter-procedurals/1.md)
- [`inter-procedural: $DOMAIN.$PAGE_0.onAdd`](page0/inter-procedurals/2.md)
- [`inter-procedural: $DOMAIN.$PAGE_0.onModeChange`](page0/inter-procedurals/3.md)

### Intra-page

- [`intra-page: $DOMAIN.$PAGE_0`](page0/intra-pages/0.md)

## Page 1

### Source code

[`page1/src.js`](page1/src.js)

```js
/// --- start fixtures/page1/report.js ---
var saved = [];
var count = 0;

function onLoad() {
    saved = JSON.parse(localStorage.getItem('items'));
    count = saved.length;
}

function onClear() {
    localStorage.setItem('items', '[]');
    count = 0;
}

window.addEventListener('load', onLoad);
document.getElementById('clear').addEventListener('click', onClear);

/// --- end fixtures/page1/report.js ---
```

### Intra-procedural

- [`intra-procedural: $DOMAIN.$PAGE_1`](page1/intra-procedurals/0.md)
- [`intra-procedural: $DOMAIN.$PAGE_1.onLoad`](page1/intra-procedurals/1.md)
- [`intra-procedural: $DOMAIN.$PAGE_1.onClear`](page1/intra-procedurals/2.md)

### Inter-procedural

None.

### Intra-page

- [`intra-page: $DOMAIN.$PAGE_1`](page1/intra-pages/0.md)

## Inter-page

- [`inter-page`](inter-page/0.md)
