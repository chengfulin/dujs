var x = 0;
function f() {
  x = 1;
}
function g(p) {
  var t = 1;
  f();
  x = t + p;
}
g(2);
