var n = 3;
function even() {
if (n) {
n = n - 1;
odd();
}
}
function odd() {
if (n) {
n = n - 1;
even();
}
}
even();
console.log(n);
