var x = 0;
class S {
  m() {
    x = 1;
  }
}
class A extends S {
}
new A().m();
new A().k();
console.log(x);
