var x = 0, c = 1;
class A {
  m() {
    if (c) {
      c = 0;
      this.n();
    }
    x = 1;
  }
  n() {
    this.m();
    x = 2;
  }
}
new A().m();
console.log(x);
