var x = 0, c = 1, o;
class A {
  m() {
    x = 1;
  }
}
if (c) {
  o = new A();
} else {
  o = {m: function () {}};
}
o.m();
console.log(x);
