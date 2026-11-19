var x = 0, c = 1;
function m() {
  if (c) {
    c = 0;
    m();
  }
  x = 1;
}
m();
console.log(x);
