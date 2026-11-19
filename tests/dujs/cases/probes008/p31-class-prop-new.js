var x = 0;
class A {
  constructor() {
    x = 1;
  }
}
A.count = 0;
new A();
console.log(x);
