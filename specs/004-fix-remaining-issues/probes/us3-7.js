var x = 0, y;
class A {
  f = x;
  constructor() {
    x = 1;
  }
  m() {
    y = x;
    x = 2;
  }
}
new A().m();
console.log(x);
