var x = 0;
function f() {
  x = 1;
  return 2;
}
try {
  var y = f();
} catch (e) {
  console.log(x);
}
