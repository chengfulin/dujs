var x = 0, c = 1;
class A {
  m() {
    this.m();
  }
}
var a = new A();
while (c) {
  console.log(x);
  a.m();
  x = 1;
}
