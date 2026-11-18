var x = 0;
function f() {
  f();
}
function h() {
  f();
  x = 1;
}
function k() {
  console.log(x);
}
document.addEventListener("click", h);
document.addEventListener("keyup", k);
