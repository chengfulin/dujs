class K {
 constructor() { this.x = 1; }
}
function f() {
 new K();
}
f();
var g = function K() { K = 2; };
