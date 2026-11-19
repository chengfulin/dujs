var n = 3;
function f() {
if (n) {
n = n - 1;
f();
}
}
f();
console.log(n);
