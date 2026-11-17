var x = 0;
function s() {
console.log(1);
x = 1;
}
try {
s();
} finally {
console.log(x);
}
