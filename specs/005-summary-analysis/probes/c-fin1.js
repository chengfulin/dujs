let r = 0;
function f() {
try {
r = 1;
throw "bogus";
} finally {
;
}
r = 5;
}
try {
f();
} catch (e) {
console.log(r);
}
console.log(r);
