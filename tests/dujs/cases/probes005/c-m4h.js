let r = 0;
function h() {
console.log(r);
}
document.addEventListener('click', h);
try {
r = 1;
throw "bogus";
} catch (e) {
r = 2;
throw e;
} finally {
r = 3;
}
