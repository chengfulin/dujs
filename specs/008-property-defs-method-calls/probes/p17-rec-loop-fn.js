var x = 0, c = 1;
function f() {
  while (c) {
    console.log(x);
    f();
    x = 1;
  }
}
f();
