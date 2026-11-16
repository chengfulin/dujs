var x = 0, c = 1;
class A {
  m() {
    if (c) {
      c = 0;
      this.m();
    }
    x = 1;
  }
}
new A().m();
console.log(x);
