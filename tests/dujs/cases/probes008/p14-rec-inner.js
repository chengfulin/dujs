var x = 0;
function f() {
  f();
  var y = 1;
  x = y;
}
f();
console.log(x);
