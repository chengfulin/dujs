var x = 0;
class F {
  constructor() {
    console.log(x);
  }
  m(v) {
    console.log(x);
  }
}
new F().m(x = 1);
