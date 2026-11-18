var x = 0;
function f() {
  x = 1;
}
f.p = 1;
f();
console.log(x);
