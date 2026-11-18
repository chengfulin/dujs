var x = 0;
class A {
  m() {
    x = 1;
  }
}
let o;
o = new A();
function g() {
  o.m();
}
g();
console.log(x);
