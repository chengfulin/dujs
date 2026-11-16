var x = 0, y;
class A {
  f = x;
  constructor() {
    x = 1;
  }
}
new A();
y = x;
