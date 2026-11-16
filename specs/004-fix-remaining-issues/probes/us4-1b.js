var d = 1;
function f(g = () =>
  d) {
  g();
}
f();
