var x = 0;
function f() {
  console.log(x);
  return [1, 2];
}
for (var v of f()) {
  x = 2;
}
