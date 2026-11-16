var x = 0;
class B {
  constructor() {
    x = 1;
  }
}
class A {
  f = new B();
}
new A();
console.log(x);
