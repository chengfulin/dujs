var x = 0, y = 0, z = 0;
class A {
  f = this.m();
  constructor() {
    this.m();
    y = x;
  }
  m() {
    x = 1;
  }
  n() {
    this.m();
    z = x;
  }
}
new A().n();
console.log(x);
