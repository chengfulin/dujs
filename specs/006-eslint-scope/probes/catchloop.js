var c = 1;
while (c) {
  try {
    c = 0;
  } catch (e) {
    e = 3;
    console.log(e);
  }
}
function f() {
  try { c = 2; } catch (e) { function inner() { return e; } inner(); }
}
f();
