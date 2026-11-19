var x = 0, y;
class A {
  static s() {
    this.m();
    this.k();
  }
  static m() {
    x = 1;
  }
  k() {
    y = 1;
  }
}
A.s();
console.log(x, y);
