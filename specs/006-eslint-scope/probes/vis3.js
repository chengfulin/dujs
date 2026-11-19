class A {
  inc() {
    return A.n;
  }
}
function g() {
  var o = new A();
  o.inc();
}
g();
