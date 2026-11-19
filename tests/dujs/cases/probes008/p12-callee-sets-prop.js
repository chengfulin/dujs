var x = 0;
class A {
  m() {
    x = 1;
  }
}
var o = new A();
function g() {
  o.p = 1;
}
g();
o.m();
console.log(x);
