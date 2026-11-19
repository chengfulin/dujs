var x = 0;
class A {
  m() {
    this.m();
    x = 1;
  }
}
new A().m();
console.log(x);
