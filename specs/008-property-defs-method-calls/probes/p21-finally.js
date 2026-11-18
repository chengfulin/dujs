var x = 0;
function f() {
  f();
}
try {
  f();
  x = 1;
} finally {
  console.log(x);
}
console.log(x);
