var x = 0;
class A {
  m() {
    x = 1;
  }
}
const o = new A();
function h() {
  o.m();
}
function k() {
  console.log(x);
}
document.addEventListener("click", h);
document.addEventListener("keyup", k);
