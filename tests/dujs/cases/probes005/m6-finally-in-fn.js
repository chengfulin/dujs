let r = 0;
function f() {
try {
r = 1;
} finally {
r = 3;
}
}
f();
console.log(r);
