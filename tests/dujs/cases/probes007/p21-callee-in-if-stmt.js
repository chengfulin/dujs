var x = 0;
function f() {
  x = 1;
  return 1;
}
if (f()) {
  console.log(x);
}
