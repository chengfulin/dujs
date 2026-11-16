var x = 0, y;
class A {
  constructor() {
    x = 1;
  }
}
class B extends A {
  g = x;
  constructor() {
    super();
    x = 2;
  }
}
new B();
y = x;
