var c = 1;
function f() {
  try {
    c = 2;
  } catch (e) {
    var g = function () { return e; };
    g();
  }
}
f();
