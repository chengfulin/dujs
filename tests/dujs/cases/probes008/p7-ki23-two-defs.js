var x = 0, c = 1;
class A {
  m() {
    x = 1;
  }
}
let o = new A();
if (c) {
  o = new A();
}
function g() {
  o.m();
}
g();
console.log(x);
