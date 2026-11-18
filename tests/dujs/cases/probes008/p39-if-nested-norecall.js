var x = 0;
function f() {
  f();
}
function g(v) {
  return v;
}
if (g(f())) {
  x = 1;
}
console.log(x);
