var x = 0;
function f() {
}
function h1() {
x = 1;
f();
}
function h2() {
x = 2;
f();
console.log(x);
}
document.addEventListener('click', h1);
document.addEventListener('keyup', h2);
