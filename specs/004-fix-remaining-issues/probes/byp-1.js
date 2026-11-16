var x = 0;
function f() {
  x = 1;
}
{
  let t = 1;
  f();
  console.log(t);
}
