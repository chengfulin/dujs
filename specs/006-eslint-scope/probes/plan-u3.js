var y = 0, c = 1;
function f() {}
try { f(); }
catch (x) {
  if (c) { y = 1; }
}
console.log(y);
