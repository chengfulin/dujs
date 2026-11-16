var x = 0, c = 1;
function h() {
  x = 5;
}
class A {
  m() {
    if (c) {
      c = 0;
      this.n();
    }
    x = 1;
  }
  n() {
    document.addEventListener('click', h);
    this.m();
    x = 2;
  }
}
new A().m();
