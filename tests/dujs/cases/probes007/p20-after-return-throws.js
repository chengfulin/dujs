var x = 0;
var o = null;
function f() {
  x = 1;
  return o;
}
try {
  var y = f().p;
} catch (e) {
  console.log(x);
}
