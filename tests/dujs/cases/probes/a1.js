var x = 0;
function f(v) { function k() { x = 4; } k(); return v; }
function g() { return x; }
f(x = 1);
if (g()) { x = 2; }
while (g()) { x = x + 1; }
for (var i = 0; g(); i++) { x = i; }
