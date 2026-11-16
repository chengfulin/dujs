var a = 1;
function g() {
  return a;
}
function f() {
  function h() { a = 7; }
  h();
  g();
}
f();
a = 5;
g();
