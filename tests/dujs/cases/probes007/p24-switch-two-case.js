var x = 0;
function f() {
  x = x + 1;
  return 1;
}
switch (f()) {
  case 1:
    break;
  case 2:
    break;
}
