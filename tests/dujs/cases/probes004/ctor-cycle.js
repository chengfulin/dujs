var x = 0, c = 1;
class A {
  constructor() {
    if (c) {
      c = 0;
      new A();
    }
    x = 1;
  }
}
new A();
console.log(x);
