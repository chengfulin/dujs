var x = 0;
function g() {
  x = 1;
  return 2;
}
class A {
  y = g();
}
new A();
console.log(x);
