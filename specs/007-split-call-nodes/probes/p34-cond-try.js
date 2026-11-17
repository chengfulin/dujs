var x = 0;
function f() {
  x = 1;
  return 2;
}
try {
  if (f() > x) {
    var z = 0;
  }
} catch (e) {
  console.log(x);
}
