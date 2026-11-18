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
	const o = new A();
	o.m();
}
// g declared after the use (L20), its o.m() newly linked by FR-004 (const o = new A() in a function, 放寬); tasks T008 (g), T010, contracts/diff-check.md §2
