var a = 1;
function g() {
  a = 2;
}
function u() {
  var k = 9;
  g();
}
function onClick() {
  a = 3;
}
g();
window.addEventListener('click', onClick);
