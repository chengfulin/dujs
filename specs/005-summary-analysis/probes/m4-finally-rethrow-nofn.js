let r = 0;
try {
r = 1;
throw "bogus";
} catch (e) {
r = 2;
throw e;
} finally {
r = 3;
}
console.log(r);
