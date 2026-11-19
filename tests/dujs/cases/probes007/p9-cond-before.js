var x = 0;
function f() {
  x = 1;
  return 2;
}
if (x < f()) {
  console.log(x);
}
