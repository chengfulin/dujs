var x = 0;
class A {
  m() { x = 1; }
}
const o = new A();
function f() { x = 2; }
function g() {
  f();
  o.m();
}
o.p = 1;
g();
localStorage.k = x;
//// page
var y = 0;
function f2() { y = 1; }
function g2() {
  f2();
}
g2();
console.log(y, localStorage.k);
