var x = 0;
function g() {
  x = 1;
  return 1;
}
var h = () => g();
h();
console.log(x);
