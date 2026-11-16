var q = 1;
function onA() { function deep() { q = q + 1; } if (q) { deep(); } }
function onB() { q = 2; }
window.addEventListener('a', onA);
window.addEventListener('b', onB);
window.addEventListener('a2', onA);
q = localStorage.q;
localStorage.q = q;
