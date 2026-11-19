var y;
class A {
  m(p) {
    var t = p;
    this.m(0);
    y = t;
  }
}
new A().m(1);
