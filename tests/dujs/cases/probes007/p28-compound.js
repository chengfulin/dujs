var x = 0;
function f() {
  x = 1;
  return 1;
}
x += f();
console.log(x);
