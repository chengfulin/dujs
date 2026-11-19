var x = 0;
function f() {
  x = 1;
}
f.p = 1;
function g() {
  f();
}
g();
console.log(x);
