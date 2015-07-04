/// --- start .event.js ---
/// --- start .event.js ---
var a = 0, b = 7, x;
function load() {
    var c = ++a;
    console.log(c);

    if (c > b) {
        c = b;
    } else {
        c = b + 1;
    }
    console.log(c);
}
window.addEventListener('load', load);
function fun() {
    while (a < b) {
        a += 2;
    }
    if (!x) {
        x = 0;
    } else {
        x += a;
    }
}
function show() {
    console.log('a=' + a);
    console.log('b=' + b);
}
function update() {
    fun();
}
document.addEventListener('click', show);
document.addEventListener('click', update);

/// --- end .event.js ---
