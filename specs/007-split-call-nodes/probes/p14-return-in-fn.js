var x = 0;
function g() {
  x = 1;
  return 2;
}
function f() {
  return g();
}
f();
console.log(x);
