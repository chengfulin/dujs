var x = 0;
function f() { g(); x = 1; }
function g() { f(); }
f();
console.log(x);
