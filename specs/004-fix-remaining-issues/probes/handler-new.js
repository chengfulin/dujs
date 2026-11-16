var x = 0;
class A {
  constructor() {
    x = 1;
  }
  static s() {
    x = 2;
  }
}
function onClick() {
  new A();
  A.s();
  y = x;
}
window.addEventListener('click', onClick);
console.log(x);
