var x = 1;
function f(a = x) {
  var x = 2;
  return a;
}
f();
