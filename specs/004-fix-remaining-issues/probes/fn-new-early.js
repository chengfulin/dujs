var x = 0;
function g() {
  new A();
}
g();
class A {
  constructor() {
    x = 1;
  }
}
console.log(x);
