class A {
  static s = A;
  m() { return new A(); }
}
A = null;
var o = new A();
o.m();
