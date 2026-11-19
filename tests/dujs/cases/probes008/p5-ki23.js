var x = 0;
class A {
  m() {
    x = 1;
  }
}
const o = new A();
function g() {
  o.m();
}
g();
console.log(x);
