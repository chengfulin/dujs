var x = 0;
function s() {
x = 1;
console.log(1);
x = 2;
}
try {
s();
} catch (e) {
console.log(x);
}
