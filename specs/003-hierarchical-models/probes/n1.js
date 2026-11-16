var a = 1;
function f() {
  function h() { return a; }
  h();
}
f();
a = 2;
f();
