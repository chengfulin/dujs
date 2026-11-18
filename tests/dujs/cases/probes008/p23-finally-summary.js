var x = 0;
function f() {
  f();
}
function g() {
  try {
    f();
  } finally {
    x = 1;
  }
  x = 2;
}
g();
console.log(x);
