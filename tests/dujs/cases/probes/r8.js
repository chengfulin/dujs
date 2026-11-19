var n = 0;
function g() { n = 9; }
function h() { function reg() { n = 3; } window.addEventListener("y", g); reg(); }
h();
window.addEventListener("x", h);
localStorage.n = n;
