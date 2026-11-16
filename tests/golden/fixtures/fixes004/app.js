var a = 1, b = 2, c = 3, x = 0, y;
if (a + b >= c) {
  a = 0;
}
function P(v) {
  x = v;
}
new P(1);
y = x;
class Counter {
  static self = Counter;
  static {
    y = Counter;
  }
  count = x;
  constructor() {
    x = 2;
  }
  add(n) {
    var t = n;
    this.bump();
    y = t;
  }
  bump() {
    if (c) {
      c = 0;
      this.add(1);
    }
    x = 3;
  }
  static reset() {
    x = 0;
  }
}
new Counter().add(2);
var counter = new Counter();
counter.bump();
Counter.reset();
function log(value) {
}
log(c ? a : b);
function h({
  p = a,
  q = p
} = {},
g = () =>
  q) {
  g();
}
h();
console.log(x, y);
