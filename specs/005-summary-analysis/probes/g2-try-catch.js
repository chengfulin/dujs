var x = 0;
function s() {
console.log(1);
x = 1;
}
try {
s();
} catch (e) {
console.log(x);
}
console.log(x);
