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
