var a = 1;
function g() {
  a = a + 1;
}
function k() {
  return a;
}
function u() {
  g();
  k();
}
g();
a = 5;
k();
