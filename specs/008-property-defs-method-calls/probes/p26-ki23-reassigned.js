var x = 0;
class A {
  m() {
    x = 1;
  }
}
var o = new A();
function h() {
  o = null;
}
function g() {
  o.m();
}
g();
console.log(x);
