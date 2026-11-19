var x = 0;
class A {
  m() {
    this.m();
  }
}
var a = new A();
try {
  a.m();
  x = 1;
} catch (e) {
  console.log(x);
}
console.log(x);
