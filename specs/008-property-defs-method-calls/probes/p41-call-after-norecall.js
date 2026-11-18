var x = 0;
function h() {
  x = 5;
}
function r() {
  r();
}
h();
r();
h();
console.log(x);
