var x = 0;
function f() {
  f();
}
if (f()) {
  x = 1;
}
console.log(x);
