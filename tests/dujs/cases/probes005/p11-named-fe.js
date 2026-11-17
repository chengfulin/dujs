var n = 3;
var g = function fact() {
if (n) {
n = n - 1;
fact();
}
};
g();
console.log(n);
