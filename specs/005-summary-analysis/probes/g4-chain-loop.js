var x = 0;
function s() {
x = 1;
console.log(1);
x = 2;
}
function t() {
s();
x = 3;
}
function h() {
console.log(x);
}
document.addEventListener('click', h);
t();
