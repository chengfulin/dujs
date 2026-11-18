var d = 1;
function f(g = () =>
  d) {
  return g();
}
f();
