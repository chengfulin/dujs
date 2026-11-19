class A {
	m() { x = 2; }
}
var x = 1;
g();
console.log(x);
// filler
// filler
// filler
// filler
// filler
// filler
// filler
// filler
// filler
// filler
// filler
// filler
// filler
function g() {
	var o = new A();
	o.p = 1;
	o.m();
}
// g declared after the use (L20), its o.m() newly linked because the member target o.p = 1 no longer kills o (外溢); tasks T008 (g), T010, contracts/diff-check.md §2
