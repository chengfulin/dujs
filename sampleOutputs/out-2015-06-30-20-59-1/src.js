/// --- start sample.js ---
var a = 0, b = 7;
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
}
function show() {
    console.log('a=' + a);
    console.log('b=' + b);
}
function update() {
    fun();
}
document.getElementById('showBTN').addEventListener('click', show);
document.getElementById('updateBtn').addEventListener('click', update);
/// --- end sample.js ---
