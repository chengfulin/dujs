var x = 0;
function s() {
x = 1;
return x;
}
try {
if (s()) {
x = 2;
}
} catch (e) {
console.log(x);
}
