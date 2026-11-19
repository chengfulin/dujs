var s = 0;
function outer() {
  var inner = function () { s = s + 1; };
  inner();
  if (s) { inner = function () { s = 0; }; }
  switch (s) { case 1: s = 2; break; default: s = 3; }
  try { s = 4; } catch (e) { s = 5; } finally { s = 6; }
}
outer();
var t = s ? 1 : 2;
