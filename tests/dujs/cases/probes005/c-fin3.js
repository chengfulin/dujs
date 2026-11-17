let r = 0;
function f() {
try {
r = 1;
throw "bogus";
} catch (e) {
r = 2;
throw e;
} finally {
;
}
}
try {
f();
} catch (e) {
console.log(r);
}
console.log(r);
