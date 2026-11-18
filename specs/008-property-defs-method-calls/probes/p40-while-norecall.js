var x = 0;
function f() {
  f();
}
while (f()) {
  x = 1;
}
console.log(x);
