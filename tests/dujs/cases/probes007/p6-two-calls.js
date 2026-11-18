var x = 0;
function f() {
  x = 1;
  return 1;
}
function g() {
  console.log(x);
  return 2;
}
var y = f() + g();
