var x = 0;
function f() {
  x = 1;
  return [1, 2];
}
for (var v of f()) {
  console.log(x);
}
