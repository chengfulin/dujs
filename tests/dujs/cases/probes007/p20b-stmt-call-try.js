var x = 0;
var o = null;
function f() {
  x = 1;
  return o;
}
try {
  f();
} catch (e) {
  console.log(x);
}
