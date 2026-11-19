var x = 0;
function f() {
  x = 1;
  return 1;
}
function h(v) {
  console.log(x);
}
h(f());
