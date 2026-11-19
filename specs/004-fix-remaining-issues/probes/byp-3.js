var x = 0, y;
class A {
  m() {
    x = 1;
  }
  n(p) {
    var t = 1;
    this.m();
    y = t + p;
  }
}
new A().n(2);
