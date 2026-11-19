var x = 0;
class A {
  constructor() {
    x = 1;
  }
}
function g() {
  new A();
}
g();
console.log(x);
