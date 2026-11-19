var x = 0;
class A {
  m() {
    x = 1;
  }
}
var o = new A();
o.m();
console.log(x);
