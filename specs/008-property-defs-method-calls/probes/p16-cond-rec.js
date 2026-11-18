var x = 0, c = 1;
function f() {
  if (c) { f(); }
  x = 1;
}
f();
console.log(x);
