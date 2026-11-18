var x = 0;
function f() {
  x = 1;
  return 2;
}
try {
  x = f();
} catch (e) {
  console.log(x);
}
