let r = 0;
try {
r = 1;
throw "bogus";
} finally {
r = 3;
}
console.log(r);
