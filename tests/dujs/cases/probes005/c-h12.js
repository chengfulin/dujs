var x = 0;
function h1() {
x = 1;
}
function h2() {
console.log(x);
}
document.addEventListener('click', h1);
document.addEventListener('keyup', h2);
