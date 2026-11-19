var x = 0;
class A {
  m() {
    x = 1;
  }
}
function g() {
  o.m();
}
g();
const o = new A();
console.log(x);
