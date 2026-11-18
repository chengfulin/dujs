var x = 0;
function f() {
  x = 1;
  return 1;
}
switch (f()) {
  case x:
    console.log(x);
}
