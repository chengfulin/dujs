class K {
 constructor() { this.x = 1; }
}
function f() {
 try { f2(); } catch (K) { K = 1; }
 new K();
}
f();
