var x = 0;
class A {
  m() {
    x = 1;
    return 3;
  }
}
var o = new A();
var r = o.m();
console.log(x);
