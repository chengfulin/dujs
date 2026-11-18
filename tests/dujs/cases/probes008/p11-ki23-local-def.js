var x = 0;
class A {
  m() {
    x = 1;
  }
}
class B {
  m() {
    x = 2;
  }
}
const o = new A();
function g() {
  var o = new B();
  o.m();
}
g();
console.log(x);
