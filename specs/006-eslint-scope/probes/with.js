var o = {};
with (o) { p = 1; console.log(p); }
var q = 2;
function k(){ eval("var q=3"); return q; }
k();
