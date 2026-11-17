var x = 0;
function f(v) {
  return x;
}
if (f(x = 1)) {
  x = 2;
}
