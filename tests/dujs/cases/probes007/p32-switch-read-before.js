var x = 0;
function f() {
  x = 1;
  return 1;
}
switch (x + f()) {
  case 1:
    console.log(x);
}
