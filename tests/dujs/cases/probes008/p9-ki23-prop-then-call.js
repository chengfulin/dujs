var x = 0;
class A {
  m() {
    x = 1;
  }
}
const o = new A();
o.p = 1;
function g() {
  o.m();
}
g();
console.log(x);
