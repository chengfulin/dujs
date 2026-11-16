var x = 0;
class A {
  static s() {
    x = 1;
  }
}
A.s();
console.log(x);
