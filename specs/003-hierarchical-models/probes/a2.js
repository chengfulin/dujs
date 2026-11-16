var n = 0;
function init() { n = 1; }
class A { static a = init(); static { n = 2; } static b = (function () { return n; })(); }
function h() { function reg() { n = 3; } window.addEventListener('y', reg); reg(); }
h();
window.addEventListener('x', h);
window.addEventListener('z', h);
window.addEventListener('w', function () { n = 5; window.addEventListener('q', h); });
localStorage.n = n;
localStorage.m = n;
