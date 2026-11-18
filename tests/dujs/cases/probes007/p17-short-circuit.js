var x = 0;
var c = 0;
function f() {
  x = 1;
  return 1;
}
var y = c && f();
console.log(x);
