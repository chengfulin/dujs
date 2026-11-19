var x = 0;
class A {
  m() {
    x = 1;
  }
}
var o = new A();
o.p = 1;
o.m();
console.log(x);
