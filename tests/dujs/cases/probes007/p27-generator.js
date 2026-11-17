var x = 0;
function* g() {
  x = 1;
}
var it = g();
console.log(x);
